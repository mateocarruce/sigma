import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PlanillasService } from './planillas.service';
export declare class PlanillasController {
    private readonly planillasService;
    constructor(planillasService: PlanillasService);
    cargar(file: Express.Multer.File, user: JwtPayload): Promise<{
        loteId: number;
        totalRegistros: number;
        registrosConError: number;
        estado: import("./entities/lote-carga.entity").EstadoLote.VALIDADO;
    }>;
    listar(loteId?: string): Promise<import("./entities/planilla.entity").Planilla[]>;
}
