import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
import { DecisionAuditoriaEntity } from './entities/decision-auditoria.entity';
import { DetalleServicio } from '../detalles/entities/detalle-servicio.entity';
import { AuditLog } from '../audit-log/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DecisionAuditoriaEntity, DetalleServicio, AuditLog]),
  ],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
