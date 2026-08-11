-- =====================================================================
-- MIGRACIÓN: agregar dimensión NIVEL a tarifas
-- =====================================================================
-- Hallazgo: el valor oficial de un código TPSNS depende del nivel de
-- atención (I/II/III) del establecimiento, no solo del código. Tu
-- MATRIZ real tiene una columna "NIVEL" (columna I) que confirma esto
-- por fila, y el catálogo oficial (TPSNS-Revisado_segun_R_O_4928_rev.xlsx)
-- trae un valor distinto por nivel para el mismo código.
--
-- Ejecutar DESPUÉS de 05-migration-resultados-plantillas.sql

-- 1. Quitar el UNIQUE anterior sobre codigo_tpsns solo
ALTER TABLE tarifas DROP CONSTRAINT IF EXISTS tarifas_codigo_tpsns_key;

-- 2. Agregar la columna nivel
ALTER TABLE tarifas ADD COLUMN nivel VARCHAR(10);

-- 3. A los registros existentes del seed (que no tenían nivel) se les
-- asigna 'II' como valor por defecto, para no dejar filas huérfanas.
-- Ajusta/borra estas 2 filas de seed si ya no las necesitas.
UPDATE tarifas SET nivel = 'II' WHERE nivel IS NULL;

ALTER TABLE tarifas ALTER COLUMN nivel SET NOT NULL;

-- 4. Nuevo UNIQUE compuesto: mismo código puede repetirse, pero no con
-- el mismo nivel.
ALTER TABLE tarifas ADD CONSTRAINT tarifas_codigo_nivel_unique UNIQUE (codigo_tpsns, nivel);

CREATE INDEX idx_tarifas_codigo ON tarifas(codigo_tpsns);
