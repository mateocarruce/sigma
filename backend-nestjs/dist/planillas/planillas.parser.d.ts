export interface RegistroPlanillaCrudo {
    cedula: string;
    codigoCie10: string | null;
    codigoPrestacion: string | null;
    especialidad: string | null;
    descripcion: string | null;
    cantidad: number | null;
    valorFacturado: number;
    fechaAtencion: Date | null;
    tipoServicio: string | null;
    motivoObjecionReal: string | null;
}
export declare function parseArchivoPlanillas(buffer: Buffer, nombreArchivo: string): RegistroPlanillaCrudo[];
