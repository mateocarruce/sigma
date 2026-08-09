-- =====================================================================
-- SISTEMA SIGMA - MODELO DE DATOS v2.2 (CON VALIDACIÓN FLEXIBLE)
-- Ejecutar PRIMERO, antes de 02-migration-fix-check-constraint.sql
-- =====================================================================

-- 1. ENUMS
-- =====================================================================
CREATE TYPE user_role_enum AS ENUM ('DIGITADOR', 'ADMIN', 'AUDITOR');
CREATE TYPE planilla_estado_enum AS ENUM ('SUBIDA', 'PROCESANDO', 'COMPLETADA', 'ERROR');
CREATE TYPE audit_action_enum AS ENUM ('LOGIN', 'LOGOUT', 'UPLOAD', 'PROCESS', 'DELETE', 'DOWNLOAD', 'AUDITAR', 'FACTURAR');
CREATE TYPE estado_fila_enum AS ENUM ('PENDIENTE', 'AUDITADO', 'RECHAZADO', 'FACTURADO');
CREATE TYPE decision_auditoria_enum AS ENUM ('APROBADO', 'RECHAZADO', 'PARCIAL');
CREATE TYPE estado_pago_enum AS ENUM ('PENDIENTE', 'PAGADO', 'ANULADO');
CREATE TYPE nivel_riesgo_enum AS ENUM ('BAJO', 'MEDIO', 'ALTO', 'CRITICO');

