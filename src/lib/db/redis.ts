import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
      socket: {
        connectTimeout: 10000,
        lazyConnect: true,
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis Client Ready');
    });

    await redisClient.connect();
  }

  return redisClient;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Cache helpers
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
  try {
    const client = await getRedisClient();
    const serialized = JSON.stringify(value);
    if (ttl) {
      await client.setEx(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

export async function clearCachePattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error('Redis clear pattern error:', error);
  }
}

// Rate limiting helpers
export async function incrementRateLimit(key: string, windowMs: number): Promise<number> {
  try {
    const client = await getRedisClient();
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;
    
    const count = await client.incr(windowKey);
    await client.expire(windowKey, Math.ceil(windowMs / 1000));
    
    return count;
  } catch (error) {
    console.error('Redis rate limit error:', error);
    return 0;
  }
}

export async function getRateLimit(key: string, windowMs: number): Promise<number> {
  try {
    const client = await getRedisClient();
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;
    
    const count = await client.get(windowKey);
    return count ? parseInt(count) : 0;
  } catch (error) {
    console.error('Redis rate limit get error:', error);
    return 0;
  }
}

// Circuit breaker helpers
export async function getCircuitBreakerState(key: string): Promise<{
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}> {
  try {
    const client = await getRedisClient();
    const state = await client.hGetAll(`circuit:${key}`);
    
    return {
      status: (state.status as 'closed' | 'open' | 'half-open') || 'closed',
      failureCount: parseInt(state.failureCount || '0'),
      lastFailureTime: state.lastFailureTime ? parseInt(state.lastFailureTime) : undefined,
      nextAttemptTime: state.nextAttemptTime ? parseInt(state.nextAttemptTime) : undefined,
    };
  } catch (error) {
    console.error('Redis circuit breaker get error:', error);
    return { status: 'closed', failureCount: 0 };
  }
}

export async function updateCircuitBreakerState(
  key: string,
  state: {
    status: 'closed' | 'open' | 'half-open';
    failureCount: number;
    lastFailureTime?: number;
    nextAttemptTime?: number;
  }
): Promise<void> {
  try {
    const client = await getRedisClient();
    const circuitKey = `circuit:${key}`;
    
    await client.hSet(circuitKey, {
      status: state.status,
      failureCount: state.failureCount.toString(),
      ...(state.lastFailureTime && { lastFailureTime: state.lastFailureTime.toString() }),
      ...(state.nextAttemptTime && { nextAttemptTime: state.nextAttemptTime.toString() }),
    });
    
    // Set TTL for circuit breaker state (24 hours)
    await client.expire(circuitKey, 24 * 60 * 60);
  } catch (error) {
    console.error('Redis circuit breaker update error:', error);
  }
}

// Queue helpers
export async function enqueueJob(queueName: string, jobData: any): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.lPush(`queue:${queueName}`, JSON.stringify(jobData));
  } catch (error) {
    console.error('Redis enqueue error:', error);
  }
}

export async function dequeueJob(queueName: string): Promise<any | null> {
  try {
    const client = await getRedisClient();
    const job = await client.rPop(`queue:${queueName}`);
    return job ? JSON.parse(job) : null;
  } catch (error) {
    console.error('Redis dequeue error:', error);
    return null;
  }
}

export async function getQueueLength(queueName: string): Promise<number> {
  try {
    const client = await getRedisClient();
    return await client.lLen(`queue:${queueName}`);
  } catch (error) {
    console.error('Redis queue length error:', error);
    return 0;
  }
}