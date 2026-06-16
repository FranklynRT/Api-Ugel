-- Script para corregir permisos de MySQL/MariaDB en XAMPP
-- Ejecutar este script en phpMyAdmin o desde la línea de comandos de MySQL

-- 1. Verificar usuarios existentes
SELECT User, Host FROM mysql.user WHERE User = 'root';

-- 2. Otorgar todos los privilegios al usuario root desde localhost
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' IDENTIFIED BY '' WITH GRANT OPTION;

-- 3. Crear usuario root para 127.0.0.1 si no existe
GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' IDENTIFIED BY '' WITH GRANT OPTION;

-- 4. Crear usuario root para ::1 (IPv6 localhost) si no existe
GRANT ALL PRIVILEGES ON *.* TO 'root'@'::1' IDENTIFIED BY '' WITH GRANT OPTION;

-- 5. Aplicar los cambios
FLUSH PRIVILEGES;

-- 6. Verificar que los permisos se aplicaron correctamente
SHOW GRANTS FOR 'root'@'localhost';
