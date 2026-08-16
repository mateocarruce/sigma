import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

const config = new DocumentBuilder()
  .setTitle('Sigma Backend API')
  .setDescription('Documentación interactiva para probar los endpoints')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
    const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // origin: true refleja cualquier origen que pida el navegador (incluido
  // file:// y localhost en cualquier puerto). Cómodo para desarrollo local
  // y para el panel.html standalone; para producción hay que volver a
  // restringirlo a FRONTEND_URL.
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`SIGMA backend corriendo en el puerto ${port}`);
}

bootstrap();
