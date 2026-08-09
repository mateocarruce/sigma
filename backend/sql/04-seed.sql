-- =====================================================================
-- SEED DE DATOS DE PRUEBA
-- Ejecutar DESPUÉS de 01-schema.sql, 02-migration-fix-check-constraint.sql
-- y 03-migration-add-user-sessions.sql
-- =====================================================================
-- IMPORTANTE: no pude verificar en mi entorno (sin red ni bcrypt) si el
-- hash de abajo corresponde realmente a "Admin1234!". Antes de confiar
-- en el login, verifícalo o regeneralo (ver INTEGRACION-AUTH.md, sección
-- "Nota importante sobre tu seed actual").

INSERT INTO users (username, nombre, email, password_hash, rol) VALUES
('digitador', 'Digitador Sigma', 'digitador@sigma.ec', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'DIGITADOR'),
('admin', 'Admin Sigma', 'admin@sigma.ec', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN'),
('auditor', 'Auditor Medico', 'auditor@sigma.ec', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AUDITOR');

INSERT INTO tarifas (codigo_tpsns, descripcion, valor_oficial, fecha_vigencia_desde) VALUES
('3432620068050', 'Guantes de Latex, Talla Pequeño', 0.07, '2017-01-01'),
('3214001002', 'Diclofenaco Liquido Parenteral 25 mg/ml', 0.05, '2017-01-01');

INSERT INTO medicamentos_insumos (codigo_as400, descripcion, tipo, precio_oficial, unidad_medida, fecha_vigencia_desde) VALUES
('MED001', 'Paracetamol 500 mg Tabletas', 'MEDICAMENTO', 0.03, 'TAB', '2017-01-01'),
('INS001', 'Jeringa 10 ml', 'INSUMO', 0.02, 'UNIDAD', '2017-01-01');

-- Planilla de ejemplo con firmas
INSERT INTO planillas (
    nombre_archivo, minio_path, hash_sha256, hospital, periodo, subido_por,
    estado, revisado_nombre, revisado_identificacion, aprobado_nombre, aprobado_identificacion
) VALUES (
    'matriz_abril_2025.xlsm',
    'uploads/2025/04/matriz_abril_2025.xlsm',
    'a1b2c3d4e5f67890',
    'Hospital del Día Chimbacalle',
    '04-2025',
    1,
    'COMPLETADA',
    'Maria Revisora',
    '1234567890',
    'Juan Director',
    '0987654321'
);

INSERT INTO tramites (numero_tramite, tipo_servicio, mes_ano_servicio, cantidad_expedientes, valor_solicitado_total, planilla_id)
VALUES ('2', 'TRASPLANTE', '2025-04-01', 1, 0.28, 1);

INSERT INTO expedientes (tramite_id, nombre_paciente, codigo_validacion, identificacion, identificacion_hash, cie10_codigo)
VALUES (1, 'CHILIG CHANGOLUISA MARIA ROSA', 'VAL123', '1701141028', 'sha256_hash_dummy', 'S720');

INSERT INTO detalles_servicios (
    expediente_id, tipo_item, tarifa_id, medicamento_insumo_id,
    fecha_atencion, codigo_original, descripcion, cantidad,
    valor_unitario_solicitado, valor_unitario_oficial,
    subtotal, clasificador, porcentaje_modificador, valor_solicitado, estado_fila
) VALUES (
    1, 'TPSNS', 1, NULL,
    '2025-04-15', '3432620068050', 'GUANTES DE LATEX, TALLA PEQUEÑO', 4.00,
    0.07, 0.07,
    0.28, 'EM09-38', 100, 0.28, 'PENDIENTE'
);

-- Fila RECHAZADA de ejemplo (código que NO existe en ningún catálogo),
-- para poder probar el endpoint POST /auditoria/:id/decidir con APROBADO
-- sobre un rechazo automático. Nota: requiere el fix del PASO 0 en
-- INTEGRACION-AUDITORIA.md aplicado en detalle-servicio.entity.ts.
INSERT INTO detalles_servicios (
    expediente_id, tipo_item, tarifa_id, medicamento_insumo_id,
    fecha_atencion, codigo_original, descripcion, cantidad,
    valor_unitario_solicitado, valor_unitario_oficial,
    subtotal, clasificador, porcentaje_modificador, valor_solicitado, estado_fila
) VALUES (
    1, 'TPSNS', NULL, NULL,
    '2025-04-16', 'CODIGO-INEXISTENTE-999', 'CODIGO NO ENCONTRADO EN CATALOGO', 1.00,
    0.15, NULL,
    0.15, NULL, 0, 0.15, 'RECHAZADO'
);

INSERT INTO decisiones_auditoria (detalle_servicio_id, auditor_id, decision, motivo_glosa)
VALUES (2, NULL, 'RECHAZADO', 'Código no encontrado en catálogo (AS-400/TPSNS)');
