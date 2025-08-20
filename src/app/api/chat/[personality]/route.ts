import { NextRequest, NextResponse } from 'next/server';
import { MessageRouter } from '@/lib/router/routeMessage';
import { getAuthenticatedUser } from '@/lib/db/supabase';
import { incrementRateLimit } from '@/lib/db/redis';
import { getPersonality } from '@/lib/config/personalities';
import { z } from 'zod';

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'document', 'audio', 'video']),
    url: z.string().url(),
    filename: z.string(),
    size: z.number().max(100 * 1024 * 1024), // 100MB max
    mimeType: z.string(),
  })).optional(),
  clientContext: z.object({
    task: z.string().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(8000).optional(),
  }).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { personality: string } }
) {
  const startTime = Date.now();

  try {
    // 1. Rate limiting
    const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `rate_limit:${clientIp}`;
    const currentCount = await incrementRateLimit(rateLimitKey, 60000); // 1 minute window
    
    if (currentCount > 100) { // 100 requests per minute
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // 2. Validate personality
    const personality = getPersonality(params.personality);
    if (!personality) {
      return NextResponse.json(
        { error: 'Invalid personality' },
        { status: 400 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const validationResult = ChatRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { message, conversationId, attachments, clientContext } = validationResult.data;

    // 4. Authentication
    let user;
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 5. Validate file attachments if any
    if (attachments && attachments.length > 0) {
      // TODO: Implement file validation and processing
      // For now, just check basic constraints
      const totalSize = attachments.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 100 * 1024 * 1024) { // 100MB total limit
        return NextResponse.json(
          { error: 'Total file size exceeds limit' },
          { status: 400 }
        );
      }
    }

    // 6. Route message through the router
    const router = new MessageRouter();
    const response = await router.routeMessage({
      userId: user.id,
      personalityId: params.personality,
      message,
      conversationId,
      attachments,
      clientContext,
    });

    const processingTime = Date.now() - startTime;

    // 7. Return response with metadata
    return NextResponse.json({
      success: true,
      data: {
        message: response.message,
        conversationId: response.conversationId,
        messageId: response.messageId,
        insights: response.insights,
      },
      metadata: {
        ...response.metadata,
        processingTime,
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
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

// Health check endpoint
export async function GET() {
  try {
    const router = new MessageRouter();
    
    return NextResponse.json({
      success: true,
      message: 'Chat API is healthy',
      timestamp: new Date().toISOString(),
      personalities: ['researcher', 'visheshagya', 'shikshak', 'mitra'],
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'API health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}