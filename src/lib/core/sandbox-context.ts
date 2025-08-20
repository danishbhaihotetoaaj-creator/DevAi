import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { analyticsEngine } from './analytics-engine';

interface SandboxContext {
  recent_turns: string;
  semantic_digest: string;
  total_tokens: number;
}

interface Message {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  embedding: number[];
  tokens: number;
  created_at: string;
}

class SandboxContextEngine {
  private supabase: any;
  private pgPool: Pool;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async generateSandboxContext(userId: string, threadId?: string): Promise<SandboxContext> {
    // Get recent turns (last 1-2 user turns)
    const recentTurns = await this.getRecentTurns(userId, threadId);
    
    // Get semantic micro-digest
    const semanticDigest = await this.getSemanticDigest(userId, threadId);
    
    // Compress and combine
    const compressedTurns = this.compressRecentTurns(recentTurns);
    const compressedDigest = this.compressSemanticDigest(semanticDigest);
    
    const totalTokens = this.estimateTokens(compressedTurns + compressedDigest);
    
    return {
      recent_turns: compressedTurns,
      semantic_digest: compressedDigest,
      total_tokens: totalTokens
    };
  }

  private async getRecentTurns(userId: string, threadId?: string): Promise<Message[]> {
    let query = `
      SELECT id, user_id, role, content, embedding, tokens, created_at
      FROM messages 
      WHERE user_id = $1
    `;
    
    const params = [userId];
    
    if (threadId) {
      query += ` AND thread_id = $2`;
      params.push(threadId);
    }
    
    query += ` ORDER BY created_at DESC LIMIT 8`;
    
    const result = await this.pgPool.query(query, params);
    return result.rows.reverse(); // Oldest first
  }

  private async getSemanticDigest(userId: string, threadId?: string): Promise<string[]> {
    // Get user's recent message embedding
    const userEmbeddingQuery = `
      SELECT embedding 
      FROM messages 
      WHERE user_id = $1 AND role = 'user' 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const userResult = await this.pgPool.query(userEmbeddingQuery, [userId]);
    if (!userResult.rows[0]?.embedding) return [];
    
    const userEmbedding = userResult.rows[0].embedding;
    
    // Find semantically similar messages
    const semanticQuery = `
      SELECT content, 
             embedding <-> $1 as distance
      FROM messages 
      WHERE user_id = $1 
        AND embedding IS NOT NULL
        AND embedding <-> $1 < 0.25
      ORDER BY distance ASC
      LIMIT 24
    `;
    
    const semanticResult = await this.pgPool.query(semanticQuery, [userEmbedding]);
    return semanticResult.rows.map(row => row.content);
  }

  private compressRecentTurns(messages: Message[]): string {
    if (messages.length === 0) return '';
    
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    let compressed = '';
    
    // Compress last 1-2 user turns (≤200 tokens)
    const recentUserTurns = userMessages.slice(-2);
    for (const turn of recentUserTurns) {
      const sentences = this.extractTopSentences(turn.content, 2);
      compressed += `User: ${sentences.join(' ')} `;
    }
    
    // Add last assistant response if exists
    if (assistantMessages.length > 0) {
      const lastAssistant = assistantMessages[assistantMessages.length - 1];
      const sentences = this.extractTopSentences(lastAssistant.content, 1);
      compressed += `Assistant: ${sentences.join(' ')} `;
    }
    
    // Hard cap at 200 tokens
    return this.truncateToTokens(compressed.trim(), 200);
  }

  private compressSemanticDigest(contents: string[]): string {
    if (contents.length === 0) return '';
    
    // Select 2-3 most relevant sentences
    const allSentences: string[] = [];
    
    for (const content of contents.slice(0, 8)) {
      const sentences = this.extractTopSentences(content, 1);
      allSentences.push(...sentences);
    }
    
    // Sort by relevance (simplified - could use more sophisticated ranking)
    const relevantSentences = allSentences
      .filter(s => s.length > 20 && s.length < 200)
      .slice(0, 3);
    
    return relevantSentences.join(' ');
  }

  private extractTopSentences(text: string, maxSentences: number): string[] {
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .sort((a, b) => b.length - a.length)
      .slice(0, maxSentences);
    
    return sentences;
  }

  private truncateToTokens(text: string, maxTokens: number): string {
    // Rough estimation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    
    if (text.length <= maxChars) return text;
    
    // Truncate at word boundary
    const truncated = text.substring(0, maxChars);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxChars * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  async injectSandboxContext(
    systemPrompt: string, 
    userId: string, 
    threadId?: string
  ): Promise<string> {
    const sandboxContext = await this.generateSandboxContext(userId, threadId);
    
    // Get user analytics
    const analytics = await analyticsEngine.getAnalyticsForUser(userId);
    const compressedAnalytics = analytics ? await analyticsEngine.compressAnalytics(analytics) : '{}';
    
    // Build system prompt with sandbox context
    const enhancedPrompt = `PhD-level, Patanjali-wise assistant

Analytics: ${compressedAnalytics}

Sandbox Context:
Recent: ${sandboxContext.recent_turns}
Semantic: ${sandboxContext.semantic_digest}

${systemPrompt}`;
    
    // Ensure total tokens ≤ 400 for sandbox context
    const totalSandboxTokens = this.estimateTokens(
      `Recent: ${sandboxContext.recent_turns}\nSemantic: ${sandboxContext.semantic_digest}`
    );
    
    if (totalSandboxTokens > 400) {
      // Fallback to semantic-closest sentence only
      const fallbackContext = await this.getFallbackContext(userId, threadId);
      return `PhD-level, Patanjali-wise assistant

Analytics: ${compressedAnalytics}

Sandbox Context: ${fallbackContext}

${systemPrompt}`;
    }
    
    return enhancedPrompt;
  }

  private async getFallbackContext(userId: string, threadId?: string): Promise<string> {
    // Get single most relevant semantic snippet
    const query = `
      SELECT content 
      FROM messages 
      WHERE user_id = $1 
        AND embedding IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await this.pgPool.query(query, [userId]);
    if (!result.rows[0]) return '';
    
    const content = result.rows[0].content;
    return this.extractTopSentences(content, 1)[0] || '';
  }

  async storeMessage(
    userId: string,
    threadId: string,
    role: 'user' | 'assistant',
    content: string,
    tokens: number
  ): Promise<void> {
    // Generate embedding
    const embedding = await analyticsEngine.generateEmbedding(content);
    
    // Generate tsvector for full-text search
    const tsvector = await this.generateTsvector(content);
    
    // Store message with embedding and tsvector
    await this.supabase
      .from('messages')
      .insert({
        user_id: userId,
        thread_id: threadId,
        role,
        content,
        embedding,
        tokens,
        tsv: tsvector,
        created_at: new Date().toISOString()
      });
  }

  private async generateTsvector(content: string): Promise<string> {
    // Simple tsvector generation - could be enhanced with proper stemming
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .join(' ');
    
    return words;
  }
}

export const sandboxContextEngine = new SandboxContextEngine();