import { z } from 'zod';

export const PlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  currency: z.string(),
  billingCycle: z.enum(['monthly', 'yearly']),
  features: z.object({
    dailyMessageLimit: z.number(),
    contextSize: z.number(),
    visionEnabled: z.boolean(),
    visionSizeLimit: z.number(),
    webSearchEnabled: z.boolean(),
    webSearchLimit: z.number(),
    fileUploadEnabled: z.boolean(),
    fileSizeLimit: z.number(),
    memoryEnabled: z.boolean(),
    memoryRetentionDays: z.number(),
    prioritySupport: z.boolean(),
    customPersonalities: z.boolean(),
  }),
  fallbackRules: z.object({
    contextReductionFactor: z.number(),
    modelDowngradeChain: z.array(z.string()),
    attachmentCompression: z.boolean(),
    memoryTruncation: z.boolean(),
  }),
  enabled: z.boolean(),
});

export type Plan = z.infer<typeof PlanSchema>;

export const plans: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'INR',
    billingCycle: 'monthly',
    features: {
      dailyMessageLimit: 10,
      contextSize: 5,
      visionEnabled: false,
      visionSizeLimit: 0,
      webSearchEnabled: false,
      webSearchLimit: 0,
      fileUploadEnabled: false,
      fileSizeLimit: 0,
      memoryEnabled: false,
      memoryRetentionDays: 0,
      prioritySupport: false,
      customPersonalities: false,
    },
    fallbackRules: {
      contextReductionFactor: 0.5,
      modelDowngradeChain: ['gpt-3.5-turbo', 'claude-3-haiku'],
      attachmentCompression: true,
      memoryTruncation: true,
    },
    enabled: true,
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 199,
    currency: 'INR',
    billingCycle: 'monthly',
    features: {
      dailyMessageLimit: 50,
      contextSize: 15,
      visionEnabled: true,
      visionSizeLimit: 5 * 1024 * 1024, // 5MB
      webSearchEnabled: true,
      webSearchLimit: 10,
      fileUploadEnabled: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      memoryEnabled: true,
      memoryRetentionDays: 30,
      prioritySupport: false,
      customPersonalities: false,
    },
    fallbackRules: {
      contextReductionFactor: 0.7,
      modelDowngradeChain: ['gpt-4-turbo', 'claude-3-sonnet', 'gpt-3.5-turbo'],
      attachmentCompression: false,
      memoryTruncation: false,
    },
    enabled: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 999,
    currency: 'INR',
    billingCycle: 'monthly',
    features: {
      dailyMessageLimit: 300,
      contextSize: 50,
      visionEnabled: true,
      visionSizeLimit: 25 * 1024 * 1024, // 25MB
      webSearchEnabled: true,
      webSearchLimit: 100,
      fileUploadEnabled: true,
      fileSizeLimit: 100 * 1024 * 1024, // 100MB
      memoryEnabled: true,
      memoryRetentionDays: 90,
      prioritySupport: true,
      customPersonalities: true,
    },
    fallbackRules: {
      contextReductionFactor: 0.9,
      modelDowngradeChain: ['gpt-4', 'claude-3-opus', 'gpt-4-turbo'],
      attachmentCompression: false,
      memoryTruncation: false,
    },
    enabled: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4999,
    currency: 'INR',
    billingCycle: 'monthly',
    features: {
      dailyMessageLimit: 1000,
      contextSize: 100,
      visionEnabled: true,
      visionSizeLimit: 100 * 1024 * 1024, // 100MB
      webSearchEnabled: true,
      webSearchLimit: 500,
      fileUploadEnabled: true,
      fileSizeLimit: 500 * 1024 * 1024, // 500MB
      memoryEnabled: true,
      memoryRetentionDays: 365,
      prioritySupport: true,
      customPersonalities: true,
    },
    fallbackRules: {
      contextReductionFactor: 1.0, // No reduction
      modelDowngradeChain: ['gpt-4', 'claude-3-opus'], // Only premium models
      attachmentCompression: false,
      memoryTruncation: false,
    },
    enabled: true,
  },
};

export function getPlan(id: string): Plan | null {
  const plan = plans[id];
  if (!plan || !plan.enabled) return null;
  return plan;
}

export function getEnabledPlans(): Plan[] {
  return Object.values(plans).filter(p => p.enabled);
}

export function getPlanByPrice(maxPrice: number): Plan[] {
  return Object.values(plans).filter(p => p.enabled && p.price <= maxPrice);
}

export function getPlanFeatures(planId: string) {
  const plan = getPlan(planId);
  return plan?.features || null;
}

export function canUseFeature(planId: string, feature: keyof Plan['features']): boolean {
  const plan = getPlan(planId);
  if (!plan) return false;
  return plan.features[feature] as boolean;
}

export function getFeatureLimit(planId: string, feature: keyof Plan['features']): number {
  const plan = getPlan(planId);
  if (!plan) return 0;
  return plan.features[feature] as number;
}

export function applyFallbackRules(planId: string, currentContext: any, currentModel: string) {
  const plan = getPlan(planId);
  if (!plan) return { context: currentContext, model: currentModel };

  const fallback = plan.fallbackRules;
  
  // Apply context reduction if needed
  if (fallback.contextReductionFactor < 1) {
    // Reduce context size
    const reducedContext = {
      ...currentContext,
      messages: currentContext.messages.slice(
        Math.floor(currentContext.messages.length * fallback.contextReductionFactor)
      ),
    };
    return { context: reducedContext, model: currentModel };
  }

  return { context: currentContext, model: currentModel };
}

export function getModelDowngradeChain(planId: string): string[] {
  const plan = getPlan(planId);
  return plan?.fallbackRules.modelDowngradeChain || [];
}