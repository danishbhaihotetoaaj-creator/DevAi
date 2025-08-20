import { z } from 'zod';

// Base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User types
export interface UserProfile extends BaseEntity {
  clerkUserId: string;
  email: string;
  name: string;
  avatar?: string;
  plan: string;
  preferences: UserPreferences;
  traits: UserTraits;
  usage: UsageStats;
}

export interface UserPreferences {
  memoryOptOut: boolean;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface UserTraits {
  interests: string[];
  expertise: string[];
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  communicationStyle: 'formal' | 'casual' | 'friendly' | 'professional';
  personalityType?: string;
}

export interface UsageStats {
  dailyMessages: number;
  monthlyMessages: number;
  totalTokens: number;
  lastResetDate: Date;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  marketing: boolean;
}

export interface PrivacySettings {
  shareConversations: boolean;
  allowAnalytics: boolean;
  dataRetention: number; // days
}

// Conversation types
export interface Conversation extends BaseEntity {
  userId: string;
  title: string;
  personality: string;
  messages: Message[];
  metadata: ConversationMetadata;
  isArchived: boolean;
}

export interface Message extends BaseEntity {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
  metadata: MessageMetadata;
  insights?: MessageInsights;
}

export interface Attachment {
  id: string;
  type: 'image' | 'document' | 'audio' | 'video';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
}

export interface MessageMetadata {
  tokens: number;
  model: string;
  provider: string;
  processingTime: number;
  fallbackApplied: boolean;
  cost: number;
}

export interface MessageInsights {
  intent: string;
  emotion: string;
  topics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  entities: Entity[];
}

export interface Entity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'concept';
  confidence: number;
}

export interface ConversationMetadata {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  lastActivity: Date;
  tags: string[];
}

// Memory types
export interface MemoryAtom extends BaseEntity {
  userId: string;
  conversationId: string;
  messageId: string;
  type: 'fact' | 'preference' | 'goal' | 'relationship' | 'skill';
  content: string;
  confidence: number;
  source: 'user' | 'assistant' | 'web-search' | 'document';
  tags: string[];
  embedding: number[];
  metadata: MemoryMetadata;
}

export interface MemoryMetadata {
  relevance: number;
  lastAccessed: Date;
  accessCount: number;
  relatedMemories: string[];
  expirationDate?: Date;
}

// AI Provider types
export interface ProviderRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  functions?: FunctionDefinition[];
  functionCall?: 'auto' | 'none' | { name: string };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | ChatContent[];
  name?: string;
  functionCall?: FunctionCall;
}

export interface ChatContent {
  type: 'text' | 'image_url';
  text?: string;
  imageUrl?: ImageUrl;
}

export interface ImageUrl {
  url: string;
  detail?: 'low' | 'high' | 'auto';
}

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ProviderResponse {
  id: string;
  model: string;
  choices: Choice[];
  usage: TokenUsage;
  provider: string;
  metadata: ProviderMetadata;
}

export interface Choice {
  index: number;
  message: ChatMessage;
  finishReason: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ProviderMetadata {
  requestId: string;
  processingTime: number;
  fallbackUsed: boolean;
  cost: number;
}

// Web Search types
export interface WebSearchRequest {
  query: string;
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  timeRange?: 'day' | 'week' | 'month' | 'year';
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedDate?: Date;
  relevance: number;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  totalResults: number;
  searchTime: number;
  provider: string;
}

// File Upload types
export interface FileUploadRequest {
  file: File;
  conversationId?: string;
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadTime: Date;
  metadata?: Record<string, any>;
}

// Analytics types
export interface AnalyticsEvent {
  userId: string;
  event: string;
  category: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId: string;
}

export interface UsageMetrics {
  userId: string;
  date: Date;
  messagesSent: number;
  tokensUsed: number;
  cost: number;
  personalityUsage: Record<string, number>;
  taskUsage: Record<string, number>;
}

// Error types
export interface AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, any>;
  isOperational: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  metadata?: {
    timestamp: Date;
    requestId: string;
    processingTime: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

// Circuit breaker types
export interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  threshold: number;
  timeout: number;
}

// Zod schemas for validation
export const UserProfileSchema = z.object({
  clerkUserId: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  avatar: z.string().optional(),
  plan: z.string(),
  preferences: z.object({
    memoryOptOut: z.boolean(),
    language: z.string(),
    theme: z.enum(['light', 'dark', 'auto']),
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      marketing: z.boolean(),
    }),
    privacy: z.object({
      shareConversations: z.boolean(),
      allowAnalytics: z.boolean(),
      dataRetention: z.number(),
    }),
  }),
  traits: z.object({
    interests: z.array(z.string()),
    expertise: z.array(z.string()),
    learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'mixed']),
    communicationStyle: z.enum(['formal', 'casual', 'friendly', 'professional']),
    personalityType: z.string().optional(),
  }),
  usage: z.object({
    dailyMessages: z.number(),
    monthlyMessages: z.number(),
    totalTokens: z.number(),
    lastResetDate: z.date(),
  }),
});

export const MessageSchema = z.object({
  conversationId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  attachments: z.array(z.object({
    id: z.string(),
    type: z.enum(['image', 'document', 'audio', 'video']),
    url: z.string(),
    filename: z.string(),
    size: z.number(),
    mimeType: z.string(),
    metadata: z.record(z.any()).optional(),
  })).optional(),
  metadata: z.object({
    tokens: z.number(),
    model: z.string(),
    provider: z.string(),
    processingTime: z.number(),
    fallbackApplied: z.boolean(),
    cost: z.number(),
  }),
  insights: z.object({
    intent: z.string(),
    emotion: z.string(),
    topics: z.array(z.string()),
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    confidence: z.number(),
    entities: z.array(z.object({
      text: z.string(),
      type: z.enum(['person', 'organization', 'location', 'date', 'concept']),
      confidence: z.number(),
    })),
  }).optional(),
});

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type ExtractProps<T> = T extends React.ComponentType<infer P> ? P : never;