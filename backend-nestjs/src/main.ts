import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Validación automática de DTOs (LoginDto, y los que vienen en próximos módulos)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta propiedades no declaradas en el DTO
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true, // se restringirá al dominio del frontend en producción
    credentials: true,
  });

  const port = config.get<number>('port', 3000);
  await app.listen(port);
  console.log(`Backend corriendo en http://localhost:${port}`);
}

bootstrap();
