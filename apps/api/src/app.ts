import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainErrorFilter } from './domain-error.filter';
import type { AppConfig } from './config';
export async function createApp(options: Partial<AppConfig> = {}) {
  const app = await NestFactory.create(AppModule.configure(options), { logger: ['error','warn'] });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new DomainErrorFilter());
  app.enableShutdownHooks();
  return app;
}

