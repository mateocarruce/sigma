import { LoteCarga } from './lote-carga.entity';
import { Paciente } from './paciente.entity';
export declare enum ReglasEstado {
    OK = "OK",
    ADVERTENCIA = "ADVERTENCIA",
    ERROR_CRITICO = "ERROR_CRITICO"
}
export declare enum EstadoPlanilla {
    CARGADA = "CARGADA",
    PRE_VALIDADA = "PRE_VALIDADA",
    AUDITADA = "AUDITADA",
    ENVIADA = "ENVIADA"
}
export declare class Planilla {
    id: number;
    lote: LoteCarga;
    paciente: Paciente;
    numeroFactura: string;
    codigoCie10: string | null;
    codigoPrestacion: string | null;
    especialidad: string | null;
    valorFacturado: number;
    valorUnitario: number | null;
    cantidad: number | null;
    fechaAtencion: Date | null;
    tipoSeguro: string | null;
    reglasEstado: ReglasEstado;
    reglasDetalle: string[] | null;
    estadoPlanilla: EstadoPlanilla;
    motivoObjecionReal: string | null;
    creadoEn: Date;
}
