import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import AppConfigService from './config.service';
import appConfiguration from './configuration';

@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      isGlobal: true,
      load: [appConfiguration],
      validationSchema: Joi.object({
        APP_ENV: Joi.string().valid('development', 'production', 'test', 'provision').default('development'),
        RE_API_APP_HOST: Joi.string().default('localhost'),
        RE_API_APP_PORT: Joi.number().default(3000),
        RE_API_APP_NAME: Joi.string().required(),
        RE_API_APP_SECRET_ROOT_PASSWORD: Joi.string().required(),
      }),
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
