-- =====================================================================
-- MIGRACIÓN: tabla de correcciones automáticas (Sprint 2/3 - ML)
-- =====================================================================
-- Cuando el microservicio FastAPI marca una línea con riesgo ALTO o
-- CRITICO y el valor solicitado no coincide con el valor oficial de
-- catálogo, el sistema corrige automáticamente detalles_servicios
-- (valor_unitario_solicitado, subtotal, valor_solicitado quedan con el
-- valor YA corregido). Esta tabla es el rastro de auditoría: de dónde
-- venía el valor antes de la corrección, y por qué se corrigió.
--
-- La corrección NO cambia estado_fila (sigue PENDIENTE): el auditor
-- humano sigue teniendo la última palabra vía POST /auditoria/:id/decidir,
-- solo que ahora revisa un valor ya alineado al catálogo en vez del
-- valor solicitado original con el error.

CREATE TABLE correcciones_automaticas (
    id SERIAL PRIMARY KEY,
    detalle_servicio_id INTEGER NOT NULL REFERENCES detalles_servicios(id) ON DELETE CASCADE,
    valor_unitario_solicitado_anterior NUMERIC(12, 4) NOT NULL,
    valor_unitario_solicitado_corregido NUMERIC(12, 4) NOT NULL,
    subtotal_anterior NUMERIC(12, 2) NOT NULL,
    subtotal_corregido NUMERIC(12, 2) NOT NULL,
    score_riesgo NUMERIC(5, 4) NOT NULL,
    nivel_riesgo VARCHAR(20) NOT NULL,
    motivo TEXT NOT NULL,
    fecha_correccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_correcciones_detalle ON correcciones_automaticas(detalle_servicio_id);
$env:PGPASSWORD = "sigma1319."
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U sigma_user -d sigma_db -f backend\sql\09-migration-correcciones-automaticas.sql