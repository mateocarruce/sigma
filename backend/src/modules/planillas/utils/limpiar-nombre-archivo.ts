// Equivalente TypeScript de la función LimpiarNombreArchivo() del VBA:
// reemplaza caracteres inválidos para nombres de archivo/carpeta en Windows.
export function limpiarNombreArchivo(texto: string): string {
  return texto.replace(/[/\\:*?"<>|]/g, '_').trim();
}
