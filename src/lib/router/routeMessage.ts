import { ProviderManager } from '@/lib/providers/manager';
import { getPersonality } from '@/lib/config/personalities';
import { getTask, getRecommendedModel } from '@/lib/config/tasks';
import { getPlan, canUseFeature, getFeatureLimit } from '@/lib/config/plans';
import { getModel } from '@/lib/config/models';
import { getUserProfile, getUserUsage, incrementUsage } from '@/lib/db/supabase';
import { getCache, setCache } from '@/lib/db/redis';
import { storeVector, searchVectors } from '@/lib/db/chroma';
import { 
  ProviderRequest, 
  ProviderResponse, 
  ChatMessage, 
  Message,
  Conversation,
  UserProfile,
  MemoryAtom,
  MessageInsights
} from '@/lib/types';

export interface RouteMessageRequest {
  userId: string;
  personalityId: string;
  message: string;
  conversationId?: string;
  attachments?: Array<{
    type: 'image' | 'document' | 'audio' | 'video';
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  }>;
  clientContext?: {
    task?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface RouteMessageResponse {
  message: string;
  metadata: {
    model: string;
    provider: string;
    tokens: number;
    cost: number;
    fallbackUsed: boolean;
    processingTime: number;
    personality: string;
    task: string;
  };
  conversationId: string;
  messageId: string;
  insights?: MessageInsights;
  memories?: MemoryAtom[];
}

export class MessageRouter {
  private providerManager: ProviderManager;

  constructor() {
    this.providerManager = new ProviderManager();
  }

  public async routeMessage(request: RouteMessageRequest): Promise<RouteMessageResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate and get user information
      const user = await this.validateUser(request.userId);
      const plan = getPlan(user.plan);
      if (!plan) {
        throw new Error('Invalid user plan');
      }

      // 2. Validate personality and task
      const personality = getPersonality(request.personalityId);
      if (!personality) {
        throw new Error('Invalid personality');
      }

      const task = request.clientContext?.task || 'chat';
      if (!personality.allowedTasks.includes(task)) {
        throw new Error(`Personality ${request.personalityId} does not support task ${task}`);
      }

      // 3. Check usage limits and apply soft fallbacks
      const usage = await this.checkUsageLimits(user.id, plan);
      const fallbackApplied = usage.fallbackApplied;

      // 4. Build context with memories and conversation history
      const context = await this.buildContext(request, personality, plan, user);

      // 5. Select model based on task, personality, and plan
      const modelId = await this.selectModel(task, personality, plan, request.clientContext?.model);

      // 6. Create provider request
      const providerRequest: ProviderRequest = {
        model: modelId,
        messages: context.messages,
        maxTokens: this.calculateMaxTokens(request.clientContext?.maxTokens, personality, plan),
        temperature: request.clientContext?.temperature || 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
      };

      // 7. Call AI provider with fallback
      const response = await this.providerManager.call(providerRequest, {
        userId: user.id,
        planId: user.plan,
        personality: personality.id,
        task,
      });

      // 8. Process response and extract insights
      const insights = await this.extractInsights(response.choices[0].message.content, task);
      
      // 9. Store message and update conversation
      const { conversationId, messageId } = await this.storeMessage(
        request,
        response,
        user.id,
        personality.id,
        insights
      );

      // 10. Store in vector database for semantic search
      await this.storeInVectorDB(
        conversationId,
        messageId,
        request.message,
        response.choices[0].message.content,
        user.id,
        personality.id
      );

      // 11. Update usage statistics
      await this.updateUsage(user.id, response.usage.totalTokens, response.metadata.cost);

      // 12. Extract and store memories (async)
      this.extractMemories(request.message, response.choices[0].message.content, user.id, conversationId, messageId);

      const processingTime = Date.now() - startTime;

      return {
        message: response.choices[0].message.content,
        metadata: {
          model: response.model,
          provider: response.provider,
          tokens: response.usage.totalTokens,
          cost: response.metadata.cost,
          fallbackUsed: response.metadata.fallbackUsed,
          processingTime,
          personality: personality.id,
          task,
        },
        conversationId,
        messageId,
        insights,
      };

    } catch (error) {
      console.error('Message routing error:', error);
      throw new Error(`Failed to route message: ${error.message}`);
    }
  }

