# Instrucciones para Corregir Permisos de MySQL en XAMPP

## Problema
El error "Host 'localhost' is not allowed to connect to this MariaDB server" indica que el usuario root no tiene permisos para conectarse desde localhost.

## Solución 1: Usar phpMyAdmin (RECOMENDADO)

1. **Detén MySQL** desde el panel de control de XAMPP
2. **Inicia MySQL** nuevamente desde el panel de control de XAMPP
3. Abre tu navegador y ve a: `http://localhost/phpmyadmin`
4. Si puedes acceder, haz clic en la pestaña **"SQL"** en la parte superior
5. Copia y pega este código:

```sql
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' IDENTIFIED BY '' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' IDENTIFIED BY '' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'::1' IDENTIFIED BY '' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

6. Haz clic en **"Continuar"** o **"Go"**
7. Reinicia tu servidor Node.js

## Solución 2: Editar archivo de configuración de MySQL

Si no puedes acceder a phpMyAdmin, edita el archivo de configuración:

1. **Detén MySQL** desde XAMPP
2. Abre el archivo: `C:\xampp\mysql\bin\my.ini`
3. Busca la línea que dice `bind-address` y cámbiala a:
   ```
   bind-address = 0.0.0.0
   ```
4. Si no existe, agrégala en la sección `[mysqld]`
5. Busca la línea `skip-networking` y coméntala agregando `#` al inicio:
   ```
   # skip-networking
   ```
6. Guarda el archivo
7. **Inicia MySQL** nuevamente desde XAMPP
8. Reinicia tu servidor Node.js

## Solución 3: Reinstalar MySQL en XAMPP

Si nada funciona:

1. Haz un **backup** de tu base de datos desde phpMyAdmin (si puedes acceder)
2. Detén todos los servicios de XAMPP
3. Desinstala XAMPP
4. Descarga la última versión de XAMPP desde: https://www.apachefriends.org/
5. Instala XAMPP nuevamente
6. Restaura tu base de datos

## Verificar que funcionó

Después de aplicar cualquiera de las soluciones, ejecuta este comando en PowerShell:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -h 127.0.0.1 -e "SELECT 'Conexión exitosa' as resultado;"
```

Si ves "Conexión exitosa", el problema está resuelto.

## Nota Importante

El archivo `.env` ya fue modificado para usar `127.0.0.1` en lugar de `localhost`, lo cual debería ayudar a evitar este problema en el futuro.
