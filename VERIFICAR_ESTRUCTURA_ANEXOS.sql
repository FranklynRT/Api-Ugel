-- Script para verificar la estructura de la tabla anexos_completos

-- 1. Ver todas las columnas de la tabla
DESCRIBE anexos_completos;

-- O alternativamente:
SHOW COLUMNS FROM anexos_completos;

-- 2. Ver un registro completo del anexo 14
SELECT * FROM anexos_completos WHERE IDANEXO = 14 LIMIT 1;

-- 3. Ver qué columnas tienen datos (no NULL) para el anexo 14
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'anexos_completos'
ORDER BY ORDINAL_POSITION;

-- 4. Verificar si hay tablas relacionadas con formación académica
SHOW TABLES LIKE '%formacion%';
SHOW TABLES LIKE '%experiencia%';
SHOW TABLES LIKE '%idioma%';
SHOW TABLES LIKE '%ofimatica%';

-- 5. Ver las relaciones con el anexo 14
SELECT * FROM formacion_academica WHERE IDUSUARIO = 22 OR IDANEXO = 14;
SELECT * FROM experiencia_laboral WHERE IDUSUARIO = 22 OR IDANEXO = 14;
SELECT * FROM idiomas WHERE IDUSUARIO = 22 OR IDANEXO = 14;
SELECT * FROM ofimatica WHERE IDUSUARIO = 22 OR IDANEXO = 14;
