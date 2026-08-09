import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanillasController } from './planillas.controller';
import { PlanillasService } from './planillas.service';
import { Planilla } from './entities/planilla.entity';
import { Tramite } from '../tramites/entities/tramite.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { DetalleServicio } from '../detalles/entities/detalle-servicio.entity';
import { Tarifa } from '../tarifas/entities/tarifa.entity';
import { MedicamentoInsumo } from '../medicamentos/entities/medicamento-insumo.entity';
import { DecisionAuditoriaEntity } from '../auditoria/entities/decision-auditoria.entity';
import { AuditLog } from '../audit-log/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Planilla,
      Tramite,
      Expediente,
      DetalleServicio,
      Tarifa,
      MedicamentoInsumo,
      DecisionAuditoriaEntity,
      AuditLog,
    ]),
  ],
  controllers: [PlanillasController],
  providers: [PlanillasService],
  exports: [PlanillasService],
})
export class PlanillasModule {}
