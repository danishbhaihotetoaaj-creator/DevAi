import { BaseProvider, ProviderConfig } from './base';
import { OpenAIProvider } from './openai';
import { PerplexityProvider } from './perplexity';
import { ProviderRequest, ProviderResponse } from '@/lib/types';
import { getProvider as getProviderConfig } from '@/lib/config/providers';
import { getModel } from '@/lib/config/models';
import { getPlan } from '@/lib/config/plans';
import { getCircuitBreakerState, updateCircuitBreakerState } from '@/lib/db/redis';

export interface ProviderManagerConfig {
  enableCircuitBreaker?: boolean;
  enableRateLimiting?: boolean;
  maxRetries?: number;
  fallbackTimeout?: number;
}

export class ProviderManager {
  private providers: Map<string, BaseProvider> = new Map();
  private config: ProviderManagerConfig;

  constructor(config: ProviderManagerConfig = {}) {
    this.config = {
      enableCircuitBreaker: true,
      enableRateLimiting: true,
      maxRetries: 3,
      fallbackTimeout: 30000,
      ...config,
    };

    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize OpenAI provider
    const openaiConfig = getProviderConfig('openai');
    if (openaiConfig) {
      this.providers.set('openai', new OpenAIProvider(openaiConfig));
    }

    // Initialize Perplexity provider
    const perplexityConfig = getProviderConfig('perplexity');
    if (perplexityConfig) {
      this.providers.set('perplexity', new PerplexityProvider(perplexityConfig));
    }

    // TODO: Add other providers (Anthropic, OpenRouter, A4F.co)
  }

  public async call(
    request: ProviderRequest,
    options: {
      userId?: string;
      planId?: string;
      personality?: string;
      task?: string;
      forceProvider?: string;
    } = {}
  ): Promise<ProviderResponse> {
    const startTime = Date.now();
    
    try {
      // Determine the best provider and model
      const { provider, model, fallbackChain } = await this.selectProvider(
        request.model,
        options
      );

      // Try the primary provider
      try {
        const response = await this.callProvider(provider, request, options);
        
        // Update circuit breaker on success
        if (this.config.enableCircuitBreaker) {
          await this.updateCircuitBreaker(provider, 'success');
        }

        return {
          ...response,
          metadata: {
            ...response.metadata,
            processingTime: Date.now() - startTime,
            fallbackUsed: false,
            providerUsed: provider,
          },
        };
      } catch (error) {
        console.warn(`Primary provider ${provider} failed:`, error);

        // Try fallback providers
        for (const fallbackProvider of fallbackChain) {
          try {
            console.log(`Trying fallback provider: ${fallbackProvider}`);
            
            const response = await this.callProvider(fallbackProvider, request, options);
            
            // Update circuit breaker on success
            if (this.config.enableCircuitBreaker) {
              await this.updateCircuitBreaker(fallbackProvider, 'success');
            }

            return {
              ...response,
              metadata: {
                ...response.metadata,
                processingTime: Date.now() - startTime,
                fallbackUsed: true,
                providerUsed: fallbackProvider,
                fallbackReason: `Primary provider ${provider} failed`,
              },
            };
          } catch (fallbackError) {
            console.warn(`Fallback provider ${fallbackProvider} failed:`, fallbackError);
            
            // Update circuit breaker on failure
            if (this.config.enableCircuitBreaker) {
              await this.updateCircuitBreaker(fallbackProvider, 'failure');
            }
          }
        }

        // All providers failed
        throw new Error(`All providers failed for model ${request.model}`);
      }
    } catch (error) {
      throw new Error(`Provider manager error: ${error.message}`);
    }
  }

