import { Logger, UnprocessableEntityException, ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import { AllExceptionFilter } from './common/filters/all-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import AppConfigService from './configs/app/config.service';

const bootstrap = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const httpAdapter = app.get(HttpAdapterHost);
  const configService = app.get(AppConfigService);
  const loggerService = new Logger('NestApplication');

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.enableCors({
    origin: (_, callback) => callback(null, true),
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionFilter(httpAdapter));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      exceptionFactory(errors) {
        const errorField = errors.reduce((errorField, error) => {
          const { property, constraints } = error;
          const errorMessages = Object.values(constraints ?? {});

          return {
            ...errorField,
            [property]: errorMessages,
          };
        }, {});

        return new UnprocessableEntityException(errorField);
      },
      forbidUnknownValues: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Versioning
  app.enableVersioning({
    defaultVersion: '1',
    type: VersioningType.URI,
  });

  await app.listen(configService.port, configService.host);
  loggerService.debug(`Application is running on: ${await app.getUrl()}`);
};

// skipcq: JS-0328
bootstrap();
