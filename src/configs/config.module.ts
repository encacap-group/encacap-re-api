import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import AppConfigService from './config.service';
import appConfiguration from './configuration';

@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: ['.env.development', '.env.production'],
      isGlobal: true,
      load: [appConfiguration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test', 'provision').default('development'),
        DB_TYPE: Joi.string().required().valid('postgres').default('postgres'),
        DB_HOST: Joi.string().required().default('localhost'),
        DB_PORT: Joi.number().required().default(5432),
        DB_USERNAME: Joi.string().required().default('postgres'),
        DB_PASSWORD: Joi.string().required().default('postgres'),
        DB_NAME: Joi.string().required().default('postgres'),
      }),
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}