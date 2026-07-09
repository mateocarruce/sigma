import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { EstadoLote, LoteCarga } from './entities/lote-carga.entity';
import { Paciente } from './entities/paciente.entity';
import { Planilla } from './entities/planilla.entity';
export declare class PlanillasService {
    private readonly planillasRepo;
    private readonly pacientesRepo;
    private readonly lotesRepo;
    private readonly config;
    constructor(planillasRepo: Repository<Planilla>, pacientesRepo: Repository<Paciente>, lotesRepo: Repository<LoteCarga>, config: ConfigService);
    cargarArchivo(file: Express.Multer.File, usuarioId: number): Promise<{
        loteId: number;
        totalRegistros: number;
        registrosConError: number;
        estado: EstadoLote.VALIDADO;
    }>;
    private procesarRegistro;
    private validarExtension;
    listar(loteId?: number): Promise<Planilla[]>;
}
