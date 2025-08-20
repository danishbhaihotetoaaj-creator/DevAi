import { z } from 'zod';
import { EventEmitter } from 'events';
import { eventPipeline } from './event-pipeline';

// Function Definition Schema
export const FunctionDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  category: z.enum(['ai', 'utility', 'integration', 'analysis', 'generation']),
  parameters: z.record(z.object({
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    required: z.boolean(),
    description: z.string(),
    default: z.any().optional(),
    validation: z.record(z.any()).optional(),
  })),
  returns: z.object({
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    description: z.string(),
  }),
  execution: z.object({
    timeout: z.number().default(30000), // 30 seconds
    retries: z.number().default(3),
    fallback: z.string().optional(),
    requiresAuth: z.boolean().default(true),
    rateLimit: z.object({
      requestsPerMinute: z.number().default(60),
      burstLimit: z.number().default(10),
    }),
  }),
  metadata: z.object({
    tags: z.array(z.string()),
    examples: z.array(z.record(z.any())),
    documentation: z.string().optional(),
    author: z.string().optional(),
    lastUpdated: z.date(),
  }),
  handler: z.function(),
});

export type FunctionDefinition = z.infer<typeof FunctionDefinitionSchema>;

// Function Execution Context
export interface FunctionExecutionContext {
  functionId: string;
  userId: string;
  sessionId: string;
  parameters: Record<string, any>;
  metadata: Record<string, any>;
  startTime: number;
  retryCount: number;
  fallbackChain: string[];
}

// Function Execution Result
export interface FunctionExecutionResult {
  success: boolean;
  result: any;
  error?: string;
  executionTime: number;
  metadata: Record<string, any>;
  fallbackUsed?: string;
}

// Function Registry
export class FunctionRegistry extends EventEmitter {
  private functions: Map<string, FunctionDefinition>;
  private categories: Map<string, Set<string>>;
  private executionHistory: Map<string, FunctionExecutionResult[]>;
  private rateLimiters: Map<string, any>;
  private fallbackChains: Map<string, string[]>;

  constructor() {
    super();
    this.functions = new Map();
    this.categories = new Map();
    this.executionHistory = new Map();
    this.rateLimiters = new Map();
    this.fallbackChains = new Map();
    
    this.setupEventHandlers();
  }

  // Function Registration
  registerFunction(definition: FunctionDefinition): void {
    try {
      // Validate function definition
      FunctionDefinitionSchema.parse(definition);
      
      // Check for conflicts
      if (this.functions.has(definition.name)) {
        throw new Error(`Function with name '${definition.name}' already exists`);
      }
      
      // Register function
      this.functions.set(definition.name, definition);
      
      // Add to category
      if (!this.categories.has(definition.category)) {
        this.categories.set(definition.category, new Set());
      }
      this.categories.get(definition.category)!.add(definition.name);
      
      // Initialize rate limiter
      this.initializeRateLimiter(definition);
      
      // Initialize fallback chain
      if (definition.execution.fallback) {
        this.fallbackChains.set(definition.name, [definition.execution.fallback]);
      }
      
      this.emit('function:registered', { definition });
      console.log(`Function registered: ${definition.name} (${definition.category})`);
      
    } catch (error) {
      console.error(`Failed to register function ${definition.name}:`, error);
      throw error;
    }
  }

  // Function Discovery
  getFunction(name: string): FunctionDefinition | undefined {
    return this.functions.get(name);
  }

  getFunctionsByCategory(category: string): FunctionDefinition[] {
    const functionNames = this.categories.get(category);
    if (!functionNames) return [];
    
    return Array.from(functionNames)
      .map(name => this.functions.get(name)!)
      .filter(Boolean);
  }

  getAllFunctions(): FunctionDefinition[] {
    return Array.from(this.functions.values());
  }

  searchFunctions(query: string): FunctionDefinition[] {
    const results: FunctionDefinition[] = [];
    const searchTerm = query.toLowerCase();
    
    for (const func of this.functions.values()) {
      if (
        func.name.toLowerCase().includes(searchTerm) ||
        func.description.toLowerCase().includes(searchTerm) ||
        func.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      ) {
        results.push(func);
      }
    }
    
    return results;
  }

