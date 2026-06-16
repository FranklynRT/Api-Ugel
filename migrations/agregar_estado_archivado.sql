-- =====================================================
-- MIGRACIÓN: Agregar estado 'Archivado' al ENUM
-- Fecha: 2024
-- Descripción: Actualiza la columna estado para incluir 'Archivado'
-- =====================================================

USE ugel_talara;

-- Verificar la estructura actual
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'postulantes_registrados' 
  AND COLUMN_NAME = 'estado';

-- Actualizar el ENUM para incluir 'Archivado'
ALTER TABLE postulantes_registrados
MODIFY COLUMN estado ENUM('Registrado', 'Pendiente', 'En proceso', 'Rechazado', 'Archivado') DEFAULT 'Pendiente';

-- Verificar que se aplicó correctamente
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'postulantes_registrados' 
  AND COLUMN_NAME = 'estado';

-- Mostrar registros actuales
SELECT estado, COUNT(*) as total 
FROM postulantes_registrados 
GROUP BY estado;

SELECT '✅ Migración completada: Estado Archivado agregado correctamente' as mensaje;
