import { Global, Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');

        if (!redisUrl) {
          // Fallback to in-memory cache when Redis is not configured
          return {
            ttl: 60 * 1000, // 60 seconds default TTL
            max: 500, // Max items in cache
          };
        }

        // Redis-backed distributed cache
        return {
          store: require('cache-manager-ioredis-yet'),
          host: new URL(redisUrl).hostname,
          port: parseInt(new URL(redisUrl).port || '6379', 10),
          password: new URL(redisUrl).password || undefined,
          tls: redisUrl.startsWith('rediss://') ? {} : undefined,
          ttl: 60 * 1000,
          max: 1000,
        };
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheConfigModule {}