  // Function Execution
  async executeFunction(
    name: string,
    context: FunctionExecutionContext
  ): Promise<FunctionExecutionResult> {
    const functionDef = this.getFunction(name);
    if (!functionDef) {
      throw new Error(`Function '${name}' not found`);
    }

    // Check rate limits
    if (!this.checkRateLimit(functionDef, context)) {
      throw new Error(`Rate limit exceeded for function '${name}'`);
    }

    // Check authentication
    if (functionDef.execution.requiresAuth && !context.userId) {
      throw new Error(`Authentication required for function '${name}'`);
    }

    const executionResult: FunctionExecutionResult = {
      success: false,
      result: null,
      executionTime: 0,
      metadata: {},
    };

    try {
      // Execute function with timeout
      const startTime = Date.now();
      
      const result = await Promise.race([
        functionDef.handler(context.parameters, context),
        this.createTimeout(functionDef.execution.timeout),
      ]);
      
      executionResult.executionTime = Date.now() - startTime;
      executionResult.result = result;
      executionResult.success = true;
      executionResult.metadata = {
        functionId: functionDef.id,
        version: functionDef.version,
        category: functionDef.category,
        parameters: context.parameters,
      };

    } catch (error) {
      executionResult.error = error instanceof Error ? error.message : String(error);
      executionResult.success = false;
      
      // Try fallback if available
      if (functionDef.execution.fallback && context.retryCount < functionDef.execution.retries) {
        return this.executeFallback(functionDef, context, executionResult);
      }
    }

    // Record execution history
    this.recordExecution(name, executionResult);
    
    // Emit execution event
    this.emit('function:executed', { name, context, result: executionResult });
    
    return executionResult;
  }

  // Fallback Execution
  private async executeFallback(
    functionDef: FunctionDefinition,
    context: FunctionExecutionContext,
    originalResult: FunctionExecutionResult
  ): Promise<FunctionExecutionResult> {
    const fallbackName = functionDef.execution.fallback!;
    const fallbackDef = this.getFunction(fallbackName);
    
    if (!fallbackDef) {
      console.warn(`Fallback function '${fallbackName}' not found for '${functionDef.name}'`);
      return originalResult;
    }

    try {
      context.retryCount++;
      context.fallbackChain.push(fallbackName);
      
      const fallbackResult = await this.executeFunction(fallbackName, context);
      fallbackResult.fallbackUsed = fallbackName;
      
      return fallbackResult;
      
    } catch (error) {
      console.error(`Fallback execution failed for '${functionDef.name}':`, error);
      return originalResult;
    }
  }

  // Rate Limiting
  private initializeRateLimiter(definition: FunctionDefinition): void {
    // Simple in-memory rate limiter (in production, use Redis-based solution)
    const limiter = {
      requests: new Map<string, number[]>(),
      limit: definition.execution.rateLimit.requestsPerMinute,
      window: 60000, // 1 minute
    };
    
    this.rateLimiters.set(definition.name, limiter);
  }

  private checkRateLimit(definition: FunctionDefinition, context: FunctionExecutionContext): boolean {
    const limiter = this.rateLimiters.get(definition.name);
    if (!limiter) return true;

    const now = Date.now();
    const userKey = `${context.userId}:${definition.name}`;
    const userRequests = limiter.requests.get(userKey) || [];
    
    // Remove old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < limiter.window);
    
    if (recentRequests.length >= limiter.limit) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    limiter.requests.set(userKey, recentRequests);
    
    return true;
  }

