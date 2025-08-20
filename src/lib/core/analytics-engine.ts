import { createClient } from '@supabase/supabase-js';
import { pipeline, env } from '@xenova/transformers';
import { Pool } from 'pg';

interface AnalyticsAggregate {
  user_id: string;
  date: string;
  topics: Record<string, number>;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    overall: number;
  };
  usage_stats: {
    total_messages: number;
    total_tokens: number;
    avg_message_length: number;
    peak_hours: number[];
    personality_distribution: Record<string, number>;
  };
  semantic_clusters: Array<{
    cluster_id: string;
    representative_text: string;
    frequency: number;
    avg_sentiment: number;
  }>;
}

class AnalyticsEngine {
  private supabase: any;
  private pgPool: Pool;
  private embeddingPipeline: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.initializeEmbeddings();
  }

  private async initializeEmbeddings() {
    env.cacheDir = './models';
    this.embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const output = await this.embeddingPipeline(text, {
      pooling: 'mean',
      normalize: true
    });
    return Array.from(output.data);
  }

  async aggregateNightlyAnalytics(date: string): Promise<AnalyticsAggregate[]> {
    const query = `
      WITH daily_messages AS (
        SELECT 
          user_id,
          content,
          embedding,
          tokens,
          created_at,
          EXTRACT(hour FROM created_at) as hour
        FROM messages 
        WHERE DATE(created_at) = $1
      ),
      topic_analysis AS (
        SELECT 
          user_id,
          unnest(string_to_array(lower(content), ' ')) as word,
          COUNT(*) as frequency
        FROM daily_messages
        WHERE length(content) > 10
        GROUP BY user_id, word
        HAVING COUNT(*) > 2
        ORDER BY frequency DESC
        LIMIT 20
      ),
      sentiment_analysis AS (
        SELECT 
          user_id,
          CASE 
            WHEN content ~* '(joy|happy|excellent|great|wonderful|amazing)' THEN 'positive'
            WHEN content ~* '(sad|angry|frustrated|terrible|awful|horrible)' THEN 'negative'
            ELSE 'neutral'
          END as sentiment,
          COUNT(*) as count
        FROM daily_messages
        GROUP BY user_id, sentiment
      ),
      usage_stats AS (
        SELECT 
          user_id,
          COUNT(*) as total_messages,
          SUM(tokens) as total_tokens,
          AVG(length(content)) as avg_message_length,
          mode() WITHIN GROUP (ORDER BY EXTRACT(hour FROM created_at)) as peak_hour
        FROM daily_messages
        GROUP BY user_id
      ),
      semantic_clustering AS (
        SELECT 
          user_id,
          content,
          embedding,
          ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
        FROM daily_messages
        WHERE embedding IS NOT NULL
        LIMIT 100
      )
      SELECT 
        u.user_id,
        $1 as date,
        jsonb_object_agg(t.word, t.frequency) as topics,
        jsonb_build_object(
          'positive', COALESCE(MAX(CASE WHEN s.sentiment = 'positive' THEN s.count END), 0),
          'neutral', COALESCE(MAX(CASE WHEN s.sentiment = 'neutral' THEN s.count END), 0),
          'negative', COALESCE(MAX(CASE WHEN s.sentiment = 'negative' THEN s.count END), 0),
          'overall', CASE 
            WHEN MAX(CASE WHEN s.sentiment = 'positive' THEN s.count END) > MAX(CASE WHEN s.sentiment = 'negative' THEN s.count END) THEN 0.7
            WHEN MAX(CASE WHEN s.sentiment = 'negative' THEN s.count END) > MAX(CASE WHEN s.sentiment = 'positive' THEN s.count END) THEN 0.3
            ELSE 0.5
          END
        ) as sentiment,
        jsonb_build_object(
          'total_messages', us.total_messages,
          'total_tokens', us.total_tokens,
          'avg_message_length', us.avg_message_length,
          'peak_hours', ARRAY[us.peak_hour],
          'personality_distribution', '{}'::jsonb
        ) as usage_stats,
        jsonb_agg(
          jsonb_build_object(
            'cluster_id', 'cluster_' || u.user_id || '_' || sc.rn,
            'representative_text', LEFT(sc.content, 200),
            'frequency', 1,
            'avg_sentiment', 0.5
          )
        ) FILTER (WHERE sc.content IS NOT NULL) as semantic_clusters
      FROM (SELECT DISTINCT user_id FROM daily_messages) u
      LEFT JOIN topic_analysis t ON u.user_id = t.user_id
      LEFT JOIN sentiment_analysis s ON u.user_id = s.user_id
      LEFT JOIN usage_stats us ON u.user_id = us.user_id
      LEFT JOIN semantic_clustering sc ON u.user_id = sc.user_id
      GROUP BY u.user_id, us.total_messages, us.total_tokens, us.avg_message_length, us.peak_hour
    `;

    const result = await this.pgPool.query(query, [date]);
    return result.rows.map(row => ({
      ...row,
      topics: row.topics || {},
      sentiment: row.sentiment || { positive: 0, neutral: 0, negative: 0, overall: 0.5 },
      usage_stats: row.usage_stats || { total_messages: 0, total_tokens: 0, avg_message_length: 0, peak_hours: [], personality_distribution: {} },
      semantic_clusters: row.semantic_clusters || []
    }));
  }

  async storeAnalytics(analytics: AnalyticsAggregate[]): Promise<void> {
    for (const analytic of analytics) {
      await this.supabase
        .from('user_analytics')
        .upsert({
          user_id: analytic.user_id,
          date: analytic.date,
          analytics_data: JSON.stringify(analytic),
          created_at: new Date().toISOString()
        });
    }
  }

  async getAnalyticsForUser(userId: string, date?: string): Promise<AnalyticsAggregate | null> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data } = await this.supabase
      .from('user_analytics')
      .select('analytics_data')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .single();

    return data ? JSON.parse(data.analytics_data) : null;
  }

  async compressAnalytics(analytics: AnalyticsAggregate): Promise<string> {
    const compressed = {
      t: Object.entries(analytics.topics)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
      s: analytics.sentiment.overall.toFixed(2),
      u: {
        m: analytics.usage_stats.total_messages,
        tk: analytics.usage_stats.total_tokens,
        ph: analytics.usage_stats.peak_hours[0] || 0
      },
      c: analytics.semantic_clusters
        .slice(0, 3)
        .map(cluster => cluster.representative_text.substring(0, 100))
    };

    return JSON.stringify(compressed);
  }
}

export const analyticsEngine = new AnalyticsEngine();