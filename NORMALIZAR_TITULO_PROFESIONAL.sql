-- ============================================================
-- Script para normalizar el campo tituloProfesional
-- Convierte descripciones largas a "Sí" o "No"
-- ============================================================

USE ugel_talara;

-- Ver el estado actual de los datos
SELECT 
    IDCONVOCATORIA,
    puesto,
    tituloProfesional,
    LENGTH(tituloProfesional) as longitud,
    CASE 
        WHEN tituloProfesional IS NULL THEN 'NULL'
        WHEN LENGTH(tituloProfesional) > 10 THEN 'DESCRIPCIÓN LARGA'
        ELSE 'VALOR CORTO'
    END as tipo_valor
FROM convocatorias
ORDER BY IDCONVOCATORIA;

-- Normalizar los valores largos a "Sí" o "No"
UPDATE convocatorias
SET tituloProfesional = CASE
    -- Si es NULL o vacío, poner "No"
    WHEN tituloProfesional IS NULL OR TRIM(tituloProfesional) = '' THEN 'No'
    
    -- Si contiene palabras clave que indican que SÍ requiere título
    WHEN LENGTH(tituloProfesional) > 10 AND (
        LOWER(tituloProfesional) LIKE '%título%' OR
        LOWER(tituloProfesional) LIKE '%titulo%' OR
        LOWER(tituloProfesional) LIKE '%profesional%' OR
        LOWER(tituloProfesional) LIKE '%licenciatura%' OR
        LOWER(tituloProfesional) LIKE '%grado%' OR
        LOWER(tituloProfesional) LIKE '%universitario%' OR
        LOWER(tituloProfesional) LIKE '%técnico%' OR
        LOWER(tituloProfesional) LIKE '%tecnico%'
    ) THEN 'Sí'
    
    -- Si es largo pero no contiene palabras clave, poner "No"
    WHEN LENGTH(tituloProfesional) > 10 THEN 'No'
    
    -- Si ya es "Sí" o "Si" (normalizar)
    WHEN LOWER(TRIM(tituloProfesional)) IN ('sí', 'si', 'yes', '1', 'true') THEN 'Sí'
    
    -- Si es "No" o similar
    WHEN LOWER(TRIM(tituloProfesional)) IN ('no', 'not', '0', 'false') THEN 'No'
    
    -- Por defecto, "No"
    ELSE 'No'
END
WHERE tituloProfesional IS NOT NULL;

-- Actualizar los valores NULL a "No"
UPDATE convocatorias
SET tituloProfesional = 'No'
WHERE tituloProfesional IS NULL;

-- Verificar los cambios
SELECT 
    IDCONVOCATORIA,
    puesto,
    tituloProfesional,
    requisitosAcademicos
FROM convocatorias
ORDER BY IDCONVOCATORIA;

-- Mostrar resumen de cambios
SELECT 
    tituloProfesional,
    COUNT(*) as cantidad
FROM convocatorias
GROUP BY tituloProfesional
ORDER BY tituloProfesional;

SELECT '✅ Normalización completada exitosamente' as resultado;
