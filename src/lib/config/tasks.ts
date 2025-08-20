import { z } from 'zod';
import { getModel } from './models';
import { getPersonality } from './personalities';

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['conversation', 'analysis', 'creation', 'research', 'learning', 'support']),
  requiresVision: z.boolean(),
  requiresWebSearch: z.boolean(),
  requiresFunctionCalling: z.boolean(),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  estimatedTokens: z.number(),
  fallbackModels: z.array(z.string()),
  enabled: z.boolean(),
});

export type Task = z.infer<typeof TaskSchema>;

export const tasks: Record<string, Task> = {
  // Conversation Tasks
  chat: {
    id: 'chat',
    name: 'General Chat',
    description: 'Casual conversation and general assistance',
    category: 'conversation',
    requiresVision: false,
    requiresWebSearch: false,
    requiresFunctionCalling: false,
    complexity: 'simple',
    estimatedTokens: 1000,
    fallbackModels: ['gpt-3.5-turbo', 'claude-3-haiku'],
    enabled: true,
  },
  emotionalSupport: {
    id: 'emotional-support',
    name: 'Emotional Support',
    description: 'Providing emotional support and mental health assistance',
    category: 'support',
    requiresVision: false,
    requiresWebSearch: false,
    requiresFunctionCalling: false,
    complexity: 'moderate',
    estimatedTokens: 1500,
    fallbackModels: ['claude-3-sonnet', 'gpt-3.5-turbo'],
    enabled: true,
  },

  // Analysis Tasks
  analysis: {
    id: 'analysis',
    name: 'Data Analysis',
    description: 'Analyzing data, patterns, and complex information',
    category: 'analysis',
    requiresVision: false,
    requiresWebSearch: false,
    requiresFunctionCalling: true,
    complexity: 'complex',
    estimatedTokens: 3000,
    fallbackModels: ['gpt-4-turbo', 'claude-3-sonnet'],
    enabled: true,
  },
  factChecking: {
    id: 'fact-checking',
    name: 'Fact Checking',
    description: 'Verifying facts and information accuracy',
    category: 'research',
    requiresVision: false,
    requiresWebSearch: true,
    requiresFunctionCalling: false,
    complexity: 'moderate',
    estimatedTokens: 2000,
    fallbackModels: ['llama-3.1-70b-instruct', 'gpt-3.5-turbo'],
    enabled: true,
  },

  // Research Tasks
  research: {
    id: 'research',
    name: 'Research',
    description: 'Conducting comprehensive research on topics',
    category: 'research',
    requiresVision: false,
    requiresWebSearch: true,
    requiresFunctionCalling: false,
    complexity: 'complex',
    estimatedTokens: 4000,
    fallbackModels: ['llama-3.1-70b-instruct', 'claude-3-sonnet'],
    enabled: true,
  },
  webSearch: {
    id: 'web-search',
    name: 'Web Search',
    description: 'Searching the web for current information',
    category: 'research',
    requiresVision: false,
    requiresWebSearch: true,
    requiresFunctionCalling: false,
    complexity: 'moderate',
    estimatedTokens: 2500,
    fallbackModels: ['llama-3.1-70b-instruct', 'llama-3.1-8b-instruct'],
    enabled: true,
  },

  // Learning Tasks
  teaching: {
    id: 'teaching',
    name: 'Teaching',
    description: 'Educational content and skill development',
    category: 'learning',
    requiresVision: false,
    requiresWebSearch: false,
    requiresFunctionCalling: false,
    complexity: 'moderate',
    estimatedTokens: 2000,
    fallbackModels: ['claude-3-sonnet', 'gpt-3.5-turbo'],
    enabled: true,
  },
  explanation: {
    id: 'explanation',
    name: 'Explanation',
    description: 'Explaining complex concepts in simple terms',
    category: 'learning',
    requiresVision: false,
    requiresWebSearch: false,
    requiresFunctionCalling: false,
    complexity: 'moderate',
    estimatedTokens: 1800,
    fallbackModels: ['claude-3-haiku', 'gpt-3.5-turbo'],
    enabled: true,
  },

  // Creation Tasks
  creativeWriting: {
    id: 'creative-writing',
    name: 'Creative Writing',
    description: 'Creative content generation and storytelling',
    category: 'creation',
    requiresVision: false,
    requiresWebSearch: false,
    requiresFunctionCalling: false,
    complexity: 'moderate',
    estimatedTokens: 2500,
    fallbackModels: ['gpt-4-turbo', 'claude-3-sonnet'],
    enabled: true,
  },
  codeGeneration: {
    id: 'code-generation',
    name: 'Code Generation',
    description: 'Generating and explaining code',
    category: 'creation',
    requiresVision: false,
    requiresWebSearch: false,
    requiresFunctionCalling: true,
    complexity: 'complex',
    estimatedTokens: 3000,
    fallbackModels: ['gpt-4-turbo', 'claude-3-sonnet'],
    enabled: true,
  },

  // Vision Tasks
  imageAnalysis: {
    id: 'image-analysis',
    name: 'Image Analysis',
    description: 'Analyzing and describing images',
    category: 'analysis',
    requiresVision: true,
    requiresWebSearch: false,
    requiresFunctionCalling: false,
    complexity: 'moderate',
    estimatedTokens: 2000,
    fallbackModels: ['gpt-4-turbo', 'claude-3-sonnet'],
    enabled: true,
  },
  documentAnalysis: {
    id: 'document-analysis',
    name: 'Document Analysis',
    description: 'Analyzing documents and extracting information',
    category: 'analysis',
    requiresVision: true,
    requiresWebSearch: false,
    requiresFunctionCalling: false,
    complexity: 'complex',
    estimatedTokens: 3500,
    fallbackModels: ['gpt-4-turbo', 'claude-3-opus'],
    enabled: true,
  },

  // Wisdom Tasks
  guidance: {
    id: 'guidance',
    name: 'Life Guidance',
    description: 'Providing life advice and philosophical insights',
    category: 'support',
    requiresVision: false,
    requiresWebSearch: false,
    requiresFunctionCalling: false,
    complexity: 'moderate',
    estimatedTokens: 2000,
    fallbackModels: ['claude-3-sonnet', 'gpt-3.5-turbo'],
    enabled: true,
  },
  philosophy: {
    id: 'philosophy',
    name: 'Philosophical Discussion',
    description: 'Deep philosophical and ethical discussions',
    category: 'support',
    requiresVision: false,
    requiresWebSearch: false,
    requiresFunctionCalling: false,
    complexity: 'complex',
    estimatedTokens: 3000,
    fallbackModels: ['claude-3-opus', 'gpt-4'],
    enabled: true,
  },
};

