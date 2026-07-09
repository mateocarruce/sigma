import { Usuario } from '../../database/entities/usuario.entity';
export declare enum EstadoLote {
    PROCESANDO = "PROCESANDO",
    VALIDADO = "VALIDADO",
    ERROR = "ERROR"
}
export declare class LoteCarga {
    id: number;
    nombreArchivo: string;
    usuario: Usuario | null;
    totalRegistros: number;
    registrosConError: number;
    estado: EstadoLote;
    cargadoEn: Date;
}
