-- =====================================================================
-- MIGRACIÓN: simplificar chk_tipo_item_fk (ya no depende de estado_fila)
-- =====================================================================
-- Motivo: el CHECK anterior (02-migration-fix-check-constraint.sql) solo
-- permitía ambas FK en NULL cuando estado_fila = 'RECHAZADO'. Con el
-- nuevo flujo de insumos/medicamentos sin catálogo AS-400 disponible,
-- una fila puede tener ambas FK en NULL estando en PENDIENTE (recién
-- procesada, sin validar) o incluso en AUDITADO (después de que un
-- auditor la aprobó manualmente sin vincular un registro real de
-- catálogo, porque no existe). El CHECK viejo bloqueaba ambos casos.
--
-- La regla correcta no depende del estado: "ambas FK en NULL" es válido
-- siempre que signifique "nunca se encontró/vinculó un catálogo" — el
-- propio tipo_item + FK asignada (cuando SÍ existe) sigue validándose
-- igual que antes.

ALTER TABLE detalles_servicios DROP CONSTRAINT chk_tipo_item_fk;

ALTER TABLE detalles_servicios ADD CONSTRAINT chk_tipo_item_fk CHECK (
    (tarifa_id IS NULL AND medicamento_insumo_id IS NULL)
    OR
    (tipo_item = 'TPSNS' AND tarifa_id IS NOT NULL AND medicamento_insumo_id IS NULL)
    OR
    (tipo_item = 'MEDICAMENTO' AND medicamento_insumo_id IS NOT NULL AND tarifa_id IS NULL)
);
