import { createHash } from 'crypto';

/**
 * Genera el mismo hash que el ETL de Python (hashlib.sha256(f"{salt}:{cedula}")),
 * para que un paciente cargado por cualquiera de las dos vías (ETL o API)
 * quede identificado de forma consistente sin exponer su cédula real.
 */
export function hashIdentificador(cedula: string, salt: string): string {
  const valor = `${salt}:${String(cedula).trim()}`;
  return createHash('sha256').update(valor, 'utf-8').digest('hex');
}
