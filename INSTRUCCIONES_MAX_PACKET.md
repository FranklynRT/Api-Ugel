# Instrucciones para Aumentar max_allowed_packet en MySQL

## ¿Qué es max_allowed_packet?

Es el tamaño máximo de datos que MySQL puede recibir en una sola consulta. Si intentas subir archivos grandes (PDFs, imágenes) y este valor es bajo, obtendrás errores.

## Solución Rápida (Temporal)

### Opción 1: Usar phpMyAdmin

1. Abre phpMyAdmin: `http://localhost/phpmyadmin`
2. Haz clic en la pestaña **"SQL"**
3. Copia y pega este código:

```sql
SET GLOBAL max_allowed_packet = 524288000;
```

4. Haz clic en **"Continuar"**
5. Verifica el cambio ejecutando:

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
```

**Nota:** Este cambio se perderá cuando reinicies MySQL.

### Opción 2: Ejecutar el archivo .bat

Haz doble clic en el archivo `CONFIGURAR_MAX_PACKET.bat` que está en la carpeta Api.

## Solución Permanente (Recomendado)

Para que el cambio persista después de reiniciar MySQL:

### Paso 1: Detener MySQL

1. Abre el **Panel de Control de XAMPP**
2. Haz clic en **"Stop"** junto a MySQL

### Paso 2: Editar el archivo de configuración

1. En el Panel de Control de XAMPP, haz clic en **"Config"** junto a MySQL
2. Selecciona **"my.ini"** del menú
3. Se abrirá el archivo en el Bloc de notas

### Paso 3: Agregar la configuración

1. Busca la sección `[mysqld]` (usa Ctrl+F para buscar)
2. Busca la línea que dice `max_allowed_packet` (si existe)
3. Si existe, cámbiala a:
   ```
   max_allowed_packet = 500M
   ```
4. Si NO existe, agrégala después de `[mysqld]`:
   ```
   [mysqld]
   max_allowed_packet = 500M
   ```

### Paso 4: Guardar y reiniciar

1. Guarda el archivo (Ctrl+S)
2. Cierra el Bloc de notas
3. En el Panel de Control de XAMPP, haz clic en **"Start"** junto a MySQL
4. Reinicia tu servidor Node.js

## Verificar que funcionó

Ejecuta este comando en PowerShell:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -h 127.0.0.1 -e "SHOW VARIABLES LIKE 'max_allowed_packet';"
```

Deberías ver un valor de **524288000** (500MB) o similar.

## Valores Recomendados

- **Desarrollo:** 500M (524288000 bytes)
- **Producción con archivos grandes:** 1G (1073741824 bytes)
- **Producción normal:** 256M (268435456 bytes)

## Ejemplo de configuración completa en my.ini

```ini
[mysqld]
port=3306
socket="C:/xampp/mysql/mysql.sock"
basedir="C:/xampp/mysql"
tmpdir="C:/xampp/tmp"
datadir="C:/xampp/mysql/data"
pid_file="mysql.pid"
key_buffer=16M
max_allowed_packet=500M
sort_buffer_size=512K
net_buffer_length=8K
read_buffer_size=256K
read_rnd_buffer_size=512K
myisam_sort_buffer_size=8M
```

## Problemas Comunes

### Error: "MySQL no inicia después del cambio"

Si MySQL no inicia después de editar my.ini:

1. Revisa que no hayas cometido errores de sintaxis
2. Asegúrate de que el valor esté en la sección `[mysqld]`
3. Verifica que no haya espacios extra o caracteres especiales
4. Intenta con un valor más bajo como `256M`

### Error: "El cambio no se aplica"

1. Asegúrate de haber guardado el archivo my.ini
2. Reinicia MySQL completamente (Stop y luego Start)
3. Verifica que estés editando el archivo correcto (C:\xampp\mysql\bin\my.ini)