  private async selectProvider(
    modelId: string,
    options: {
      userId?: string;
      planId?: string;
      personality?: string;
      task?: string;
      forceProvider?: string;
    }
  ): Promise<{
    provider: string;
    model: string;
    fallbackChain: string[];
  }> {
    const model = getModel(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // If a specific provider is forced, use it
    if (options.forceProvider) {
      const provider = this.providers.get(options.forceProvider);
      if (!provider) {
        throw new Error(`Forced provider ${options.forceProvider} not found`);
      }
      
      return {
        provider: options.forceProvider,
        model: modelId,
        fallbackChain: [],
      };
    }

    // Get user's plan for fallback rules
    let fallbackChain: string[] = [];
    if (options.planId) {
      const plan = getPlan(options.planId);
      if (plan) {
        fallbackChain = plan.fallbackRules.modelDowngradeChain
          .map(modelId => {
            const model = getModel(modelId);
            return model?.provider;
          })
          .filter(Boolean) as string[];
      }
    }

    // Find the best provider for the model
    const provider = this.findProviderForModel(modelId);
    if (!provider) {
      throw new Error(`No provider found for model ${modelId}`);
    }

    return {
      provider,
      model: modelId,
      fallbackChain: fallbackChain.filter(p => p !== provider),
    };
  }

  private findProviderForModel(modelId: string): string | null {
    for (const [providerName, provider] of this.providers) {
      if (provider.supportsModel(modelId)) {
        return providerName;
      }
    }
    return null;
  }

  private async callProvider(
    providerName: string,
    request: ProviderRequest,
    options: any
  ): Promise<ProviderResponse> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    // Check circuit breaker
    if (this.config.enableCircuitBreaker) {
      const circuitState = await getCircuitBreakerState(providerName);
      if (circuitState.status === 'open') {
        if (circuitState.nextAttemptTime && Date.now() < circuitState.nextAttemptTime) {
          throw new Error(`Provider ${providerName} circuit breaker is open`);
        }
        // Try to transition to half-open
        await updateCircuitBreakerState(providerName, {
          ...circuitState,
          status: 'half-open',
        });
      }
    }

    // Check rate limits
    if (this.config.enableRateLimiting) {
      // TODO: Implement rate limiting check
    }

    // Make the call
    const response = await provider.call(request, {
      retries: this.config.maxRetries,
      timeout: this.config.fallbackTimeout,
    });

    return response;
  }

  private async updateCircuitBreaker(
    providerName: string,
    result: 'success' | 'failure'
  ): Promise<void> {
    if (!this.config.enableCircuitBreaker) return;

    const currentState = await getCircuitBreakerState(providerName);
    const threshold = 5; // Number of failures before opening circuit
    const timeout = 60000; // 1 minute timeout

    if (result === 'success') {
      // Reset on success
      await updateCircuitBreakerState(providerName, {
        status: 'closed',
        failureCount: 0,
        lastFailureTime: undefined,
        nextAttemptTime: undefined,
        threshold,
        timeout,
      });
    } else {
      // Increment failure count
      const newFailureCount = currentState.failureCount + 1;
      const shouldOpen = newFailureCount >= threshold;

      await updateCircuitBreakerState(providerName, {
        status: shouldOpen ? 'open' : 'closed',
        failureCount: newFailureCount,
        lastFailureTime: Date.now(),
        nextAttemptTime: shouldOpen ? Date.now() + timeout : undefined,
        threshold,
        timeout,
      });
    }
  }

  public async getProviderHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        health[name] = await provider.isHealthy();
      } catch (error) {
        health[name] = false;
      }
    }

    return health;
  }

  public getProviderInfo(providerName: string): ProviderConfig | null {
    const provider = this.providers.get(providerName);
    return provider ? provider.getInfo() : null;
  }

  public listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  public async estimateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<number> {
    const provider = this.findProviderForModel(modelId);
    if (!provider) {
      throw new Error(`No provider found for model ${modelId}`);
    }

    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`Provider instance not found for ${provider}`);
    }

    return providerInstance.estimateCost(inputTokens, outputTokens);
  }

  public async refreshProviders(): Promise<void> {
    // Close existing connections
    for (const provider of this.providers.values()) {
      // TODO: Add close method to base provider
    }

    // Clear providers map
    this.providers.clear();

    // Reinitialize providers
    this.initializeProviders();
  }
}