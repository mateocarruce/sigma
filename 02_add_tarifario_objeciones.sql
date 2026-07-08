-- ============================================================
-- MIGRACIÓN 02: Tarifario Nacional + Catálogo de Motivos de Objeción
-- Fuente: hoja "AYUDANTIA > 2023" del archivo MATRIZ_FACTURACION_FINAL8_0.xlsm
-- ============================================================

-- Tarifario Nacional de Prestaciones de Salud (SPRO)
-- Sirve para que el motor de reglas valide: ¿el código facturado existe?
-- ¿el valor unitario coincide con el oficial?
CREATE TABLE tarifario_nacional (
    id                      SERIAL PRIMARY KEY,
    especialidad            VARCHAR(150) NOT NULL,   -- ej. 'ANESTESIOLOGO', 'SERVICIO INSTITUCIONAL'
    nivel                   VARCHAR(10),              -- 'I', 'II', 'III'
    codigo_prestacion       VARCHAR(30) NOT NULL,     -- código TPSNS/CUP
    descripcion             TEXT NOT NULL,
    valor_unitario_oficial  NUMERIC(12,2) NOT NULL DEFAULT 0,
    vigente                 BOOLEAN DEFAULT TRUE,
    cargado_en              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (especialidad, nivel, codigo_prestacion)
);

CREATE INDEX idx_tarifario_codigo ON tarifario_nacional(codigo_prestacion);

-- Catálogo oficial de Motivos de Objeción (glosas)
-- Este es el conjunto de ETIQUETAS que el modelo de IA deberá aprender a predecir.
-- categoria agrupa el tipo de objeción según el proceso de auditoría del MSP/SPPAT.
CREATE TABLE catalogo_motivos_objecion (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(20) UNIQUE NOT NULL,   -- 'CMT.1', 'LQD.2', 'REV.5', '0' = SIN OBJECIÓN
    descripcion     TEXT NOT NULL,
    categoria       VARCHAR(60) NOT NULL           -- PERTINENCIA_MEDICA | CONTROL_TARIFAS | REVISION_DOCUMENTAL
);

CREATE INDEX idx_motivos_categoria ON catalogo_motivos_objecion(categoria);

-- ============================================================
-- Ajuste a la tabla `planillas` (definida en 01_init.sql):
-- agregamos referencia opcional al código de prestación del Tarifario
-- y al motivo de objeción real (ground truth), cuando se conozca
-- por auditoría histórica del MSP/SPPAT.
-- ============================================================
ALTER TABLE planillas
    ADD COLUMN IF NOT EXISTS especialidad         VARCHAR(150),
    ADD COLUMN IF NOT EXISTS valor_unitario       NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS cantidad             NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS motivo_objecion_real  VARCHAR(20) REFERENCES catalogo_motivos_objecion(codigo);

-- Nota: `codigo_cie10` en planillas queda como VARCHAR simple (sin FK estricta)
-- porque este archivo no trae el catálogo CIE-10 completo (solo códigos sueltos
-- como S720, M621). El catálogo oficial CIE-10 del MSP (~14,000 códigos) se
-- cargará en una migración posterior cuando lo tengamos disponible.
