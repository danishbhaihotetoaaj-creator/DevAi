import { ProviderRequest, ProviderResponse, ChatMessage, TokenUsage } from '@/lib/types';

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl?: string;
  models: string[];
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  costPer1kTokens: {
    input: number;
    output: number;
  };
  fallbackPriority: number;
  enabled: boolean;
}

export interface ProviderCallOptions {
  retries?: number;
  timeout?: number;
  fallback?: boolean;
}

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected circuitBreakerKey: string;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.circuitBreakerKey = `provider:${config.name}`;
  }

  abstract call(request: ProviderRequest, options?: ProviderCallOptions): Promise<ProviderResponse>;

  protected abstract createEmbedding(text: string): Promise<number[]>;

  protected abstract validateRequest(request: ProviderRequest): boolean;

  protected abstract transformRequest(request: ProviderRequest): any;

  protected abstract transformResponse(response: any): ProviderResponse;

  protected abstract calculateCost(usage: TokenUsage): number;

  // Common validation
  protected validateModel(model: string): boolean {
    return this.config.models.includes(model);
  }

  protected validateApiKey(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  // Rate limiting
  protected async checkRateLimit(): Promise<boolean> {
    // This would integrate with Redis rate limiting
    // For now, return true
    return true;
  }

  // Circuit breaker
  protected async checkCircuitBreaker(): Promise<boolean> {
    // This would integrate with Redis circuit breaker
    // For now, return true
    return true;
  }

  // Retry logic
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // Error handling
  protected handleError(error: any, context: string): Error {
    const errorMessage = `Provider ${this.config.name} error in ${context}: ${error.message}`;
    console.error(errorMessage, error);
    
    return new Error(errorMessage);
  }

  // Health check
  public async isHealthy(): Promise<boolean> {
    try {
      // Basic health check - could be overridden by specific providers
      return this.validateApiKey();
    } catch (error) {
      return false;
    }
  }

  // Get provider info
  public getInfo(): ProviderConfig {
    return { ...this.config };
  }

  // Check if provider supports a specific model
  public supportsModel(model: string): boolean {
    return this.config.models.includes(model);
  }

  // Get cost estimate
  public estimateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * this.config.costPer1kTokens.input;
    const outputCost = (outputTokens / 1000) * this.config.costPer1kTokens.output;
    return inputCost + outputCost;
  }
}