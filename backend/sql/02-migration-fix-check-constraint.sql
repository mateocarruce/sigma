-- =====================================================================
-- MIGRACIÓN: permitir detalles RECHAZADOS sin código de catálogo asociado
-- =====================================================================
-- Motivo: cuando un código no existe en `tarifas` ni en `medicamentos_insumos`,
-- SIGMA igual necesita insertar la fila en `detalles_servicios` (con
-- estado_fila = 'RECHAZADO') para poder registrar la decisión automática
-- en `decisiones_auditoria` (que exige detalle_servicio_id NOT NULL).
-- El CHECK original no contemplaba ese caso. Se reemplaza por una versión
-- que sólo exige la FK correspondiente cuando la fila NO está rechazada.

ALTER TABLE detalles_servicios DROP CONSTRAINT chk_tipo_item_fk;

ALTER TABLE detalles_servicios ADD CONSTRAINT chk_tipo_item_fk CHECK (
    (estado_fila = 'RECHAZADO' AND tarifa_id IS NULL AND medicamento_insumo_id IS NULL)
    OR
    (tipo_item = 'TPSNS' AND tarifa_id IS NOT NULL AND medicamento_insumo_id IS NULL)
    OR
    (tipo_item = 'MEDICAMENTO' AND medicamento_insumo_id IS NOT NULL AND tarifa_id IS NULL)
);

-- También conviene permitir NULL en valor_unitario_oficial, ya que en una
-- fila rechazada no hay precio oficial que asignar (evita usar 0.0000 como
-- valor "mágico" que podría confundirse con un precio real).
ALTER TABLE detalles_servicios ALTER COLUMN valor_unitario_oficial DROP NOT NULL;
