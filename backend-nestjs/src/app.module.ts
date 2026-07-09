import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { PlanillasModule } from './planillas/planillas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    AuthModule,
    PlanillasModule,
    // Los siguientes módulos se agregan en los próximos pasos:
    // ReglasNegocioModule (extendido con Tarifario), IaClientModule, AuditoriasModule
  ],
})
export class AppModule {}
