@echo off
echo ========================================
echo Configurando max_allowed_packet en MySQL
echo ========================================
echo.

REM Ruta de MySQL en XAMPP
set MYSQL_PATH=C:\xampp\mysql\bin

echo Aumentando max_allowed_packet a 500MB...
echo.

REM Ejecutar comando SQL
"%MYSQL_PATH%\mysql.exe" -u root -h 127.0.0.1 -e "SET GLOBAL max_allowed_packet = 524288000; SHOW VARIABLES LIKE 'max_allowed_packet';"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Configuracion aplicada exitosamente!
    echo ========================================
    echo.
    echo IMPORTANTE: Este cambio es temporal.
    echo Para hacerlo permanente, edita el archivo:
    echo C:\xampp\mysql\bin\my.ini
    echo.
    echo Agrega esta linea en la seccion [mysqld]:
    echo max_allowed_packet = 500M
) else (
    echo.
    echo ========================================
    echo Error al configurar max_allowed_packet
    echo ========================================
    echo.
    echo Por favor, ejecuta el script manualmente en phpMyAdmin
)

echo.
pause
