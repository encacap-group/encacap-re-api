import { ShopifyConfigModule } from '@configs/shopify/shopify-config.module';
import { CacheModule } from '@modules/cache/cache.module';
import { HomeModule } from '@modules/home/home.module';
import { PermissionModule } from '@modules/permission/permission.module';
import { ShopifyModule } from '@modules/shopify/shopify.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { AlgoliaConfigModule } from './configs/algolia/algolia-config.module';
import { AppConfigModule } from './configs/app/config.module';
import { CloudflareConfigModule } from './configs/cloudflare/cloudflare-config.module';
import { GHNConfigModule } from './configs/ghn/ghn-config.module';
import { JwtConfigModule } from './configs/jwt/jwt-config.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtStrategy } from './modules/auth/strategies/jwt.strategy';
import { CategoryModule } from './modules/category/category.module';
import { ConfigModule } from './modules/configs/config.module';
import { ContactModule } from './modules/contact/contact.module';
import { EstateModule } from './modules/estate/estate.module';
import { CloudflareModule } from './modules/image/cloudflare.module';
import { LocationModule } from './modules/location/location.module';
import { PostModule } from './modules/post/post.module';
import { TokenModule } from './modules/token/token.module';
import { UnitPriceModule } from './modules/unit-price/unit-price.module';
import { UserModule } from './modules/user/user.module';
import { WebsiteModule } from './modules/website/website.module';
import { BullProviderModule } from './providers/bull/bull.module';
import { MemCachingProviderModule } from './providers/mem-caching/mem-caching.module';
import { PostgresDatabaseProviderModule } from './providers/postgres/postgres.module';

@Module({
  imports: [
    AppConfigModule,
    JwtConfigModule,
    CloudflareConfigModule,
    AlgoliaConfigModule,
    GHNConfigModule,
    ShopifyConfigModule,

    PostgresDatabaseProviderModule,
    MemCachingProviderModule,
    BullProviderModule,

    CacheModule,
    WebsiteModule,
    UserModule,
    AuthModule,
    TokenModule,
    ContactModule,
    CloudflareModule,
    CategoryModule,
    LocationModule,
    EstateModule,
    UnitPriceModule,
    ConfigModule,
    PostModule,
    HomeModule,
    ShopifyModule,
    PermissionModule,
  ],
  controllers: [],
  providers: [JwtStrategy, JwtService],
  exports: [JwtStrategy, JwtService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
