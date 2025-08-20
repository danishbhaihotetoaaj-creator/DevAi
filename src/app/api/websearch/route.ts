import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/db/supabase';
import { incrementRateLimit } from '@/lib/db/redis';
import { PerplexityProvider } from '@/lib/providers/perplexity';
import { getProvider } from '@/lib/config/providers';
import { z } from 'zod';

const WebSearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().min(1).max(20).optional(),
  includeDomains: z.array(z.string()).optional(),
  excludeDomains: z.array(z.string()).optional(),
  timeRange: z.enum(['day', 'week', 'month', 'year']).optional(),
  conversationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Rate limiting
    const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `websearch_rate_limit:${clientIp}`;
    const currentCount = await incrementRateLimit(rateLimitKey, 60000); // 1 minute window
    
    if (currentCount > 20) { // 20 web searches per minute
      return NextResponse.json(
        { error: 'Web search rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validationResult = WebSearchRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { query, maxResults, includeDomains, excludeDomains, timeRange, conversationId } = validationResult.data;

    // 3. Authentication
    let user;
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 4. Check if user has web search enabled
    // TODO: Implement plan-based feature checking
    // For now, allow all authenticated users

    // 5. Initialize Perplexity provider
    const perplexityConfig = getProvider('perplexity');
    if (!perplexityConfig) {
      return NextResponse.json(
        { error: 'Web search service unavailable' },
        { status: 503 }
      );
    }

    const perplexityProvider = new PerplexityProvider(perplexityConfig);

    // 6. Perform web search
    const searchResult = await perplexityProvider.searchWeb(query, {
      maxResults: maxResults || 5,
      includeDomains,
      excludeDomains,
      timeRange,
    });

    // 7. Store search results in database (async)
    if (conversationId) {
      // TODO: Store search results for conversation context
      this.storeWebSearchResults(user.id, conversationId, query, searchResult);
    }

    const processingTime = Date.now() - startTime;

    // 8. Return response
    return NextResponse.json({
      success: true,
      data: {
        answer: searchResult.answer,
        searchResults: searchResult.searchResults,
        query,
        usage: searchResult.usage,
      },
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
        requestId: `websearch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: 'perplexity',
        cost: this.calculateCost(searchResult.usage),
      },
    });

  } catch (error) {
    console.error('Web search API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = error.message?.includes('Authentication') ? 401 : 
                      error.message?.includes('Invalid') ? 400 : 500;

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}

// Helper method to store web search results
private async storeWebSearchResults(
  userId: string,
  conversationId: string,
  query: string,
  searchResult: any
): Promise<void> {
  try {
    // TODO: Implement storage in Supabase
    // This would store the search query, results, and usage for analytics
    console.log('Storing web search results:', { userId, conversationId, query });
  } catch (error) {
    console.error('Failed to store web search results:', error);
  }
}

// Helper method to calculate cost
private calculateCost(usage: any): number {
  // TODO: Implement proper cost calculation based on provider rates
  return 0.001; // Placeholder
}

// Health check endpoint
export async function GET() {
  try {
    const perplexityConfig = getProvider('perplexity');
    
    return NextResponse.json({
      success: true,
      message: 'Web search API is healthy',
      timestamp: new Date().toISOString(),
      provider: perplexityConfig ? 'perplexity' : 'unavailable',
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Web search API health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}