import { Module, Global, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Cache Module — Redis (production) or in-memory (development)
 *
 * Global module: available everywhere without explicit import.
 * Uses Redis when REDIS_URL is set, falls back to in-memory Map.
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class AppCacheModule {}
