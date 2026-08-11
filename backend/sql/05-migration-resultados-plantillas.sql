-- =====================================================================
-- MIGRACIÓN: tablas resultados_planilla y plantillas
-- Ejecutar DESPUÉS de 01-schema.sql, 02-migration-fix-check-constraint.sql
-- y 03-migration-add-user-sessions.sql
-- =====================================================================

CREATE TYPE tipo_resultado_enum AS ENUM ('INDIVIDUAL', 'CONSOLIDADA');
CREATE TYPE formato_archivo_enum AS ENUM ('xlsx', 'pdf');
CREATE TYPE tipo_plantilla_enum AS ENUM ('INDIVIDUAL', 'CONSOLIDADA');

CREATE TABLE plantillas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    tipo tipo_plantilla_enum NOT NULL,
    ruta_archivo TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resultados_planilla (
    id SERIAL PRIMARY KEY,
    planilla_id INTEGER NOT NULL REFERENCES planillas(id) ON DELETE CASCADE,
    tipo tipo_resultado_enum NOT NULL,
    servicio VARCHAR(100) NOT NULL,
    tramite VARCHAR(50),
    ruta_archivo TEXT NOT NULL,
    formato formato_archivo_enum NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resultados_planilla_planilla ON resultados_planilla(planilla_id);
CREATE INDEX idx_resultados_planilla_tipo ON resultados_planilla(tipo);
CREATE INDEX idx_plantillas_tipo_activo ON plantillas(tipo, activo);
