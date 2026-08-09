export interface FilaRechazada {
  fila: number;
  tramite: string;
  cedula: string;
  codigoOriginal: string;
  tipoItem: 'TPSNS' | 'MEDICAMENTO';
  motivo: string;
}

export interface ResultadoProcesamiento {
  planillaId: number;
  tramitesCreados: number;
  tramitesActualizados: number;
  expedientesCreados: number;
  detallesInsertados: number;
  detallesRechazados: number;
  filasRechazadas: FilaRechazada[];
  valorTotalSolicitado: number;
}
