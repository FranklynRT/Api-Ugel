@echo off
echo ========================================
echo Corrigiendo permisos de MySQL en XAMPP
echo ========================================
echo.

REM Ruta de MySQL en XAMPP (ajustar si es necesario)
set MYSQL_PATH=C:\xampp\mysql\bin

echo Conectando a MySQL...
echo.

REM Ejecutar comandos SQL para corregir permisos
"%MYSQL_PATH%\mysql.exe" -u root -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' IDENTIFIED BY '' WITH GRANT OPTION; FLUSH PRIVILEGES;"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Permisos corregidos exitosamente!
    echo ========================================
    echo.
    echo Ahora puedes reiniciar tu servidor Node.js
) else (
    echo.
    echo ========================================
    echo Error al corregir permisos
    echo ========================================
    echo.
    echo Por favor, ejecuta el script FIX_MYSQL_PERMISSIONS.sql
    echo manualmente en phpMyAdmin
)

echo.
pause
