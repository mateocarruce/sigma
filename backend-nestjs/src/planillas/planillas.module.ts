import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoteCarga } from './entities/lote-carga.entity';
import { Paciente } from './entities/paciente.entity';
import { Planilla } from './entities/planilla.entity';
import { PlanillasController } from './planillas.controller';
import { PlanillasService } from './planillas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Planilla, Paciente, LoteCarga])],
  controllers: [PlanillasController],
  providers: [PlanillasService],
  exports: [PlanillasService],
})
export class PlanillasModule {}
