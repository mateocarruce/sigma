import * as ExcelJS from 'exceljs';
import { celdaATextoSeguro } from './celda-texto-seguro';

export type MapaColumnas = Record<string, number>;

interface DefinicionColumna {
  clave: string;
  // Puede haber más de una variante de texto si distintas versiones de la
  // matriz tienen ligeras diferencias de mayúsculas/tildes/espacios.
  encabezadosPosibles: string[];
}

// ═══════════════════════════════════════════════════════════════════
// Verificado contra MATRIZ_FACTURACION_FINAL8_0.xlsm, hoja "MATRIZ",
// fila 8 real (encabezados exactos leídos del archivo):
//
// A='#'  B='NOMBRE PACIENTE BENEFICARIO'  C='CÓDIGO DE VALIDACIÓN'
// D='NRO. DE IDENTIFICACIÓN (CI / PASAPORTE)'  E='CÓDIGO CIE-10' (con salto
// de línea real dentro de la celda)  F='FECHA DE ATENCIÓN ' (con espacio
// final)  G='HONORARIO / SERVICIO INSTITUCIONAL'  H='CODIGO TPSNS'
// I='NIVEL'  J='DESCRIPCIÓN'  K='DESCRIPCION DE MEDICAMENTOS / INSUMOS'
// L='CANTIDAD'  M='VALOR UNITARIO TPSNS'  N='VALOR UNITARIO MEDICAMENTOS
// / INSUMOS'  O='SUBTOTAL'  P='INGRESAR CLASIFICADOR'  Q='MODIFICADOR
// TPSNS'  R='PORCENTAJE MODIFICADOR'  S='VALOR MODIFICADOR' ...
// X='SERVICIO'
//
// OJO: M y N son DOS columnas de valor unitario distintas (TPSNS vs
// medicamentos) — por eso mapeamos 'valorUnitarioTpsns' y
// 'valorUnitarioMedicamento' por separado. procesarFila() debe elegir
// cuál usar según `esMedicamento`, igual que ya hace con 'descripcion'
// vs 'descripcionMedicamentos'. Si tu planillas.service.ts todavía lee
// una sola clave 'valorUnitarioSolicitado', hay que actualizarlo (ver
// el patch adjunto).
// ═══════════════════════════════════════════════════════════════════
const DEFINICIONES: DefinicionColumna[] = [
  { clave: 'numeroTramite', encabezadosPosibles: ['#'] },
  {
    clave: 'nombrePaciente',
    encabezadosPosibles: ['NOMBRE PACIENTE BENEFICARIO', 'NOMBRE PACIENTE BENEFICIARIO'],
  },
  { clave: 'codigoValidacion', encabezadosPosibles: ['CODIGO DE VALIDACION'] },
  {
    clave: 'identificacion',
    encabezadosPosibles: [
      'NRO. DE IDENTIFICACION (CI / PASAPORTE)',
      'NRO DE IDENTIFICACION (CI / PASAPORTE)',
    ],
  },
  { clave: 'cie10', encabezadosPosibles: ['CODIGO CIE-10'] },
  { clave: 'fechaAtencion', encabezadosPosibles: ['FECHA DE ATENCION'] },
  {
    clave: 'honorarioServicioInstitucional',
    encabezadosPosibles: ['HONORARIO / SERVICIO INSTITUCIONAL'],
  },
  { clave: 'codigoTpsns', encabezadosPosibles: ['CODIGO TPSNS'] },
  { clave: 'descripcion', encabezadosPosibles: ['DESCRIPCION'] },
  {
    clave: 'descripcionMedicamentos',
    encabezadosPosibles: ['DESCRIPCION DE MEDICAMENTOS / INSUMOS'],
  },
  { clave: 'cantidad', encabezadosPosibles: ['CANTIDAD'] },
  { clave: 'valorUnitarioTpsns', encabezadosPosibles: ['VALOR UNITARIO TPSNS'] },
  {
    clave: 'valorUnitarioMedicamento',
    encabezadosPosibles: ['VALOR UNITARIO MEDICAMENTOS / INSUMOS'],
  },
  { clave: 'clasificador', encabezadosPosibles: ['INGRESAR CLASIFICADOR'] },
  { clave: 'porcentajeModificador', encabezadosPosibles: ['PORCENTAJE MODIFICADOR'] },
  { clave: 'tipoServicio', encabezadosPosibles: ['SERVICIO'] },
  { clave: 'nivel', encabezadosPosibles: ['NIVEL'] },
];

// Columnas sin las cuales no tiene sentido seguir (mismo criterio que
// validarColumnasMinimas en planillas.service.ts).
const CLAVES_MINIMAS_PARA_DETECTAR_CABECERA = [
  'numeroTramite',
  'identificacion',
  'honorarioServicioInstitucional',
  'codigoTpsns',
];

const MAX_FILAS_A_ESCANEAR = 30;

function normalizar(texto: string): string {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/\s+/g, ' ') // colapsa saltos de línea y espacios múltiples
    .trim()
    .toUpperCase();
}

/**
 * Escanea las primeras filas de la hoja buscando cuál de ellas contiene
 * los encabezados de columna, y construye el mapa clave -> número de
 * columna (1-based, tal como lo espera ExcelJS row.getCell()).
 */
export function detectarFilaCabeceraYMapa(worksheet: ExcelJS.Worksheet): {
  filaCabecera: number;
  mapa: MapaColumnas;
} {
  const limiteFilas = Math.min(MAX_FILAS_A_ESCANEAR, worksheet.rowCount);

  for (let numeroFila = 1; numeroFila <= limiteFilas; numeroFila++) {
    const row = worksheet.getRow(numeroFila);
    const mapa: MapaColumnas = {};

    for (let col = 1; col <= worksheet.columnCount; col++) {
      const valorCelda = normalizar(celdaATextoSeguro(row.getCell(col)));
      if (!valorCelda) continue;

      const definicion = DEFINICIONES.find((d) =>
        d.encabezadosPosibles.some((h) => normalizar(h) === valorCelda),
      );
      if (definicion && mapa[definicion.clave] === undefined) {
        mapa[definicion.clave] = col;
      }
    }

    const tieneMinimas = CLAVES_MINIMAS_PARA_DETECTAR_CABECERA.every(
      (clave) => mapa[clave] !== undefined,
    );
    if (tieneMinimas) {
      return { filaCabecera: numeroFila, mapa };
    }
  }

  throw new Error(
    'No se pudo detectar la fila de cabecera de la MATRIZ: revisa que existan las columnas ' +
      'obligatorias (Trámite "#", Identificación, Honorario/Servicio Institucional, Código TPSNS) ' +
      'con esos nombres exactos.',
  );
}
