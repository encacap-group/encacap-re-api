import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { redisStore } from 'cache-manager-ioredis-yet';
import { RedisOptions } from 'ioredis';
import { DatabaseConfigModule } from 'src/configs/database/database-config.module';
import DatabaseConfigService from 'src/configs/database/database-config.service';
import { MemCachingService } from './mem-caching.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync<RedisOptions>({
      imports: [DatabaseConfigModule],
      inject: [DatabaseConfigService],
      useFactory: async ({ redis }: DatabaseConfigService) => {
        const store = await redisStore(redis);

        return {
          isGlobal: true,
          store,
        };
      },
    }),
  ],
  providers: [MemCachingService],
  exports: [MemCachingService, CacheModule],
})
export class MemCachingProviderModule {}