  private async validateUser(userId: string): Promise<UserProfile> {
    try {
      const user = await getUserProfile(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error(`User validation failed: ${error.message}`);
    }
  }

  private async checkUsageLimits(userId: string, plan: any): Promise<{
    fallbackApplied: boolean;
    contextReduction: number;
  }> {
    try {
      const usage = await getUserUsage(userId);
      const today = new Date().toDateString();
      const lastReset = usage.lastResetDate ? new Date(usage.lastResetDate).toDateString() : null;

      // Reset daily counters if it's a new day
      if (lastReset !== today) {
        await incrementUsage(userId, {
          dailyMessages: 0,
          lastResetDate: new Date().toISOString(),
        });
        return { fallbackApplied: false, contextReduction: 1.0 };
      }

      // Check if daily limit exceeded
      if (usage.dailyMessages >= plan.features.dailyMessageLimit) {
        // Apply soft fallback - reduce context size
        return { fallbackApplied: true, contextReduction: plan.fallbackRules.contextReductionFactor };
      }

      return { fallbackApplied: false, contextReduction: 1.0 };
    } catch (error) {
      console.error('Usage check failed:', error);
      return { fallbackApplied: false, contextReduction: 1.0 };
    }
  }

  private async buildContext(
    request: RouteMessageRequest,
    personality: any,
    plan: any,
    user: UserProfile
  ): Promise<{
    messages: ChatMessage[];
    memories: MemoryAtom[];
  }> {
    const messages: ChatMessage[] = [];
    const memories: MemoryAtom[] = [];

    // Add system prompt
    messages.push({
      role: 'system',
      content: personality.systemPrompt,
    });

    // Get conversation history
    if (request.conversationId) {
      const history = await this.getConversationHistory(request.conversationId, plan.features.contextSize);
      messages.push(...history);
    }

    // Add user message
    messages.push({
      role: 'user',
      content: request.message,
    });

    // Get relevant memories if enabled
    if (plan.features.memoryEnabled && !user.preferences.memoryOptOut) {
      memories.push(...await this.getRelevantMemories(request.message, user.id));
    }

    // Add memory context if available
    if (memories.length > 0) {
      const memoryContext = this.formatMemoryContext(memories);
      messages.splice(1, 0, {
        role: 'system',
        content: `Relevant context from previous conversations:\n${memoryContext}`,
      });
    }

    return { messages, memories };
  }

  private async selectModel(
    task: string,
    personality: any,
    plan: any,
    forcedModel?: string
  ): Promise<string> {
    if (forcedModel) {
      const model = getModel(forcedModel);
      if (model && personality.allowedTasks.includes(task)) {
        return forcedModel;
      }
    }

    // Get recommended model for task and personality
    const recommendedModel = getRecommendedModel(task, personality.id, plan.id);
    if (recommendedModel) {
      return recommendedModel;
    }

    // Fallback to personality's default model
    return personality.defaultModel;
  }

  private calculateMaxTokens(
    requestedMaxTokens?: number,
    personality?: any,
    plan?: any
  ): number {
    if (requestedMaxTokens) {
      return Math.min(requestedMaxTokens, personality?.maxTokens || 4000);
    }

    return personality?.maxTokens || 4000;
  }

  private async extractInsights(content: string, task: string): Promise<MessageInsights> {
    // TODO: Implement insight extraction using AI
    // For now, return basic insights
    return {
      intent: 'general',
      emotion: 'neutral',
      topics: [],
      sentiment: 'neutral',
      confidence: 0.8,
      entities: [],
    };
  }

  private async storeMessage(
    request: RouteMessageRequest,
    response: ProviderResponse,
    userId: string,
    personalityId: string,
    insights: MessageInsights
  ): Promise<{ conversationId: string; messageId: string }> {
    // TODO: Implement message storage in Supabase
    // For now, return mock IDs
    return {
      conversationId: request.conversationId || 'conv_' + Date.now(),
      messageId: 'msg_' + Date.now(),
    };
  }

  private async storeInVectorDB(
    conversationId: string,
    messageId: string,
    userMessage: string,
    assistantMessage: string,
    userId: string,
    personalityId: string
  ): Promise<void> {
    try {
      // Store user message
      await storeVector(
        'chats_all',
        [userMessage],
        [{
          userId,
          conversationId,
          messageId,
          personality: personalityId,
          role: 'user',
          timestamp: new Date().toISOString(),
        }],
        [`${messageId}_user`]
      );

      // Store assistant message
      await storeVector(
        'chats_all',
        [assistantMessage],
        [{
          userId,
          conversationId,
          messageId,
          personality: personalityId,
          role: 'assistant',
          timestamp: new Date().toISOString(),
        }],
        [`${messageId}_assistant`]
      );
    } catch (error) {
      console.error('Failed to store in vector DB:', error);
    }
  }

  private async updateUsage(userId: string, tokens: number, cost: number): Promise<void> {
    try {
      await incrementUsage(userId, {
        dailyMessages: 1,
        totalTokens: tokens,
      });
    } catch (error) {
      console.error('Failed to update usage:', error);
    }
  }

  private async extractMemories(
    userMessage: string,
    assistantMessage: string,
    userId: string,
    conversationId: string,
    messageId: string
  ): Promise<void> {
    // TODO: Implement memory extraction using AI
    // This would run asynchronously to not block the response
  }

  private async getConversationHistory(conversationId: string, maxMessages: number): Promise<ChatMessage[]> {
    // TODO: Implement conversation history retrieval
    return [];
  }

  private async getRelevantMemories(query: string, userId: string): Promise<MemoryAtom[]> {
    // TODO: Implement memory retrieval using vector similarity
    return [];
  }

  private formatMemoryContext(memories: MemoryAtom[]): string {
    return memories
      .map(memory => `- ${memory.content}`)
      .join('\n');
  }
}