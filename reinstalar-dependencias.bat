@echo off
echo ========================================
echo   REINSTALANDO DEPENDENCIAS
echo ========================================
echo.

echo Eliminando node_modules...
rmdir /s /q node_modules

echo Eliminando package-lock.json...
del /f /q package-lock.json

echo.
echo Instalando dependencias nuevamente...
call npm install

echo.
echo ========================================
echo   INSTALACION COMPLETADA
echo ========================================
echo.
echo Ahora ejecuta: npm run dev
echo.
pause
