import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Cache Service — Redis (production) or in-memory Map (development)
 *
 * Usage:
 *   const categories = await cache.getOrSet('categories:all', () => db.findAll(), 300);
 *
 * Environment:
 *   REDIS_URL — full Redis connection string (required for Redis mode)
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis?: Redis;
  private readonly memoryCache = new Map<string, { value: string; expiresAt: number }>();
  private readonly useRedis: boolean;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    this.useRedis = !!redisUrl;

    if (this.useRedis) {
      this.redis = new Redis(redisUrl!, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
        lazyConnect: true,
      });

      this.redis.connect().then(() => {
        this.logger.log('Cache: Redis connected');
      }).catch((err) => {
        this.logger.error(`Cache: Redis connection failed: ${err.message}`);
        (this as any).useRedis = false;
      });
    } else {
      this.logger.warn('Cache: in-memory (set REDIS_URL for Redis)');
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => {});
    }
  }

  /**
   * Get a value, or compute and cache it.
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Get a cached value.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && this.redis) {
        const raw = await this.redis.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      }

      const entry = this.memoryCache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        this.memoryCache.delete(key);
        return null;
      }
      return JSON.parse(entry.value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set a cached value.
   */
  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.useRedis && this.redis) {
      await this.redis.setex(key, ttlSeconds, serialized);
      return;
    }

    this.memoryCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete a cached value (or pattern with wildcard).
   */
  async del(key: string): Promise<void> {
    if (this.useRedis && this.redis) {
      if (key.includes('*')) {
        const keys = await this.redis.keys(key);
        if (keys.length > 0) await this.redis.del(...keys);
      } else {
        await this.redis.del(key);
      }
      return;
    }

    if (key.includes('*')) {
      const prefix = key.replace('*', '');
      for (const k of this.memoryCache.keys()) {
        if (k.startsWith(prefix)) this.memoryCache.delete(k);
      }
    } else {
      this.memoryCache.delete(key);
    }
  }

  /**
   * Flush all cached values.
   */
  async flush(): Promise<void> {
    if (this.useRedis && this.redis) {
      await this.redis.flushdb();
      return;
    }
    this.memoryCache.clear();
  }
}
