import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// IDs BIGINT do PostgreSQL precisam ser convertidos para JSON no HTTP.
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(
    Number(process.env.PORT ?? 3001),
    process.env.HOST ?? '127.0.0.1',
  );
}

void bootstrap();
