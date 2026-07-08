-- ========================================
-- ROLES Y USUARIOS (RBAC)
-- ========================================
CREATE TABLE roles (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(50) UNIQUE NOT NULL, -- 'auditor', 'admin', 'digitador'
    descripcion     TEXT
);

CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(200) NOT NULL,
    rol_id          INTEGER REFERENCES roles(id),
    activo          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- PACIENTES (ANONIMIZADOS)
-- ========================================
CREATE TABLE pacientes (
    id                  SERIAL PRIMARY KEY,
    hash_identificador  VARCHAR(64) UNIQUE NOT NULL, -- SHA-256(cedula + salt)
    sexo                CHAR(1),                      -- 'M' / 'F'
    rango_edad          VARCHAR(20),                  -- ej. '30-40' en vez de fecha exacta
    tipo_seguro         VARCHAR(50),                   -- 'MSP', 'SPPAT', 'IESS', etc.
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CATÁLOGO CIE-10 (referencia normativa)
-- ========================================
CREATE TABLE catalogo_cie10 (
    codigo          VARCHAR(10) PRIMARY KEY,
    descripcion     TEXT NOT NULL,
    categoria       VARCHAR(100)
);

-- ========================================
-- PLANILLAS (LOTE cargado desde AS400)
-- ========================================
CREATE TABLE lotes_carga (
    id                  SERIAL PRIMARY KEY,
    nombre_archivo      VARCHAR(255) NOT NULL,
    usuario_id          INTEGER REFERENCES usuarios(id),
    total_registros     INTEGER,
    registros_con_error INTEGER DEFAULT 0,
    estado              VARCHAR(30) DEFAULT 'PROCESANDO', -- PROCESANDO, VALIDADO, ERROR
    cargado_en          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE planillas (
    id                      SERIAL PRIMARY KEY,
    lote_id                 INTEGER REFERENCES lotes_carga(id),
    paciente_id             INTEGER REFERENCES pacientes(id),
    numero_factura          VARCHAR(50) NOT NULL,
    codigo_cie10            VARCHAR(10) REFERENCES catalogo_cie10(codigo),
    codigo_prestacion       VARCHAR(20),           -- código del Tarifario
    valor_facturado         NUMERIC(10,2),
    fecha_atencion          DATE,
    tipo_seguro             VARCHAR(50),           -- MSP / SPPAT
    -- Resultado del motor de reglas (NestJS, determinístico)
    reglas_estado           VARCHAR(30) DEFAULT 'PENDIENTE', -- OK, ADVERTENCIA, ERROR_CRITICO
    reglas_detalle          JSONB,                 -- lista de reglas violadas
    -- Estado general del flujo
    estado_planilla         VARCHAR(30) DEFAULT 'CARGADA', -- CARGADA, PRE_VALIDADA, AUDITADA, ENVIADA
    creado_en               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_planillas_lote ON planillas(lote_id);
CREATE INDEX idx_planillas_estado ON planillas(estado_planilla);

-- ========================================
-- PREDICCIONES DE IA (microservicio FastAPI)
-- ========================================
CREATE TABLE predicciones_ia (
    id                  SERIAL PRIMARY KEY,
    planilla_id         INTEGER REFERENCES planillas(id),
    modelo_version      VARCHAR(50) NOT NULL,      -- ej. 'rf_glosas_v1.2'
    probabilidad_glosa  NUMERIC(5,4) NOT NULL,      -- 0.0000 - 1.0000
    nivel_riesgo        VARCHAR(20) NOT NULL,       -- ALTO, MEDIO, BAJO
    shap_values         JSONB NOT NULL,             -- explicabilidad por feature
    features_entrada    JSONB,                      -- snapshot de qué se envió al modelo
    procesado_en        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predicciones_planilla ON predicciones_ia(planilla_id);

-- ========================================
-- AUDITORÍAS (decisión humana final - HITL)
-- ========================================
CREATE TABLE auditorias (
    id                  SERIAL PRIMARY KEY,
    planilla_id         INTEGER REFERENCES planillas(id) NOT NULL,
    prediccion_id       INTEGER REFERENCES predicciones_ia(id), -- snapshot usado en la decisión
    auditor_id          INTEGER REFERENCES usuarios(id) NOT NULL,
    decision            VARCHAR(20) NOT NULL,       -- APROBADO, RECHAZADO, DEVUELTO
    justificacion       TEXT,                       -- comentario obligatorio si RECHAZADO
    coincide_con_ia     BOOLEAN,                    -- ¿el humano confirmó la sugerencia de IA?
    auditado_en         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auditorias_planilla ON auditorias(planilla_id);