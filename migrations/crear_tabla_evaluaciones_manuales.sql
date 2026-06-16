-- =====================================================
-- MIGRACIÓN: Crear tabla EVALUACIONES_MANUALES_CV
-- Fecha: 2024
-- Descripción: Crea la tabla para guardar evaluaciones manuales de CV
-- =====================================================

USE ugel_talara;

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS EVALUACIONES_MANUALES_CV (
  ID INT AUTO_INCREMENT PRIMARY KEY,
  CANDIDATOID INT NOT NULL,
  NOTAMANUAL DECIMAL(5,2) NOT NULL,
  ESTADO VARCHAR(50) NOT NULL,
  EVALUADOPOR VARCHAR(255),
  FECHAEVALUACION DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_candidato (CANDIDATOID),
  INDEX idx_estado (ESTADO),
  INDEX idx_fecha (FECHAEVALUACION)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar que se creó correctamente
DESCRIBE EVALUACIONES_MANUALES_CV;

SELECT '✅ Tabla EVALUACIONES_MANUALES_CV creada correctamente' as mensaje;
