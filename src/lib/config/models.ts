import { z } from 'zod';

export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  contextWindow: z.number(),
  maxTokens: z.number(),
  supportsVision: z.boolean(),
  supportsFunctionCalling: z.boolean(),
  supportsWebSearch: z.boolean(),
  costPer1kInput: z.number(),
  costPer1kOutput: z.number(),
  speed: z.enum(['fast', 'medium', 'slow']),
  quality: z.enum(['basic', 'good', 'excellent']),
  enabled: z.boolean(),
});

export type Model = z.infer<typeof ModelSchema>;

export const models: Record<string, Model> = {
  // OpenAI Models
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    contextWindow: 8192,
    maxTokens: 4096,
    supportsVision: false,
    supportsFunctionCalling: true,
    supportsWebSearch: false,
    costPer1kInput: 0.03,
    costPer1kOutput: 0.06,
    speed: 'slow',
    quality: 'excellent',
    enabled: true,
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    maxTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsWebSearch: false,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
    speed: 'medium',
    quality: 'excellent',
    enabled: true,
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16385,
    maxTokens: 4096,
    supportsVision: false,
    supportsFunctionCalling: true,
    supportsWebSearch: false,
    costPer1kInput: 0.0015,
    costPer1kOutput: 0.002,
    speed: 'fast',
    quality: 'good',
    enabled: true,
  },

  // Anthropic Models
  'claude-3-opus': {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    maxTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsWebSearch: false,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    speed: 'slow',
    quality: 'excellent',
    enabled: true,
  },
  'claude-3-sonnet': {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsWebSearch: false,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    speed: 'medium',
    quality: 'excellent',
    enabled: true,
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    maxTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsWebSearch: false,
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
    speed: 'fast',
    quality: 'good',
    enabled: true,
  },

  // Perplexity Models
  'llama-3.1-70b-instruct': {
    id: 'llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: 'perplexity',
    contextWindow: 8192,
    maxTokens: 4096,
    supportsVision: false,
    supportsFunctionCalling: false,
    supportsWebSearch: true,
    costPer1kInput: 0.0002,
    costPer1kOutput: 0.0002,
    speed: 'medium',
    quality: 'good',
    enabled: true,
  },
  'llama-3.1-8b-instruct': {
    id: 'llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B',
    provider: 'perplexity',
    contextWindow: 8192,
    maxTokens: 4096,
    supportsVision: false,
    supportsFunctionCalling: false,
    supportsWebSearch: true,
    costPer1kInput: 0.0002,
    costPer1kOutput: 0.0002,
    speed: 'fast',
    quality: 'basic',
    enabled: true,
  },

  // OpenRouter Models
  'gpt-4-openrouter': {
    id: 'gpt-4-openrouter',
    name: 'GPT-4 (OpenRouter)',
    provider: 'openrouter',
    contextWindow: 8192,
    maxTokens: 4096,
    supportsVision: false,
    supportsFunctionCalling: true,
    supportsWebSearch: false,
    costPer1kInput: 0.02,
    costPer1kOutput: 0.04,
    speed: 'slow',
    quality: 'excellent',
    enabled: true,
  },
};

export function getModel(id: string): Model | null {
  const model = models[id];
  if (!model || !model.enabled) return null;
  return model;
}

export function getModelsByProvider(provider: string): Model[] {
  return Object.values(models).filter(m => m.provider === provider && m.enabled);
}

export function getModelsByCapability(capability: keyof Pick<Model, 'supportsVision' | 'supportsFunctionCalling' | 'supportsWebSearch'>): Model[] {
  return Object.values(models).filter(m => m.enabled && m[capability]);
}

export function getModelsByQuality(quality: Model['quality']): Model[] {
  return Object.values(models).filter(m => m.enabled && m.quality === quality);
}

export function getModelsBySpeed(speed: Model['speed']): Model[] {
  return Object.values(models).filter(m => m.enabled && m.speed === speed);
}

export function getCheapestModel(capability?: keyof Pick<Model, 'supportsVision' | 'supportsFunctionCalling' | 'supportsWebSearch'>): Model | null {
  const availableModels = capability 
    ? getModelsByCapability(capability)
    : Object.values(models).filter(m => m.enabled);
  
  if (availableModels.length === 0) return null;
  
  return availableModels.reduce((cheapest, current) => 
    current.costPer1kInput < cheapest.costPer1kInput ? current : cheapest
  );
}