  // Timeout Handling
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Function execution timed out after ${ms}ms`));
      }, ms);
    });
  }

  // Execution History
  private recordExecution(name: string, result: FunctionExecutionResult): void {
    if (!this.executionHistory.has(name)) {
      this.executionHistory.set(name, []);
    }
    
    const history = this.executionHistory.get(name)!;
    history.push(result);
    
    // Keep only last 100 executions
    if (history.length > 100) {
      history.shift();
    }
  }

  getExecutionHistory(name: string): FunctionExecutionResult[] {
    return this.executionHistory.get(name) || [];
  }

  getExecutionStats(name: string): {
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    errorRate: number;
  } {
    const history = this.getExecutionHistory(name);
    if (history.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
        errorRate: 0,
      };
    }

    const successful = history.filter(h => h.success);
    const totalTime = history.reduce((sum, h) => sum + h.executionTime, 0);
    
    return {
      totalExecutions: history.length,
      successRate: (successful.length / history.length) * 100,
      averageExecutionTime: totalTime / history.length,
      errorRate: ((history.length - successful.length) / history.length) * 100,
    };
  }

  // Function Management
  unregisterFunction(name: string): boolean {
    const functionDef = this.functions.get(name);
    if (!functionDef) return false;

    // Remove from functions map
    this.functions.delete(name);
    
    // Remove from category
    const category = this.categories.get(functionDef.category);
    if (category) {
      category.delete(name);
      if (category.size === 0) {
        this.categories.delete(functionDef.category);
      }
    }
    
    // Clean up rate limiter and fallback chain
    this.rateLimiters.delete(name);
    this.fallbackChains.delete(name);
    
    this.emit('function:unregistered', { name, definition: functionDef });
    console.log(`Function unregistered: ${name}`);
    
    return true;
  }

  updateFunction(name: string, updates: Partial<FunctionDefinition>): boolean {
    const existing = this.functions.get(name);
    if (!existing) return false;

    const updated = { ...existing, ...updates, lastUpdated: new Date() };
    
    try {
      FunctionDefinitionSchema.parse(updated);
      this.functions.set(name, updated);
      
      this.emit('function:updated', { name, oldDefinition: existing, newDefinition: updated });
      console.log(`Function updated: ${name}`);
      
      return true;
    } catch (error) {
      console.error(`Failed to update function ${name}:`, error);
      return false;
    }
  }

  // Event Handlers
  private setupEventHandlers(): void {
    this.on('function:registered', this.handleFunctionRegistered.bind(this));
    this.on('function:unregistered', this.handleFunctionUnregistered.bind(this));
    this.on('function:updated', this.handleFunctionUpdated.bind(this));
    this.on('function:executed', this.handleFunctionExecuted.bind(this));
  }

  private handleFunctionRegistered({ definition }: { definition: FunctionDefinition }): void {
    // Notify event pipeline about new function
    eventPipeline.emit('function:available', { definition });
  }

  private handleFunctionUnregistered({ name }: { name: string }): void {
    // Notify event pipeline about removed function
    eventPipeline.emit('function:unavailable', { name });
  }

  private handleFunctionUpdated({ name, oldDefinition, newDefinition }: any): void {
    // Notify event pipeline about function update
    eventPipeline.emit('function:updated', { name, oldDefinition, newDefinition });
  }

  private handleFunctionExecuted({ name, context, result }: any): void {
    // Log execution metrics
    console.log(`Function '${name}' executed in ${result.executionTime}ms`);
    
    // Update user behavior tracking
    if (result.success) {
      this.trackUserBehavior(context.userId, name, 'success', result.executionTime);
    } else {
      this.trackUserBehavior(context.userId, name, 'error', 0);
    }
  }

  // User Behavior Tracking
  private async trackUserBehavior(
    userId: string,
    functionName: string,
    status: 'success' | 'error',
    executionTime: number
  ): Promise<void> {
    try {
      // This would typically update a database
      const behavior = {
        userId,
        functionName,
        status,
        executionTime,
        timestamp: new Date(),
      };
      
      // Emit behavior tracking event
      this.emit('behavior:tracked', behavior);
      
    } catch (error) {
      console.error('Failed to track user behavior:', error);
    }
  }

  // Health Check
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    totalFunctions: number;
    activeFunctions: number;
    errorRate: number;
    lastError?: string;
  } {
    const totalFunctions = this.functions.size;
    const activeFunctions = Array.from(this.functions.values())
      .filter(f => f.metadata.lastUpdated > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .length;
    
    let totalErrorRate = 0;
    let lastError: string | undefined;
    
    for (const [name] of this.functions) {
      const stats = this.getExecutionStats(name);
      totalErrorRate += stats.errorRate;
      
      const history = this.getExecutionHistory(name);
      const lastErrorResult = history.find(h => !h.success);
      if (lastErrorResult && (!lastError || lastErrorResult.metadata.timestamp > new Date(lastError))) {
        lastError = lastErrorResult.metadata.timestamp;
      }
    }
    
    const averageErrorRate = totalFunctions > 0 ? totalErrorRate / totalFunctions : 0;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (averageErrorRate > 20) status = 'unhealthy';
    else if (averageErrorRate > 10) status = 'degraded';
    
    return {
      status,
      totalFunctions,
      activeFunctions,
      errorRate: averageErrorRate,
      lastError,
    };
  }
}

// Export singleton instance
export const functionRegistry = new FunctionRegistry();