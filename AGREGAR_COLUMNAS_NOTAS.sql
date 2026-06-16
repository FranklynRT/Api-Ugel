-- Script para agregar columnas de notas individuales a POSTULANTES_REGISTRADOS
-- Ejecutar este script si las columnas no existen

USE ugel_talara;

-- Agregar columnas de notas individuales si no existen
ALTER TABLE POSTULANTES_REGISTRADOS 
ADD COLUMN IF NOT EXISTS notaFormacionAcademica DECIMAL(5,2) DEFAULT 0 COMMENT 'Nota de Formación Académica (0-100)',
ADD COLUMN IF NOT EXISTS notaExperienciaGeneral DECIMAL(5,2) DEFAULT 0 COMMENT 'Nota de Experiencia General (0-100)',
ADD COLUMN IF NOT EXISTS notaExperienciaEspecifica DECIMAL(5,2) DEFAULT 0 COMMENT 'Nota de Experiencia Específica (0-100)',
ADD COLUMN IF NOT EXISTS fechaExpediente DATE NULL COMMENT 'Fecha del expediente SIGEA';

-- Verificar que las columnas se agregaron correctamente
DESCRIBE POSTULANTES_REGISTRADOS;

-- Mostrar las columnas relacionadas con notas
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'ugel_talara'
AND TABLE_NAME = 'POSTULANTES_REGISTRADOS'
AND COLUMN_NAME IN ('notaFormacionAcademica', 'notaExperienciaGeneral', 'notaExperienciaEspecifica', 'expedienteSIGEA', 'fechaExpediente');

SELECT '✅ Columnas de notas agregadas correctamente' AS resultado;
