-- ========================================
-- SCRIPT PARA CONFIGURAR MySQL
-- Permite subir archivos grandes (hasta 500MB)
-- ========================================

-- PASO 1: Configurar el límite global (requiere permisos de administrador)
SET GLOBAL max_allowed_packet = 524288000; -- 500MB

-- PASO 2: Verificar que se aplicó correctamente
SHOW VARIABLES LIKE 'max_allowed_packet';

-- Deberías ver un valor de 524288000 (500MB)
-- Si ves un valor menor, continúa con los pasos siguientes

-- ========================================
-- SI EL COMANDO ANTERIOR NO FUNCIONA:
-- ========================================
-- 
-- OPCIÓN A: Modificar my.ini (PERMANENTE - Recomendado)
-- 1. Detén MySQL desde el panel de XAMPP
-- 2. Abre: C:\xampp\mysql\bin\my.ini
-- 3. Busca la sección [mysqld]
-- 4. Agrega o modifica esta línea:
--    max_allowed_packet=524288000
-- 5. Guarda el archivo
-- 6. Inicia MySQL desde el panel de XAMPP
--
-- OPCIÓN B: Ejecutar como root
-- 1. Abre phpMyAdmin
-- 2. Ve a la pestaña "SQL"
-- 3. Ejecuta: SET GLOBAL max_allowed_packet = 524288000;
--
-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================
-- Ejecuta este comando para confirmar:
SHOW VARIABLES LIKE 'max_allowed_packet';
-- El valor debe ser: 524288000 (500 MB)

        