export function getTask(id: string): Task | null {
  const task = tasks[id];
  if (!task || !task.enabled) return null;
  return task;
}

export function getTasksByCategory(category: Task['category']): Task[] {
  return Object.values(tasks).filter(t => t.enabled && t.category === category);
}

export function getTasksByComplexity(complexity: Task['complexity']): Task[] {
  return Object.values(tasks).filter(t => t.enabled && t.complexity === complexity);
}

export function getTasksByRequirement(requirement: keyof Pick<Task, 'requiresVision' | 'requiresWebSearch' | 'requiresFunctionCalling'>): Task[] {
  return Object.values(tasks).filter(t => t.enabled && t[requirement]);
}

export function getRecommendedModel(taskId: string, personalityId: string, planId: string): string | null {
  const task = getTask(taskId);
  const personality = getPersonality(personalityId);
  
  if (!task || !personality) return null;

  // Check if personality has a default model that supports the task requirements
  const defaultModel = getModel(personality.defaultModel);
  if (defaultModel && 
      (!task.requiresVision || defaultModel.supportsVision) &&
      (!task.requiresWebSearch || defaultModel.supportsWebSearch) &&
      (!task.requiresFunctionCalling || defaultModel.supportsFunctionCalling)) {
    return defaultModel.id;
  }

  // Find the best available model for the task
  const availableModels = Object.values(getModel).filter(model => 
    model && 
    (!task.requiresVision || model.supportsVision) &&
    (!task.requiresWebSearch || model.supportsWebSearch) &&
    (!task.requiresFunctionCalling || model.supportsFunctionCalling)
  );

  if (availableModels.length === 0) return null;

  // Sort by quality and cost (prefer higher quality, lower cost)
  const sortedModels = availableModels.sort((a, b) => {
    const qualityOrder = { 'excellent': 3, 'good': 2, 'basic': 1 };
    const qualityDiff = qualityOrder[b.quality] - qualityOrder[a.quality];
    if (qualityDiff !== 0) return qualityDiff;
    return a.costPer1kInput - b.costPer1kInput;
  });

  return sortedModels[0].id;
}

export function getFallbackModels(taskId: string): string[] {
  const task = getTask(taskId);
  return task?.fallbackModels || [];
}

export function estimateTokenUsage(taskId: string, inputLength: number): number {
  const task = getTask(taskId);
  if (!task) return 0;
  
  // Base estimation + input length factor
  return Math.ceil(task.estimatedTokens + (inputLength * 0.1));
}