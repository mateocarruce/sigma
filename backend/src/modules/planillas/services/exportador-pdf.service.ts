import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// pdfmake no exporta un `default` real (es un módulo CommonJS puro), así
// que `import PdfPrinter from 'pdfmake'` con esModuleInterop arma un
// wrapper roto (`pdfmake_1.default is not a constructor`). Se usa
// require() directo, que es como la propia documentación de pdfmake
// recomienda usarlo en Node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter: new (fonts: Record<string, unknown>) => any = require('pdfmake');

// Fuentes estándar de pdfmake. Si tu servidor no tiene estas fuentes del
// sistema, pdfmake trae sus propias Helvetica/Times por defecto vía
// vfs_fonts — si usas TTF personalizadas, ajusta este mapeo con las rutas
// reales de los .ttf.
const FUENTES = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

export interface ColumnaPdf {
  titulo: string;
  ancho?: string | number; // ej. '*', 'auto', 60
}

export interface TablaPdf {
  columnas: ColumnaPdf[];
  filas: (string | number)[][];
}

@Injectable()
export class ExportadorPdfService {
  private readonly logger = new Logger(ExportadorPdfService.name);
  private readonly printer = new PdfPrinter(FUENTES);

  /**
   * Genera un PDF simple: título + tabla, en diseño similar a la planilla
   * Excel (bordes finos, encabezado en negrita). No replica el layout
   * exacto de la plantilla .xlsx (mismas celdas), sino un reporte tabular
   * equivalente en contenido.
   */
  async generarPDF(
    tabla: TablaPdf,
    titulo: string,
    subtitulos: string[] = [],
  ): Promise<Buffer> {
    const encabezado = tabla.columnas.map((c) => ({
      text: c.titulo,
      bold: true,
      fillColor: '#d9e2f3',
    }));

    const filasCuerpo = tabla.filas.map((fila) => fila.map((valor) => String(valor ?? '')));

    const docDefinition: any = {
      pageOrientation: 'landscape',
      pageMargins: [30, 40, 30, 30],
      content: [
        { text: titulo, style: 'titulo' },
        ...subtitulos.map((s) => ({ text: s, style: 'subtitulo' })),
        { text: ' ', margin: [0, 4] },
        {
          table: {
            headerRows: 1,
            widths: tabla.columnas.map((c) => c.ancho ?? '*'),
            body: [encabezado, ...filasCuerpo],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#999999',
            vLineColor: () => '#999999',
          },
        },
      ],
      styles: {
        titulo: { fontSize: 14, bold: true, margin: [0, 0, 0, 4] },
        subtitulo: { fontSize: 10, margin: [0, 0, 0, 2] },
      },
      defaultStyle: { font: 'Helvetica', fontSize: 8 },
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', (err: Error) => reject(err));
        pdfDoc.end();
      } catch (error) {
        this.logger.error(`Error generando PDF: ${(error as Error).message}`);
        reject(new InternalServerErrorException('No se pudo generar el PDF'));
      }
    });
  }

  guardarBuffer(buffer: Buffer, nombreArchivo: string, carpetaDestinoAbsoluta: string): string {
    fs.mkdirSync(carpetaDestinoAbsoluta, { recursive: true });
    const rutaCompleta = path.join(carpetaDestinoAbsoluta, nombreArchivo);
    fs.writeFileSync(rutaCompleta, buffer);
    return rutaCompleta;
  }
}
