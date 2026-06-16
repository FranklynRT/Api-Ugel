-- Script para aumentar max_allowed_packet en MySQL/MariaDB
-- Esto permite subir archivos más grandes (PDFs, imágenes, etc.)

-- Establecer max_allowed_packet a 500MB para la sesión actual
SET GLOBAL max_allowed_packet = 524288000;

-- Verificar el cambio
SHOW VARIABLES LIKE 'max_allowed_packet';

-- Nota: Este cambio se perderá al reiniciar MySQL
-- Para hacerlo permanente, edita el archivo my.ini (ver instrucciones abajo)
