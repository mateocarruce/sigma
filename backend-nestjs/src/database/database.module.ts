import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host', 'localhost'),
        port: config.get<number>('database.port', 5432),
        username: config.get<string>('database.user', 'hospital_admin'),
        password: config.get<string>('database.password', 'changeme_en_env'),
        database: config.get<string>('database.name', 'glosas_db'),
        // Autodescubre todas las entidades *.entity.ts de CUALQUIER módulo del proyecto
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        // IMPORTANTE: en producción esto debe ser false; la creación/cambio
        // de tablas se hace vía migraciones SQL versionadas (db/init, db/migrations),
        // nunca dejando que TypeORM sincronice el esquema automáticamente.
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
