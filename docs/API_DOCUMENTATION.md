# AI SaaS MVP - Backend API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL & Environment](#base-url--environment)
4. [API Endpoints](#api-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Webhooks](#webhooks)
8. [SDK Examples](#sdk-examples)
9. [Testing](#testing)
10. [Security](#security)

## Overview

The AI SaaS MVP provides a comprehensive API for AI-powered conversations, function execution, and memory management. The API is built with Next.js 14, TypeScript, and follows RESTful principles with GraphQL-like flexibility.

### Key Features

- **Multi-Provider AI Routing**: Automatic fallback between OpenAI, Anthropic, Perplexity, and OpenRouter
- **Personality System**: 4 distinct AI personalities (Researcher, Visheshagya, Shikshak, Mitra)
- **Function Registry**: Dynamic function discovery and execution
- **Memory Management**: Short-term, long-term, and semantic memory with ChromaDB
- **Real-time Events**: WebSocket support for live updates
- **Security First**: Row-level security, rate limiting, and comprehensive auditing

## Authentication

### JWT Authentication

All API endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "subscription": "pro"
  }
}
```

### API Key Authentication (Alternative)

For server-to-server communication, you can use API keys:

```bash
X-API-Key: <your-api-key>
```

## Base URL & Environment

### Development
```
http://localhost:3000/api
```

### Production
```
https://your-domain.com/api
```

### Staging
```
https://staging.your-domain.com/api
```

## API Endpoints

### 1. Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "company": "Acme Corp"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/auth/login
Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### POST /api/auth/refresh
Refresh expired JWT token.

**Headers:**
```bash
Authorization: Bearer <expired-token>
```

#### POST /api/auth/logout
Logout user and invalidate token.

**Headers:**
```bash
Authorization: Bearer <valid-token>
```

#### GET /api/auth/profile
Get current user profile.

**Headers:**
```bash
Authorization: Bearer <valid-token>
```

### 2. Chat & Conversation Endpoints

#### POST /api/chat/conversation
Start a new conversation or continue existing one.

**Request Body:**
```json
{
  "message": "Hello, I need help with research",
  "personality": "researcher",
  "sessionId": "session-456",
  "context": {
    "topic": "AI research",
    "preferences": {
      "detailLevel": "comprehensive",
      "format": "structured"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "conv-789",
  "response": {
    "message": "Hello! I'm your research assistant. I'd be happy to help you with AI research...",
    "personality": "researcher",
    "confidence": 0.95,
    "suggestions": [
      "Explore recent AI breakthroughs",
      "Analyze current trends",
      "Review academic papers"
    ]
  },
  "metadata": {
    "modelUsed": "gpt-4",
    "provider": "openai",
    "tokensUsed": 150,
    "executionTime": 1200
  }
}
```

#### GET /api/chat/conversations
Get user's conversation history.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `personality`: Filter by personality
- `dateFrom`: Start date (ISO format)
- `dateTo`: End date (ISO format)

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv-789",
      "title": "AI Research Discussion",
      "personality": "researcher",
      "lastMessage": "Let's explore the latest developments...",
      "messageCount": 15,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### GET /api/chat/conversation/:id
Get specific conversation details.

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "conv-789",
    "title": "AI Research Discussion",
    "personality": "researcher",
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "Hello, I need help with research",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "id": "msg-2",
        "role": "assistant",
        "content": "Hello! I'm your research assistant...",
        "timestamp": "2024-01-15T10:30:05Z",
        "personality": "researcher"
      }
    ],
    "metadata": {
      "totalTokens": 450,
      "providersUsed": ["openai"],
      "modelsUsed": ["gpt-4"]
    }
  }
}
```

#### DELETE /api/chat/conversation/:id
Delete a conversation.

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

### 3. Function Execution Endpoints

#### POST /api/functions/execute
Execute a registered function.

**Request Body:**
```json
{
  "functionName": "web_search",
  "parameters": {
    "query": "latest AI research papers 2024",
    "maxResults": 10
  },
  "context": {
    "userId": "user-123",
    "sessionId": "session-456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "results": [
      {
        "title": "Recent Advances in Large Language Models",
        "url": "https://example.com/paper1",
        "snippet": "This paper discusses..."
      }
    ],
    "totalResults": 10,
    "searchTime": 0.8
  },
  "metadata": {
    "executionTime": 1200,
    "functionId": "web_search_v1",
    "version": "1.0.0"
  }
}
```

#### GET /api/functions/list
Get available functions.

**Query Parameters:**
- `category`: Filter by function category
- `search`: Search function names and descriptions

**Response:**
```json
{
  "success": true,
  "functions": [
    {
      "id": "web_search_v1",
      "name": "web_search",
      "description": "Perform web search queries",
      "category": "integration",
      "version": "1.0.0",
      "parameters": {
        "query": {
          "type": "string",
          "required": true,
          "description": "Search query"
        },
        "maxResults": {
          "type": "number",
          "required": false,
          "default": 10,
          "description": "Maximum number of results"
        }
      },
      "returns": {
        "type": "object",
        "description": "Search results with metadata"
      }
    }
  ]
}
```

#### POST /api/functions/register
Register a new function (Admin only).

**Request Body:**
```json
{
  "name": "custom_analysis",
  "description": "Custom data analysis function",
  "category": "analysis",
  "version": "1.0.0",
  "parameters": {
    "data": {
      "type": "object",
      "required": true,
      "description": "Data to analyze"
    }
  },
  "returns": {
    "type": "object",
    "description": "Analysis results"
  },
  "execution": {
    "timeout": 30000,
    "retries": 3,
    "requiresAuth": true,
    "rateLimit": {
      "requestsPerMinute": 100,
      "burstLimit": 20
    }
  }
}
```

### 4. Memory Management Endpoints

#### POST /api/memory/store
Store information in user's memory.

**Request Body:**
```json
{
  "type": "long_term",
  "content": {
    "topic": "AI research interests",
    "details": "User is interested in large language models and their applications"
  },
  "tags": ["ai", "research", "llm"],
  "importance": 8,
  "context": {
    "conversationId": "conv-789",
    "personality": "researcher"
  }
}
```

**Response:**
```json
{
  "success": true,
  "memoryId": "mem-123",
  "storedAt": "2024-01-15T10:30:00Z",
  "embeddingGenerated": true
}
```

#### GET /api/memory/recall
Recall relevant memories based on query.

**Query Parameters:**
- `query`: Search query
- `type`: Memory type filter
- `limit`: Maximum results (default: 10)
- `threshold`: Similarity threshold (default: 0.7)

**Response:**
```json
{
  "success": true,
  "memories": [
    {
      "id": "mem-123",
      "content": {
        "topic": "AI research interests",
        "details": "User is interested in large language models..."
      },
      "type": "long_term",
      "relevance": 0.92,
      "storedAt": "2024-01-15T10:30:00Z",
      "tags": ["ai", "research", "llm"]
    }
  ],
  "totalFound": 1,
  "searchTime": 0.15
}
```

#### DELETE /api/memory/:id
Delete a specific memory.

**Response:**
```json
{
  "success": true,
  "message": "Memory deleted successfully"
}
```

### 5. Personality Management Endpoints

#### GET /api/personalities
Get available personalities and their configurations.

**Response:**
```json
{
  "success": true,
  "personalities": [
    {
      "id": "researcher",
      "name": "Researcher",
      "description": "Analytical and research-focused AI assistant",
      "icon": "🔬",
      "capabilities": [
        "academic_research",
        "data_analysis",
        "literature_review"
      ],
      "defaultModel": "gpt-4",
      "fallbackModels": ["claude-3-sonnet", "gpt-3.5-turbo"],
      "contextWindow": 128000,
      "specializations": ["scientific", "academic", "analytical"]
    },
    {
      "id": "visheshagya",
      "name": "Visheshagya",
      "description": "Spiritual and life guidance AI assistant",
      "icon": "🧘",
      "capabilities": [
        "life_guidance",
        "meditation",
        "philosophy"
      ],
      "defaultModel": "claude-3-opus",
      "fallbackModels": ["claude-3-sonnet", "gpt-4"],
      "contextWindow": 200000,
      "specializations": ["spiritual", "philosophical", "guidance"]
    }
  ]
}
```

#### POST /api/personalities/configure
Configure personality behavior (Admin only).

**Request Body:**
```json
{
  "personalityId": "researcher",
  "config": {
    "defaultModel": "gpt-4-turbo",
    "fallbackChain": ["claude-3-sonnet", "gpt-3.5-turbo"],
    "responseStyle": "academic",
    "citationRequired": true,
    "maxResponseLength": 2000
  }
}
```

### 6. User Management Endpoints

#### GET /api/users/profile
Get user profile and preferences.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "company": "Acme Corp",
    "subscription": {
      "plan": "pro",
      "status": "active",
      "expiresAt": "2024-12-31T23:59:59Z",
      "features": {
        "maxConversations": 1000,
        "maxTokens": 1000000,
        "personalities": ["researcher", "visheshagya", "shikshak", "mitra"],
        "functionCalls": true,
        "memoryStorage": "unlimited"
      }
    },
    "preferences": {
      "defaultPersonality": "researcher",
      "language": "en",
      "timezone": "UTC",
      "notifications": {
        "email": true,
        "push": false
      }
    },
    "usage": {
      "conversationsThisMonth": 45,
      "tokensUsedThisMonth": 150000,
      "functionsCalledThisMonth": 12
    }
  }
}
```

#### PUT /api/users/profile
Update user profile.

**Request Body:**
```json
{
  "name": "John Smith",
  "company": "Tech Corp",
  "preferences": {
    "defaultPersonality": "shikshak",
    "language": "en",
    "notifications": {
      "email": true,
      "push": true
    }
  }
}
```

#### GET /api/users/usage
Get user usage statistics.

**Query Parameters:**
- `period`: Time period (day, week, month, year)
- `startDate`: Start date (ISO format)
- `endDate`: End date (ISO format)

**Response:**
```json
{
  "success": true,
  "usage": {
    "period": "month",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z",
    "conversations": 45,
    "tokensUsed": 150000,
    "functionsCalled": 12,
    "personalitiesUsed": {
      "researcher": 25,
      "visheshagya": 10,
      "shikshak": 8,
      "mitra": 2
    },
    "providersUsed": {
      "openai": 30,
      "anthropic": 10,
      "perplexity": 5
    },
    "costs": {
      "total": 12.50,
      "byProvider": {
        "openai": 8.75,
        "anthropic": 3.25,
        "perplexity": 0.50
      }
    }
  }
}
```

### 7. Analytics & Monitoring Endpoints

#### GET /api/analytics/overview
Get system overview analytics (Admin only).

**Response:**
```json
{
  "success": true,
  "overview": {
    "totalUsers": 1250,
    "activeUsers": 890,
    "totalConversations": 15600,
    "conversationsToday": 450,
    "totalTokens": 45000000,
    "systemHealth": {
      "status": "healthy",
      "uptime": 99.98,
      "responseTime": 1200,
      "errorRate": 0.02
    },
    "providerStatus": {
      "openai": { "status": "healthy", "latency": 800 },
      "anthropic": { "status": "healthy", "latency": 1200 },
      "perplexity": { "status": "degraded", "latency": 2500 }
    }
  }
}
```

#### GET /api/analytics/user/:userId
Get analytics for specific user (Admin only).

**Response:**
```json
{
  "success": true,
  "userAnalytics": {
    "userId": "user-123",
    "registrationDate": "2024-01-01T00:00:00Z",
    "lastActive": "2024-01-15T11:45:00Z",
    "totalConversations": 45,
    "totalTokens": 150000,
    "personalityUsage": {
      "researcher": 25,
      "visheshagya": 10,
      "shikshak": 8,
      "mitra": 2
    },
    "providerUsage": {
      "openai": 30,
      "anthropic": 10,
      "perplexity": 5
    },
    "functionUsage": {
      "web_search": 8,
      "document_analysis": 3,
      "code_generation": 1
    }
  }
}
```

### 8. WebSocket Endpoints

#### WebSocket Connection
Connect to real-time updates:

```javascript
const ws = new WebSocket('wss://your-domain.com/api/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
  
  // Subscribe to conversation updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'conversation:conv-789'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'conversation_update':
      console.log('New message:', data.message);
      break;
    case 'function_execution':
      console.log('Function result:', data.result);
      break;
    case 'memory_update':
      console.log('Memory updated:', data.memory);
      break;
  }
};
```

## Error Handling

### Error Response Format

All API endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req-123"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_FAILED` | 401 | Invalid or expired token |
| `AUTHORIZATION_FAILED` | 403 | Insufficient permissions |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server internal error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Error Handling Best Practices

1. **Always check the `success` field** before processing responses
2. **Handle rate limiting** with exponential backoff
3. **Implement retry logic** for transient errors (5xx status codes)
4. **Log request IDs** for debugging support issues
5. **Validate error responses** before displaying to users

## Rate Limiting

### Rate Limit Headers

All API responses include rate limit information:

```bash
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642233600
X-RateLimit-Window: 900
```

### Rate Limit Tiers

| Plan | Requests per Minute | Burst Limit |
|------|---------------------|-------------|
| Free | 10 | 20 |
| Basic | 100 | 200 |
| Pro | 1000 | 2000 |
| Enterprise | Custom | Custom |

### Rate Limit Handling

```javascript
// Check rate limit headers
const remaining = response.headers.get('X-RateLimit-Remaining');
const resetTime = response.headers.get('X-RateLimit-Reset');

if (remaining === '0') {
  const waitTime = (resetTime * 1000) - Date.now();
  await new Promise(resolve => setTimeout(resolve, waitTime));
}
```

## Webhooks

### Webhook Configuration

Configure webhooks to receive real-time updates:

```json
POST /api/webhooks/configure
{
  "url": "https://your-domain.com/webhook",
  "events": ["conversation.created", "function.executed", "memory.stored"],
  "secret": "webhook-secret-key",
  "headers": {
    "X-Custom-Header": "custom-value"
  }
}
```

### Webhook Payload Format

```json
{
  "event": "conversation.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "conversationId": "conv-789",
    "userId": "user-123",
    "personality": "researcher"
  },
  "signature": "sha256=abc123..."
}
```

### Webhook Verification

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## SDK Examples

### JavaScript/Node.js SDK

```javascript
import { AISaaSClient } from '@ai-saas/sdk';

const client = new AISaaSClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://your-domain.com/api'
});

// Start a conversation
const conversation = await client.chat.startConversation({
  message: 'Hello, I need help with research',
  personality: 'researcher'
});

// Execute a function
const result = await client.functions.execute('web_search', {
  query: 'latest AI research'
});

// Store memory
const memory = await client.memory.store({
  type: 'long_term',
  content: { topic: 'AI research', details: '...' }
});
```

### Python SDK

```python
from ai_saas import AISaaSClient

client = AISaaSClient(
    api_key="your-api-key",
    base_url="https://your-domain.com/api"
)

# Start a conversation
conversation = client.chat.start_conversation(
    message="Hello, I need help with research",
    personality="researcher"
)

# Execute a function
result = client.functions.execute(
    "web_search",
    {"query": "latest AI research"}
)

# Store memory
memory = client.memory.store(
    type="long_term",
    content={"topic": "AI research", "details": "..."}
)
```

### cURL Examples

#### Start Conversation
```bash
curl -X POST https://your-domain.com/api/chat/conversation \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I need help with research",
    "personality": "researcher"
  }'
```

#### Execute Function
```bash
curl -X POST https://your-domain.com/api/functions/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "functionName": "web_search",
    "parameters": {
      "query": "latest AI research papers 2024"
    }
  }'
```

#### Get User Profile
```bash
curl -X GET https://your-domain.com/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Testing

### Test Environment

Use the test environment for development and testing:

```
https://test.your-domain.com/api
```

### Test Credentials

```json
{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "apiKey": "test-api-key-123"
}
```

### Postman Collection

Import the Postman collection for easy API testing:

```
https://your-domain.com/docs/postman-collection.json
```

### Automated Testing

Run the test suite:

```bash
npm run test:api
npm run test:integration
npm run test:e2e
```

## Security

### Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Rate Limiting**: Prevent abuse and ensure fair usage
3. **Input Validation**: Comprehensive parameter validation
4. **SQL Injection Protection**: Parameterized queries only
5. **XSS Prevention**: Input sanitization and output encoding
6. **CORS Configuration**: Restrict cross-origin requests
7. **Audit Logging**: Comprehensive activity logging
8. **Encryption**: All sensitive data encrypted at rest and in transit

### Security Headers

```bash
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

### API Key Security

- API keys are encrypted at rest
- Keys are never logged or exposed in error messages
- Keys can be rotated without service interruption
- Each key has specific permissions and rate limits

### Best Practices

1. **Never expose API keys** in client-side code
2. **Use HTTPS** for all API communications
3. **Implement proper error handling** without information disclosure
4. **Validate all inputs** on both client and server
5. **Monitor API usage** for suspicious activity
6. **Regular security audits** and penetration testing
7. **Keep dependencies updated** to latest secure versions

---

For additional support, contact our developer relations team at `dev-support@your-domain.com` or visit our [Developer Portal](https://developers.your-domain.com).