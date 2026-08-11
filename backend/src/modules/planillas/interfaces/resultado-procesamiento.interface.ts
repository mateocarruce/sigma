export interface FilaRechazada {
  fila: number;
  tramite: string;
  cedula: string;
  codigoOriginal: string;
  tipoItem: 'TPSNS' | 'MEDICAMENTO';
  motivo: string;
}

// Insumo/medicamento que se insertó como PENDIENTE porque no hay catálogo
// AS-400 disponible para validarlo automáticamente (no es un rechazo).
export interface FilaSinCatalogo {
  fila: number;
  tramite: string;
  cedula: string;
  codigoOriginal: string;
  descripcion: string;
}

export interface ResultadoProcesamiento {
  planillaId: number;
  tramitesCreados: number;
  tramitesActualizados: number;
  expedientesCreados: number;
  detallesInsertados: number;
  detallesRechazados: number;
  // Nuevo: insumos/medicamentos insertados como PENDIENTE por falta de
  // catálogo AS-400 (subconjunto de detallesInsertados, no de rechazados).
  detallesSinCatalogo: number;
  filasRechazadas: FilaRechazada[];
  filasSinCatalogo: FilaSinCatalogo[];
  valorTotalSolicitado: number;
}
