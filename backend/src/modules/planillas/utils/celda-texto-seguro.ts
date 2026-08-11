import * as ExcelJS from 'exceljs';

/**
 * Lee el texto de una celda de forma DEFENSIVA. exceljs puede lanzar un
 * error interno (ej. "Cannot read properties of null (reading 'toString')")
 * cuando una celda contiene una fórmula sin resultado calculado en caché
 * (común en archivos con fórmulas precargadas en filas sin datos reales
 * todavía, o guardados sin recalcular). En ese caso, tratamos la celda
 * como vacía en vez de tumbar todo el procesamiento.
 */
export function celdaATextoSeguro(cell: ExcelJS.Cell | undefined): string {
  if (!cell) return '';
  try {
    const texto = cell.text;
    return (texto ?? '').toString().trim();
  } catch {
    return '';
  }
}
