@echo off
echo ========================================
echo CONFIGURAR MySQL para archivos grandes
echo ========================================
echo.
echo Este script configurara MySQL para permitir archivos de hasta 500MB
echo.
echo OPCION 1: Ejecutar SQL directamente
echo -----------------------------------------
echo Abre phpMyAdmin o MySQL Workbench y ejecuta:
echo.
echo SET GLOBAL max_allowed_packet = 524288000;
echo.
echo.
echo OPCION 2: Modificar archivo de configuracion (PERMANENTE)
echo -----------------------------------------
echo 1. Abre el archivo: C:\xampp\mysql\bin\my.ini
echo 2. Busca la seccion [mysqld]
echo 3. Agrega o modifica esta linea:
echo    max_allowed_packet=524288000
echo 4. Guarda el archivo
echo 5. Reinicia MySQL desde el panel de XAMPP
echo.
echo.
echo Presiona cualquier tecla para abrir phpMyAdmin...
pause > nul
start http://localhost/phpmyadmin
echo.
echo Ahora ejecuta este comando SQL en phpMyAdmin:
echo SET GLOBAL max_allowed_packet = 524288000;
echo.
pause
