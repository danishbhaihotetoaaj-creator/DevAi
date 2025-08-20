import OpenAI from 'openai';
import { BaseProvider, ProviderConfig, ProviderCallOptions } from './base';
import { ProviderRequest, ProviderResponse, ChatMessage, TokenUsage, ChatContent, ImageUrl } from '@/lib/types';

export class OpenAIProvider extends BaseProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async call(request: ProviderRequest, options: ProviderCallOptions = {}): Promise<ProviderResponse> {
    try {
      // Validate request
      if (!this.validateRequest(request)) {
        throw new Error('Invalid request for OpenAI provider');
      }

      // Check rate limits and circuit breaker
      if (!(await this.checkRateLimit()) || !(await this.checkCircuitBreaker())) {
        throw new Error('Provider temporarily unavailable');
      }

      // Transform request to OpenAI format
      const openaiRequest = this.transformRequest(request);

      // Make the API call with retries
      const response = await this.withRetry(
        () => this.client.chat.completions.create(openaiRequest),
        options.retries || 3
      );

      // Transform response to our format
      return this.transformResponse(response);
    } catch (error) {
      throw this.handleError(error, 'chat completion');
    }
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

    return true;
  }

  protected transformRequest(request: ProviderRequest): any {
    const transformedMessages = request.messages.map(msg => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: msg.content,
          ...(msg.name && { name: msg.name }),
          ...(msg.functionCall && { function_call: msg.functionCall }),
        };
      } else {
        // Handle multimodal content
        const content = msg.content.map((item: ChatContent) => {
          if (item.type === 'text') {
            return { type: 'text', text: item.text };
          } else if (item.type === 'image_url') {
            return {
              type: 'image_url',
              image_url: {
                url: item.imageUrl!.url,
                detail: item.imageUrl!.detail || 'auto',
              },
            };
          }
          return item;
        });

        return {
          role: msg.role,
          content,
          ...(msg.name && { name: msg.name }),
          ...(msg.functionCall && { function_call: msg.functionCall }),
        };
      }
    });

    return {
      model: request.model,
      messages: transformedMessages,
      ...(request.maxTokens && { max_tokens: request.maxTokens }),
      ...(request.temperature && { temperature: request.temperature }),
      ...(request.topP && { top_p: request.topP }),
      ...(request.frequencyPenalty && { frequency_penalty: request.frequencyPenalty }),
      ...(request.presencePenalty && { presence_penalty: request.presencePenalty }),
      ...(request.stop && { stop: request.stop }),
      ...(request.functions && { functions: request.functions }),
      ...(request.functionCall && { function_call: request.functionCall }),
    };
  }

  protected transformResponse(response: any): ProviderResponse {
    const choices = response.choices.map((choice: any) => ({
      index: choice.index,
      message: {
        role: choice.message.role,
        content: choice.message.content,
        ...(choice.message.function_call && {
          functionCall: {
            name: choice.message.function_call.name,
            arguments: choice.message.function_call.arguments,
          },
        }),
      },
      finishReason: choice.finish_reason,
    }));

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
        processingTime: Date.now(), // This would be calculated from start time
        fallbackUsed: false,
        cost: this.calculateCost(usage),
      },
    };
  }

  protected async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      throw this.handleError(error, 'embedding creation');
    }
  }

  protected calculateCost(usage: TokenUsage): number {
    const inputCost = (usage.promptTokens / 1000) * this.config.costPer1kTokens.input;
    const outputCost = (usage.completionTokens / 1000) * this.config.costPer1kTokens.output;
    return inputCost + outputCost;
  }

  // Override health check for OpenAI
  public async isHealthy(): Promise<boolean> {
    try {
      if (!this.validateApiKey()) {
        return false;
      }

      // Make a simple API call to check connectivity
      await this.client.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get available models
  public async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      return models.data.map(model => model.id);
    } catch (error) {
      console.error('Failed to get OpenAI models:', error);
      return this.config.models; // Fallback to configured models
    }
  }
}