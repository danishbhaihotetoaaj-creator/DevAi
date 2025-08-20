import { BaseProvider, ProviderConfig, ProviderCallOptions } from './base';
import { ProviderRequest, ProviderResponse, ChatMessage, TokenUsage } from '@/lib/types';

export interface PerplexitySearchRequest {
  query: string;
  model: string;
  max_results?: number;
  include_domains?: string[];
  exclude_domains?: string[];
  time_range?: 'day' | 'week' | 'month' | 'year';
}

export interface PerplexitySearchResponse {
  id: string;
  model: string;
  query: string;
  answer: string;
  search_results: Array<{
    title: string;
    url: string;
    snippet: string;
    domain: string;
    published_date?: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class PerplexityProvider extends BaseProvider {
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.perplexity.ai';
  }

  async call(request: ProviderRequest, options: ProviderCallOptions = {}): Promise<ProviderResponse> {
    try {
      // Validate request
      if (!this.validateRequest(request)) {
        throw new Error('Invalid request for Perplexity provider');
      }

      // Check rate limits and circuit breaker
      if (!(await this.checkRateLimit()) || !(await this.checkCircuitBreaker())) {
        throw new Error('Provider temporarily unavailable');
      }

      // Transform request to Perplexity format
      const perplexityRequest = this.transformRequest(request);

      // Make the API call with retries
      const response = await this.withRetry(
        () => this.makeSearchRequest(perplexityRequest),
        options.retries || 3
      );

      // Transform response to our format
      return this.transformResponse(response);
    } catch (error) {
      throw this.handleError(error, 'web search');
    }
  }

  private async makeSearchRequest(request: PerplexitySearchRequest): Promise<PerplexitySearchResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that searches the web for current information. Provide accurate, up-to-date answers based on the search results.',
          },
          {
            role: 'user',
            content: request.query,
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
        search_query: request.query,
        search_options: {
          max_results: request.max_results || 5,
          include_domains: request.include_domains,
          exclude_domains: request.exclude_domains,
          time_range: request.time_range,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  protected validateRequest(request: ProviderRequest): boolean {
    if (!this.validateModel(request.model)) {
      return false;
    }

    if (!this.validateApiKey()) {
      return false;
    }

    if (!request.messages || request.messages.length === 0) {
      return false;
    }

    // Perplexity requires at least one user message
    const hasUserMessage = request.messages.some(msg => msg.role === 'user');
    if (!hasUserMessage) {
      return false;
    }

    return true;
  }

  protected transformRequest(request: ProviderRequest): PerplexitySearchRequest {
    // Extract the user's query from messages
    const userMessage = request.messages.find(msg => msg.role === 'user');
    const query = typeof userMessage?.content === 'string' 
      ? userMessage.content 
      : JSON.stringify(userMessage?.content);

    return {
      query,
      model: request.model,
      max_results: 5,
    };
  }

  protected transformResponse(response: PerplexitySearchResponse): ProviderResponse {
    const choices = [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
          content: response.answer,
        },
        finishReason: 'stop',
      },
    ];

    const usage: TokenUsage = {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    };

    return {
      id: response.id,
      model: response.model,
      choices,
      usage,
      provider: this.config.name,
      metadata: {
        requestId: response.id,
        processingTime: Date.now(),
        fallbackUsed: false,
        cost: this.calculateCost(usage),
        searchResults: response.search_results,
      },
    };
  }

  protected async createEmbedding(text: string): Promise<number[]> {
    // Perplexity doesn't provide embeddings, so we'll throw an error
    throw new Error('Embeddings not supported by Perplexity provider');
  }

  protected calculateCost(usage: TokenUsage): number {
    const inputCost = (usage.promptTokens / 1000) * this.config.costPer1kTokens.input;
    const outputCost = (usage.completionTokens / 1000) * this.config.costPer1kTokens.output;
    return inputCost + outputCost;
  }

  // Override health check for Perplexity
  public async isHealthy(): Promise<boolean> {
    try {
      if (!this.validateApiKey()) {
        return false;
      }

      // Make a simple API call to check connectivity
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Get available models
  public async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.data.map((model: any) => model.id);
    } catch (error) {
      console.error('Failed to get Perplexity models:', error);
      return this.config.models; // Fallback to configured models
    }
  }

  // Specialized web search method
  public async searchWeb(query: string, options: {
    maxResults?: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    timeRange?: 'day' | 'week' | 'month' | 'year';
  } = {}): Promise<{
    answer: string;
    searchResults: Array<{
      title: string;
      url: string;
      snippet: string;
      domain: string;
      publishedDate?: string;
    }>;
    usage: TokenUsage;
  }> {
    const searchRequest: PerplexitySearchRequest = {
      query,
      model: this.config.models[0], // Use first available model
      max_results: options.maxResults || 5,
      include_domains: options.includeDomains,
      exclude_domains: options.excludeDomains,
      time_range: options.timeRange,
    };

    const response = await this.makeSearchRequest(searchRequest);
    
    return {
      answer: response.answer,
      searchResults: response.search_results,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }
}