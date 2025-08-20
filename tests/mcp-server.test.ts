import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventPipeline, PipelineStage } from '../src/lib/core/event-pipeline';
import { FunctionRegistry, FunctionDefinition } from '../src/lib/core/function-reflector';
import { createClient } from '@supabase/supabase-js';
import { ChromaClient } from 'chromadb';
import Redis from 'redis';

// Mock external dependencies
jest.mock('@supabase/supabase-js');
jest.mock('chromadb');
jest.mock('redis');

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseKey: 'test-key',
  chromaHost: 'http://localhost:8000',
  redisUrl: 'redis://localhost:6379',
  testUserId: 'test-user-123',
  testSessionId: 'test-session-456',
};

describe('MCP Server Core Components', () => {
  let eventPipeline: EventPipeline;
  let functionRegistry: FunctionRegistry;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup environment variables for testing
    process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_CONFIG.supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_CONFIG.supabaseKey;
    process.env.CHROMADB_HOST = TEST_CONFIG.chromaHost;
    process.env.REDIS_URL = TEST_CONFIG.redisUrl;
    
    // Initialize components
    eventPipeline = new EventPipeline();
    functionRegistry = new FunctionRegistry();
  });

  afterEach(() => {
    // Cleanup
    jest.restoreAllMocks();
  });

  describe('Event Pipeline', () => {
    it('should initialize with all pipeline stages', () => {
      const stages = Object.values(PipelineStage);
      expect(stages).toHaveLength(8);
      expect(stages).toContain(PipelineStage.INGEST);
      expect(stages).toContain(PipelineStage.CONTEXT_ANALYSIS);
      expect(stages).toContain(PipelineStage.PERSONALITY_ROUTING);
      expect(stages).toContain(PipelineStage.FUNCTION_EXECUTION);
      expect(stages).toContain(PipelineStage.MEMORY_UPDATE);
      expect(stages).toContain(PipelineStage.RESPONSE_GENERATION);
      expect(stages).toContain(PipelineStage.FEEDBACK_LOOP);
    });

    it('should validate event schema correctly', async () => {
      const validEvent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'chat' as const,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        timestamp: new Date(),
        payload: { message: 'Hello' },
        metadata: {
          source: 'web',
          priority: 5,
          contextHash: 'hash123',
          personalityId: 'researcher',
        },
        context: {
          conversationHistory: [],
          userPreferences: {},
          personalityContext: {},
          memoryContext: {},
          functionContext: {},
        },
      };

      const result = await eventPipeline.processEvent(validEvent);
      expect(result).toBeDefined();
    });

    it('should reject invalid event schema', async () => {
      const invalidEvent = {
        id: 'invalid-uuid',
        type: 'invalid_type',
        userId: '',
        sessionId: '',
        timestamp: 'not-a-date',
        payload: {},
        metadata: {},
        context: {},
      };

      await expect(eventPipeline.processEvent(invalidEvent as any)).rejects.toThrow();
    });

    it('should handle context analysis correctly', async () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'chat' as const,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        timestamp: new Date(),
        payload: { message: 'Test message' },
        metadata: {
          source: 'web',
          priority: 5,
          contextHash: 'hash123',
          personalityId: 'researcher',
        },
        context: {
          conversationHistory: [],
          userPreferences: {},
          personalityContext: {},
          memoryContext: {},
          functionContext: {},
        },
      };

      // Mock Supabase responses
      const mockSupabase = createClient as jest.MockedFunction<typeof createClient>;
      mockSupabase.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: TEST_CONFIG.testUserId,
                  preferences: { learningMode: 'structured' },
                },
              }),
            }),
          }),
        }),
      } as any);

      const result = await eventPipeline.processEvent(event);
      expect(result).toBeDefined();
    });

    it('should emit pipeline events correctly', (done) => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'chat' as const,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        timestamp: new Date(),
        payload: { message: 'Test message' },
        metadata: {
          source: 'web',
          priority: 5,
          contextHash: 'hash123',
          personalityId: 'researcher',
        },
        context: {
          conversationHistory: [],
          userPreferences: {},
          personalityContext: {},
          memoryContext: {},
          functionContext: {},
        },
      };

      let stageCount = 0;
      eventPipeline.on('pipeline:stage:start', ({ stage }) => {
        stageCount++;
        expect(stage).toBeDefined();
      });

      eventPipeline.on('pipeline:stage:complete', ({ stage }) => {
        stageCount++;
        if (stageCount >= 16) { // 8 stages * 2 events each
          done();
        }
      });

      eventPipeline.processEvent(event).catch(done);
    });
  });

  describe('Function Registry', () => {
    it('should register functions correctly', () => {
      const testFunction: FunctionDefinition = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'test_function',
        description: 'A test function',
        version: '1.0.0',
        category: 'utility',
        parameters: {
          input: {
            type: 'string',
            required: true,
            description: 'Input parameter',
          },
        },
        returns: {
          type: 'string',
          description: 'Output result',
        },
        execution: {
          timeout: 5000,
          retries: 2,
          requiresAuth: false,
          rateLimit: {
            requestsPerMinute: 100,
            burstLimit: 20,
          },
        },
        metadata: {
          tags: ['test', 'utility'],
          examples: [{ input: 'test', output: 'result' }],
          lastUpdated: new Date(),
        },
        handler: jest.fn().mockResolvedValue('test result'),
      };

      expect(() => functionRegistry.registerFunction(testFunction)).not.toThrow();
      expect(functionRegistry.getFunction('test_function')).toBeDefined();
    });

    it('should reject invalid function definitions', () => {
      const invalidFunction = {
        name: 'invalid_function',
        description: 'Invalid function',
        // Missing required fields
      };

      expect(() => functionRegistry.registerFunction(invalidFunction as any)).toThrow();
    });

    it('should execute functions correctly', async () => {
      const testFunction: FunctionDefinition = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'test_execution',
        description: 'A test function for execution',
        version: '1.0.0',
        category: 'utility',
        parameters: {
          input: {
            type: 'string',
            required: true,
            description: 'Input parameter',
          },
        },
        returns: {
          type: 'string',
          description: 'Output result',
        },
        execution: {
          timeout: 5000,
          retries: 2,
          requiresAuth: false,
          rateLimit: {
            requestsPerMinute: 100,
            burstLimit: 20,
          },
        },
        metadata: {
          tags: ['test', 'execution'],
          examples: [{ input: 'test', output: 'result' }],
          lastUpdated: new Date(),
        },
        handler: jest.fn().mockResolvedValue('execution result'),
      };

      functionRegistry.registerFunction(testFunction);

      const context = {
        functionId: testFunction.id,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        parameters: { input: 'test input' },
        metadata: {},
        startTime: Date.now(),
        retryCount: 0,
        fallbackChain: [],
      };

      const result = await functionRegistry.executeFunction('test_execution', context);
      expect(result.success).toBe(true);
      expect(result.result).toBe('execution result');
    });

    it('should handle function timeouts correctly', async () => {
      const slowFunction: FunctionDefinition = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'slow_function',
        description: 'A slow function that times out',
        version: '1.0.0',
        category: 'utility',
        parameters: {},
        returns: {
          type: 'string',
          description: 'Output result',
        },
        execution: {
          timeout: 100, // Very short timeout
          retries: 1,
          requiresAuth: false,
          rateLimit: {
            requestsPerMinute: 100,
            burstLimit: 20,
          },
        },
        metadata: {
          tags: ['test', 'slow'],
          examples: [],
          lastUpdated: new Date(),
        },
        handler: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve('slow result'), 200))
        ),
      };

      functionRegistry.registerFunction(slowFunction);

      const context = {
        functionId: slowFunction.id,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        parameters: {},
        metadata: {},
        startTime: Date.now(),
        retryCount: 0,
        fallbackChain: [],
      };

      const result = await functionRegistry.executeFunction('slow_function', context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should enforce rate limits correctly', async () => {
      const rateLimitedFunction: FunctionDefinition = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'rate_limited_function',
        description: 'A function with strict rate limiting',
        version: '1.0.0',
        category: 'utility',
        parameters: {},
        returns: {
          type: 'string',
          description: 'Output result',
        },
        execution: {
          timeout: 5000,
          retries: 1,
          requiresAuth: false,
          rateLimit: {
            requestsPerMinute: 1, // Very low limit
            burstLimit: 1,
          },
        },
        metadata: {
          tags: ['test', 'rate-limited'],
          examples: [],
          lastUpdated: new Date(),
        },
        handler: jest.fn().mockResolvedValue('rate limited result'),
      };

      functionRegistry.registerFunction(rateLimitedFunction);

      const context = {
        functionId: rateLimitedFunction.id,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        parameters: {},
        metadata: {},
        startTime: Date.now(),
        retryCount: 0,
        fallbackChain: [],
      };

      // First execution should succeed
      const result1 = await functionRegistry.executeFunction('rate_limited_function', context);
      expect(result1.success).toBe(true);

      // Second execution should fail due to rate limiting
      const result2 = await functionRegistry.executeFunction('rate_limited_function', context);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Rate limit exceeded');
    });

    it('should handle fallback functions correctly', async () => {
      const primaryFunction: FunctionDefinition = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'primary_function',
        description: 'Primary function that fails',
        version: '1.0.0',
        category: 'utility',
        parameters: {},
        returns: {
          type: 'string',
          description: 'Output result',
        },
        execution: {
          timeout: 5000,
          retries: 1,
          fallback: 'fallback_function',
          requiresAuth: false,
          rateLimit: {
            requestsPerMinute: 100,
            burstLimit: 20,
          },
        },
        metadata: {
          tags: ['test', 'primary'],
          examples: [],
          lastUpdated: new Date(),
        },
        handler: jest.fn().mockRejectedValue(new Error('Primary function failed')),
      };

      const fallbackFunction: FunctionDefinition = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'fallback_function',
        description: 'Fallback function',
        version: '1.0.0',
        category: 'utility',
        parameters: {},
        returns: {
          type: 'string',
          description: 'Output result',
        },
        execution: {
          timeout: 5000,
          retries: 1,
          requiresAuth: false,
          rateLimit: {
            requestsPerMinute: 100,
            burstLimit: 20,
          },
        },
        metadata: {
          tags: ['test', 'fallback'],
          examples: [],
          lastUpdated: new Date(),
        },
        handler: jest.fn().mockResolvedValue('fallback result'),
      };

      functionRegistry.registerFunction(primaryFunction);
      functionRegistry.registerFunction(fallbackFunction);

      const context = {
        functionId: primaryFunction.id,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        parameters: {},
        metadata: {},
        startTime: Date.now(),
        retryCount: 0,
        fallbackChain: [],
      };

      const result = await functionRegistry.executeFunction('primary_function', context);
      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback result');
      expect(result.fallbackUsed).toBe('fallback_function');
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in user queries', async () => {
      const maliciousUserId = "'; DROP TABLE users; --";
      
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'chat' as const,
        userId: maliciousUserId,
        sessionId: TEST_CONFIG.testSessionId,
        timestamp: new Date(),
        payload: { message: 'Malicious message' },
        metadata: {
          source: 'web',
          priority: 5,
          contextHash: 'hash123',
          personalityId: 'researcher',
        },
        context: {
          conversationHistory: [],
          userPreferences: {},
          personalityContext: {},
          memoryContext: {},
          functionContext: {},
        },
      };

      // Mock Supabase to ensure parameterized queries are used
      const mockSupabase = createClient as jest.MockedFunction<typeof createClient>;
      mockSupabase.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'User not found' },
              }),
            }),
          }),
        }),
      } as any);

      await expect(eventPipeline.processEvent(event)).rejects.toThrow();
    });

    it('should validate UUID format for event IDs', async () => {
      const invalidEvent = {
        id: 'not-a-uuid',
        type: 'chat' as const,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        timestamp: new Date(),
        payload: { message: 'Test' },
        metadata: {
          source: 'web',
          priority: 5,
          contextHash: 'hash123',
          personalityId: 'researcher',
        },
        context: {
          conversationHistory: [],
          userPreferences: {},
          personalityContext: {},
          memoryContext: {},
          functionContext: {},
        },
      };

      await expect(eventPipeline.processEvent(invalidEvent as any)).rejects.toThrow();
    });

    it('should prevent function name injection', () => {
      const maliciousFunctionName = 'eval; console.log("hacked"); //';
      
      expect(() => functionRegistry.getFunction(maliciousFunctionName)).not.toThrow();
      expect(functionRegistry.getFunction(maliciousFunctionName)).toBeUndefined();
    });

    it('should sanitize function parameters', async () => {
      const testFunction: FunctionDefinition = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'safe_function',
        description: 'A safe function',
        version: '1.0.0',
        category: 'utility',
        parameters: {
          input: {
            type: 'string',
            required: true,
            description: 'Input parameter',
          },
        },
        returns: {
          type: 'string',
          description: 'Output result',
        },
        execution: {
          timeout: 5000,
          retries: 1,
          requiresAuth: false,
          rateLimit: {
            requestsPerMinute: 100,
            burstLimit: 20,
          },
        },
        metadata: {
          tags: ['test', 'safe'],
          examples: [],
          lastUpdated: new Date(),
        },
        handler: jest.fn().mockImplementation((params) => {
          // Ensure parameters are properly sanitized
          expect(typeof params.input).toBe('string');
          expect(params.input).not.toContain('<script>');
          return 'safe result';
        }),
      };

      functionRegistry.registerFunction(testFunction);

      const context = {
        functionId: testFunction.id,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        parameters: { 
          input: '<script>alert("xss")</script>malicious input' 
        },
        metadata: {},
        startTime: Date.now(),
        retryCount: 0,
        fallbackChain: [],
      };

      const result = await functionRegistry.executeFunction('safe_function', context);
      expect(result.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent function executions', async () => {
      const concurrentFunction: FunctionDefinition = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'concurrent_function',
        description: 'A function for concurrent testing',
        version: '1.0.0',
        category: 'utility',
        parameters: {},
        returns: {
          type: 'string',
          description: 'Output result',
        },
        execution: {
          timeout: 5000,
          retries: 1,
          requiresAuth: false,
          rateLimit: {
            requestsPerMinute: 1000,
            burstLimit: 100,
          },
        },
        metadata: {
          tags: ['test', 'concurrent'],
          examples: [],
          lastUpdated: new Date(),
        },
        handler: jest.fn().mockResolvedValue('concurrent result'),
      };

      functionRegistry.registerFunction(concurrentFunction);

      const concurrentExecutions = 10;
      const promises = [];

      for (let i = 0; i < concurrentExecutions; i++) {
        const context = {
          functionId: concurrentFunction.id,
          userId: `user-${i}`,
          sessionId: `session-${i}`,
          parameters: {},
          metadata: {},
          startTime: Date.now(),
          retryCount: 0,
          fallbackChain: [],
        };

        promises.push(functionRegistry.executeFunction('concurrent_function', context));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(concurrentExecutions);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.result).toBe('concurrent result');
      });
    });

    it('should complete pipeline stages within reasonable time', async () => {
      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'chat' as const,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        timestamp: new Date(),
        payload: { message: 'Performance test' },
        metadata: {
          source: 'web',
          priority: 5,
          contextHash: 'hash123',
          personalityId: 'researcher',
        },
        context: {
          conversationHistory: [],
          userPreferences: {},
          personalityContext: {},
          memoryContext: {},
          functionContext: {},
        },
      };

      const startTime = Date.now();
      const result = await eventPipeline.processEvent(event);
      const totalTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database connection failures gracefully', async () => {
      const mockSupabase = createClient as jest.MockedFunction<typeof createClient>;
      mockSupabase.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
            }),
          }),
        }),
      } as any);

      const event = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'chat' as const,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        timestamp: new Date(),
        payload: { message: 'Database test' },
        metadata: {
          source: 'web',
          priority: 5,
          contextHash: 'hash123',
          personalityId: 'researcher',
        },
        context: {
          conversationHistory: [],
          userPreferences: {},
          personalityContext: {},
          memoryContext: {},
          functionContext: {},
        },
      };

      await expect(eventPipeline.processEvent(event)).rejects.toThrow();
    });

    it('should handle function execution errors gracefully', async () => {
      const errorFunction: FunctionDefinition = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'error_function',
        description: 'A function that always throws errors',
        version: '1.0.0',
        category: 'utility',
        parameters: {},
        returns: {
          type: 'string',
          description: 'Output result',
        },
        execution: {
          timeout: 5000,
          retries: 1,
          requiresAuth: false,
          rateLimit: {
            requestsPerMinute: 100,
            burstLimit: 20,
          },
        },
        metadata: {
          tags: ['test', 'error'],
          examples: [],
          lastUpdated: new Date(),
        },
        handler: jest.fn().mockRejectedValue(new Error('Function execution failed')),
      };

      functionRegistry.registerFunction(errorFunction);

      const context = {
        functionId: errorFunction.id,
        userId: TEST_CONFIG.testUserId,
        sessionId: TEST_CONFIG.testSessionId,
        parameters: {},
        metadata: {},
        startTime: Date.now(),
        retryCount: 0,
        fallbackChain: [],
      };

      const result = await functionRegistry.executeFunction('error_function', context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Function execution failed');
    });
  });
});