-- 2. USERS
-- =====================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol user_role_enum NOT NULL DEFAULT 'DIGITADOR',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TARIFAS (TPSNS)
-- =====================================================================
CREATE TABLE tarifas (
    id SERIAL PRIMARY KEY,
    codigo_tpsns VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT NOT NULL,
    valor_oficial NUMERIC(12, 4) NOT NULL,
    fecha_vigencia_desde DATE NOT NULL,
    fecha_vigencia_hasta DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. MEDICAMENTOS_INSUMOS (AS-400 / CNMB)
-- =====================================================================
CREATE TABLE medicamentos_insumos (
    id SERIAL PRIMARY KEY,
    codigo_as400 VARCHAR(20) UNIQUE NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('MEDICAMENTO', 'INSUMO')),
    precio_oficial NUMERIC(12, 4) NOT NULL,
    unidad_medida VARCHAR(20),
    fecha_vigencia_desde DATE NOT NULL,
    fecha_vigencia_hasta DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. PLANILLAS (con Firmas de Revisado/Aprobado)
-- =====================================================================
CREATE TABLE planillas (
    id SERIAL PRIMARY KEY,
    nombre_archivo VARCHAR(255) NOT NULL,
    minio_path TEXT NOT NULL,
    hash_sha256 VARCHAR(64) UNIQUE NOT NULL,
    hospital VARCHAR(150) NOT NULL,
    periodo VARCHAR(20) NOT NULL,
    subido_por INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    estado planilla_estado_enum DEFAULT 'SUBIDA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revisado_nombre VARCHAR(200),
    revisado_identificacion VARCHAR(20),
    revisado_cargo VARCHAR(100) DEFAULT 'ANALISTA - FACTURACIÓN',
    revisado_sello BOOLEAN DEFAULT FALSE,
    aprobado_nombre VARCHAR(200),
    aprobado_identificacion VARCHAR(20),
    aprobado_cargo VARCHAR(100) DEFAULT 'DIRECTOR ADMINISTRATIVO',
    aprobado_sello BOOLEAN DEFAULT FALSE,
    fecha_emision_reporte DATE
);

-- 6. TRAMITES
-- =====================================================================
CREATE TABLE tramites (
    id SERIAL PRIMARY KEY,
    numero_tramite VARCHAR(50) UNIQUE NOT NULL,
    tipo_servicio VARCHAR(100) NOT NULL,
    mes_ano_servicio DATE NOT NULL,
    cantidad_expedientes INTEGER DEFAULT 0,
    valor_solicitado_total NUMERIC(12, 2) DEFAULT 0,
    planilla_id INTEGER REFERENCES planillas(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. EXPEDIENTES
-- =====================================================================
CREATE TABLE expedientes (
    id SERIAL PRIMARY KEY,
    tramite_id INTEGER NOT NULL REFERENCES tramites(id) ON DELETE CASCADE,
    nombre_paciente VARCHAR(200) NOT NULL,
    codigo_validacion VARCHAR(50),
    identificacion VARCHAR(20) NOT NULL,
    identificacion_hash VARCHAR(64) NOT NULL,
    cie10_codigo VARCHAR(10) NOT NULL,
    honorario_servicio_institucional VARCHAR(100)
);

-- 8. DETALLES_SERVICIOS (Corazón financiero)
-- =====================================================================
CREATE TABLE detalles_servicios (
    id SERIAL PRIMARY KEY,
    expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    tipo_item VARCHAR(30) NOT NULL DEFAULT 'TPSNS',
    tarifa_id INTEGER REFERENCES tarifas(id) ON DELETE RESTRICT,
    medicamento_insumo_id INTEGER REFERENCES medicamentos_insumos(id) ON DELETE RESTRICT,
    fecha_atencion DATE NOT NULL,
    codigo_original VARCHAR(50) NOT NULL,
    descripcion TEXT,
    cantidad NUMERIC(12, 2) NOT NULL DEFAULT 1,
    valor_unitario_solicitado NUMERIC(12, 4) NOT NULL,
    valor_unitario_oficial NUMERIC(12, 4) NOT NULL,
    subtotal NUMERIC(12, 2) DEFAULT 0,
    clasificador VARCHAR(50),
    porcentaje_modificador NUMERIC(5, 2) DEFAULT 0,
    valor_modificador NUMERIC(12, 2) DEFAULT 0,
    valor_solicitado NUMERIC(12, 2) DEFAULT 0,
    estado_fila estado_fila_enum DEFAULT 'PENDIENTE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipo_item_fk CHECK (
        (tipo_item = 'TPSNS' AND tarifa_id IS NOT NULL AND medicamento_insumo_id IS NULL) OR
        (tipo_item = 'MEDICAMENTO' AND medicamento_insumo_id IS NOT NULL AND tarifa_id IS NULL)
    )
);

-- 9. DECISIONES_AUDITORIA
-- =====================================================================
CREATE TABLE decisiones_auditoria (
    id SERIAL PRIMARY KEY,
    detalle_servicio_id INTEGER NOT NULL REFERENCES detalles_servicios(id) ON DELETE CASCADE,
    auditor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    decision decision_auditoria_enum NOT NULL,
    motivo_glosa TEXT,
    fecha_decision TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. FACTURAS
-- =====================================================================
CREATE TABLE facturas (
    id SERIAL PRIMARY KEY,
    planilla_id INTEGER NOT NULL REFERENCES planillas(id) ON DELETE RESTRICT,
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    fecha_emision DATE NOT NULL,
    valor_total NUMERIC(12, 2) NOT NULL,
    estado_pago estado_pago_enum DEFAULT 'PENDIENTE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. PREDICCIONES_RIESGO (IA)
-- =====================================================================
CREATE TABLE predicciones_riesgo (
    id SERIAL PRIMARY KEY,
    expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    nivel_riesgo nivel_riesgo_enum NOT NULL,
    puntaje NUMERIC(5, 2) NOT NULL,
    explicacion_shap JSONB,
    fecha_prediccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. AUDIT_LOG
-- =====================================================================
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action audit_action_enum NOT NULL,
    file_id INTEGER REFERENCES planillas(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    resultado TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. ÍNDICES ESTRATÉGICOS
-- =====================================================================
CREATE INDEX idx_planillas_subido_por ON planillas(subido_por);
CREATE INDEX idx_planillas_periodo ON planillas(periodo);
CREATE INDEX idx_planillas_hash ON planillas(hash_sha256);
CREATE INDEX idx_tramites_planilla ON tramites(planilla_id);
CREATE INDEX idx_tramites_numero ON tramites(numero_tramite);
CREATE INDEX idx_expedientes_tramite ON expedientes(tramite_id);
CREATE INDEX idx_expedientes_identificacion ON expedientes(identificacion);
CREATE INDEX idx_detalles_expediente ON detalles_servicios(expediente_id);
CREATE INDEX idx_detalles_tarifa ON detalles_servicios(tarifa_id);
CREATE INDEX idx_detalles_medicamento ON detalles_servicios(medicamento_insumo_id);
CREATE INDEX idx_detalles_estado ON detalles_servicios(estado_fila);
CREATE INDEX idx_decisiones_detalle ON decisiones_auditoria(detalle_servicio_id);
CREATE INDEX idx_facturas_planilla ON facturas(planilla_id);
CREATE INDEX idx_predicciones_expediente ON predicciones_riesgo(expediente_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_file ON audit_log(file_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- 14. VISTAS PARA REPORTES (INDIVIDUAL Y CONSOLIDADA)
-- =====================================================================
CREATE VIEW vista_planilla_individual AS
SELECT
    t.id AS tramite_id,
    t.numero_tramite,
    t.tipo_servicio,
    TO_CHAR(t.mes_ano_servicio, 'Month YYYY') AS mes_anio,
    e.nombre_paciente,
    e.identificacion,
    e.cie10_codigo,
    d.codigo_original AS codigo,
    CASE
        WHEN d.tipo_item = 'TPSNS' THEN tf.descripcion
        WHEN d.tipo_item = 'MEDICAMENTO' THEN mi.descripcion
    END AS descripcion,
    d.cantidad,
    d.valor_unitario_solicitado,
    d.subtotal,
    d.valor_solicitado,
    d.estado_fila,
    pr.nivel_riesgo AS riesgo_ia,
    p.revisado_nombre,
    p.revisado_identificacion,
    p.aprobado_nombre,
    p.aprobado_identificacion
FROM tramites t
JOIN expedientes e ON t.id = e.tramite_id
JOIN detalles_servicios d ON e.id = d.expediente_id
LEFT JOIN tarifas tf ON d.tarifa_id = tf.id
LEFT JOIN medicamentos_insumos mi ON d.medicamento_insumo_id = mi.id
LEFT JOIN predicciones_riesgo pr ON e.id = pr.expediente_id
LEFT JOIN planillas p ON t.planilla_id = p.id;

CREATE VIEW vista_planilla_consolidada AS
SELECT
    e.identificacion AS cedula,
    e.nombre_paciente,
    COUNT(DISTINCT t.id) AS total_tramites,
    SUM(d.cantidad) AS total_unidades,
    SUM(d.valor_solicitado) AS monto_total_solicitado,
    SUM(d.valor_unitario_oficial * d.cantidad) AS monto_total_oficial,
    (SUM(d.valor_solicitado) - SUM(d.valor_unitario_oficial * d.cantidad)) AS diferencia,
    MAX(pr.nivel_riesgo) AS max_riesgo
FROM expedientes e
JOIN tramites t ON e.tramite_id = t.id
JOIN detalles_servicios d ON e.id = d.expediente_id
LEFT JOIN predicciones_riesgo pr ON e.id = pr.expediente_id
GROUP BY e.identificacion, e.nombre_paciente;
