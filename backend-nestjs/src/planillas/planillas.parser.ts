import * as XLSX from 'xlsx';

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

/**
 * Misma convención de columnas que scripts-etl/etl_load_xlsm.py (parse_matriz):
 * encabezados en la fila 8, datos desde la fila 9.
 * Índices (0-based) dentro de cada fila:
 *  0:#  1:nombre  2:cod_validacion  3:cedula  4:cie10  5:fecha  6:especialidad
 *  7:cod_tpsns  8:nivel  9:descripcion 10:desc_medicamento 11:cantidad
 *  12:valor_unit_tpsns 13:valor_unit_medic 14:subtotal ... 22:valor_solicitado
 *  23:servicio  24:motivo_objecion_real (ground truth, si existe)
 */
export function parseArchivoPlanillas(
  buffer: Buffer,
  nombreArchivo: string,
): RegistroPlanillaCrudo[] {
  const esCsv = nombreArchivo.toLowerCase().endsWith('.csv');

  const workbook = esCsv
    ? XLSX.read(buffer.toString('utf-8'), { type: 'string' })
    : XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const nombreHoja = workbook.SheetNames.includes('MATRIZ')
    ? 'MATRIZ'
    : workbook.SheetNames[0];
  const hoja = workbook.Sheets[nombreHoja];

  // range: 8 -> omite las filas 1-8 (encabezados/plantilla), empieza a leer en la fila 9
  const filas: any[][] = XLSX.utils.sheet_to_json(hoja, {
    header: 1,
    range: 8,
    defval: null,
    blankrows: false,
  });

  const registros: RegistroPlanillaCrudo[] = [];

  for (const fila of filas) {
    const cedula = fila[3];
    const servicio = fila[23];

    // Filas de encabezado/firma sin datos de facturación real
    if (cedula === null || cedula === undefined || !servicio) {
      continue;
    }

    const valorSolicitado = fila[22];
    const cantidad = fila[11];

    registros.push({
      cedula: String(cedula).trim(),
      codigoCie10: fila[4] ? String(fila[4]).trim() : null,
      codigoPrestacion: fila[7] ? String(fila[7]).trim() : null,
      especialidad: fila[6] ? String(fila[6]).trim() : null,
      descripcion: fila[9] ? String(fila[9]).trim() : null,
      cantidad: typeof cantidad === 'number' ? cantidad : null,
      valorFacturado: typeof valorSolicitado === 'number' ? valorSolicitado : 0,
      fechaAtencion: fila[5] instanceof Date ? fila[5] : null,
      tipoServicio: String(servicio).trim(),
      motivoObjecionReal: fila[24] ? String(fila[24]).trim() : null,
    });
  }

  return registros;
}
