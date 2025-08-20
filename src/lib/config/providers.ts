import { z } from 'zod';

export const ProviderSchema = z.object({
  name: z.string(),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  models: z.array(z.string()),
  rateLimit: z.object({
    requestsPerMinute: z.number(),
    tokensPerMinute: z.number(),
  }),
  costPer1kTokens: z.object({
    input: z.number(),
    output: z.number(),
  }),
  fallbackPriority: z.number(),
  enabled: z.boolean(),
});

export type Provider = z.infer<typeof ProviderSchema>;

export const providers: Record<string, Provider> = {
  openai: {
    name: 'OpenAI',
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    rateLimit: {
      requestsPerMinute: 60,
      tokensPerMinute: 90000,
    },
    costPer1kTokens: {
      input: 0.03,
      output: 0.06,
    },
    fallbackPriority: 1,
    enabled: true,
  },
  anthropic: {
    name: 'Anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    rateLimit: {
      requestsPerMinute: 50,
      tokensPerMinute: 100000,
    },
    costPer1kTokens: {
      input: 0.015,
      output: 0.075,
    },
    fallbackPriority: 2,
    enabled: true,
  },
  perplexity: {
    name: 'Perplexity',
    apiKey: process.env.PERPLEXITY_API_KEY || '',
    baseUrl: 'https://api.perplexity.ai',
    models: ['llama-3.1-8b-instruct', 'llama-3.1-70b-instruct', 'mixtral-8x7b-instruct'],
    rateLimit: {
      requestsPerMinute: 100,
      tokensPerMinute: 200000,
    },
    costPer1kTokens: {
      input: 0.0002,
      output: 0.0002,
    },
    fallbackPriority: 3,
    enabled: true,
  },
  openrouter: {
    name: 'OpenRouter',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['gpt-4', 'claude-3-opus', 'llama-3.1-70b'],
    rateLimit: {
      requestsPerMinute: 80,
      tokensPerMinute: 150000,
    },
    costPer1kTokens: {
      input: 0.02,
      output: 0.04,
    },
    fallbackPriority: 4,
    enabled: true,
  },
};

export function getProvider(name: string): Provider | null {
  const provider = providers[name];
  if (!provider || !provider.enabled) return null;
  return provider;
}

export function getEnabledProviders(): Provider[] {
  return Object.values(providers).filter(p => p.enabled);
}

export function getProviderByModel(model: string): Provider | null {
  for (const provider of Object.values(providers)) {
    if (provider.enabled && provider.models.includes(model)) {
      return provider;
    }
  }
  return null;
}

export function getFallbackChain(excludeProvider?: string): Provider[] {
  return Object.values(providers)
    .filter(p => p.enabled && p.name !== excludeProvider)
    .sort((a, b) => a.fallbackPriority - b.fallbackPriority);
}