import { Worksheet } from 'exceljs';

/**
 * Nombres de columnas lógicas que el parser necesita ubicar dentro de la
 * matriz, sin importar el orden real en el Excel. Cada entrada define uno
 * o más fragmentos de texto (normalizados: mayúsculas, sin tildes) que
 * deben aparecer en el encabezado real para hacer match.
 */
const COLUMNAS_ESPERADAS: Record<string, string[]> = {
  numeroTramite: ['NRO. TRAMITE', 'NRO TRAMITE', 'NUMERO DE TRAMITE', 'N° TRAMITE'],
  tipoServicio: ['TIPO DE SERVICIO', 'TIPO SERVICIO'],
  mesAnoServicio: ['MES', 'PERIODO'],
  nombrePaciente: ['NOMBRE DEL PACIENTE', 'NOMBRES Y APELLIDOS', 'PACIENTE'],
  codigoValidacion: ['CODIGO DE VALIDACION', 'COD. VALIDACION'],
  identificacion: ['CEDULA', 'IDENTIFICACION', 'N° CEDULA'],
  cie10: ['CIE10', 'CIE-10', 'CODIGO CIE'],
  honorarioServicioInstitucional: ['HONORARIO / SERVICIO INSTITUCIONAL', 'HONORARIO/SERVICIO INSTITUCIONAL'],
  codigoTpsns: ['CODIGO TPSNS', 'CODIGO TPSNS/AS400', 'CODIGO'],
  descripcion: ['DESCRIPCION'], // ojo: se resuelve por exclusión frente a descripcionMedicamentos abajo
  descripcionMedicamentos: ['DESCRIPCION DE MEDICAMENTOS', 'DESCRIPCION MEDICAMENTOS / INSUMOS'],
  fechaAtencion: ['FECHA DE ATENCION', 'FECHA ATENCION', 'FECHA'],
  cantidad: ['CANTIDAD'],
  valorUnitarioSolicitado: ['VALOR UNITARIO', 'VALOR UNIT'],
  clasificador: ['CLASIFICADOR'],
  porcentajeModificador: ['% MODIFICADOR', 'PORCENTAJE MODIFICADOR', '%MODIF'],
};

export interface MapaColumnas {
  [claveLogica: string]: number; // índice de columna (1-based, como exceljs) o -1 si no se encontró
}

function normalizar(texto: string): string {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .toUpperCase()
    .trim();
}

/**
 * Recorre las primeras `maxFilasBusqueda` filas de la hoja buscando la fila
 * de cabecera: aquella que contenga la mayor cantidad de coincidencias con
 * COLUMNAS_ESPERADAS. Esto evita depender de un número de fila fijo, ya que
 * distintas matrices pueden traer título/logo en filas superiores.
 */
export function detectarFilaCabeceraYMapa(
  worksheet: Worksheet,
  maxFilasBusqueda = 15,
): { filaCabecera: number; mapa: MapaColumnas } {
  let mejorFila = -1;
  let mejorPuntaje = 0;
  let mejorMapa: MapaColumnas = {};

  for (let filaIdx = 1; filaIdx <= maxFilasBusqueda; filaIdx++) {
    const fila = worksheet.getRow(filaIdx);
    const mapaCandidato: MapaColumnas = {};
    let puntaje = 0;

    fila.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const valorNormalizado = normalizar(cell.text || '');
      if (!valorNormalizado) return;

      for (const [claveLogica, fragmentos] of Object.entries(COLUMNAS_ESPERADAS)) {
        if (fragmentos.some((frag) => valorNormalizado.includes(frag))) {
          // "DESCRIPCION" no debe robarle la columna a "DESCRIPCION DE MEDICAMENTOS...";
          // se prioriza el match más específico (más largo) cuando ambos aplican.
          const yaAsignado = mapaCandidato[claveLogica];
          if (yaAsignado === undefined) {
            mapaCandidato[claveLogica] = colNumber;
            puntaje++;
          }
        }
      }
    });

    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejorFila = filaIdx;
      mejorMapa = mapaCandidato;
    }
  }

  if (mejorFila === -1 || mejorPuntaje < 4) {
    throw new Error(
      'No se pudo identificar la fila de cabecera de la matriz. Verifique que el archivo tenga el formato esperado.',
    );
  }

  return { filaCabecera: mejorFila, mapa: mejorMapa };
}
