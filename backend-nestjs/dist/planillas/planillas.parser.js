"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArchivoPlanillas = parseArchivoPlanillas;
const XLSX = require("xlsx");
function parseArchivoPlanillas(buffer, nombreArchivo) {
    const esCsv = nombreArchivo.toLowerCase().endsWith('.csv');
    const workbook = esCsv
        ? XLSX.read(buffer.toString('utf-8'), { type: 'string' })
        : XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const nombreHoja = workbook.SheetNames.includes('MATRIZ')
        ? 'MATRIZ'
        : workbook.SheetNames[0];
    const hoja = workbook.Sheets[nombreHoja];
    const filas = XLSX.utils.sheet_to_json(hoja, {
        header: 1,
        range: 8,
        defval: null,
        blankrows: false,
    });
    const registros = [];
    for (const fila of filas) {
        const cedula = fila[3];
        const servicio = fila[23];
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
//# sourceMappingURL=planillas.parser.js.map