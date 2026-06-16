# 🔄 Migración: Agregar Estado 'Archivado'

## Problema
Cuando archivas un postulante y refrescas la página, el estado "Archivado" no se guarda porque la columna `estado` en la base de datos no incluye este valor en el ENUM.

## Solución
Agregar 'Archivado' al ENUM de la columna `estado` en la tabla `postulantes_registrados`.

---

## 📋 Opciones de Ejecución

### Opción 1: Script Automático (Recomendado)

```bash
# Desde la raíz del proyecto Api
cd Api
node migrations/run_migration.js
```

Este script:
- ✅ Verifica si ya existe 'Archivado'
- ✅ Ejecuta la migración si es necesario
- ✅ Muestra estadísticas
- ✅ Maneja errores automáticamente

### Opción 2: SQL Manual

```bash
# Conectar a MySQL
mysql -u root -p ugel_talara

# Ejecutar el archivo SQL
source Api/migrations/agregar_estado_archivado.sql
```

O copiar y pegar el siguiente SQL:

```sql
ALTER TABLE postulantes_registrados
MODIFY COLUMN estado ENUM('Registrado', 'Pendiente', 'En proceso', 'Rechazado', 'Archivado') DEFAULT 'Pendiente';
```

### Opción 3: Reiniciar el Servidor

El código ya está actualizado para agregar 'Archivado' automáticamente al iniciar el servidor:

```bash
# Detener el servidor si está corriendo
# Ctrl+C

# Iniciar el servidor
npm start
```

El servidor detectará que falta 'Archivado' y lo agregará automáticamente.

---

## ✅ Verificación

Después de ejecutar la migración, verifica que funcionó:

### 1. Verificar en MySQL
```sql
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ugel_talara' 
  AND TABLE_NAME = 'postulantes_registrados' 
  AND COLUMN_NAME = 'estado';
```

Deberías ver:
```
enum('Registrado','Pendiente','En proceso','Rechazado','Archivado')
```

### 2. Probar en la Aplicación
1. Ir a la interfaz de trámites
2. Registrar un postulante
3. Hacer clic en "📦 Archivar"
4. Refrescar la página (F5)
5. Ir a "📦 Historial Archivados"
6. ✅ El postulante debe aparecer ahí

---

## 🔍 Solución de Problemas

### Error: "Data truncated for column 'estado'"
**Causa:** Hay registros con valores que no están en el ENUM

**Solución:**
```sql
-- Ver registros con estados inválidos
SELECT id, estado FROM postulantes_registrados 
WHERE estado NOT IN ('Registrado', 'Pendiente', 'En proceso', 'Rechazado', 'Archivado');

-- Actualizar registros inválidos
UPDATE postulantes_registrados 
SET estado = 'Pendiente' 
WHERE estado NOT IN ('Registrado', 'Pendiente', 'En proceso', 'Rechazado', 'Archivado');
```

### Error: "Access denied"
**Causa:** No tienes permisos para modificar la tabla

**Solución:**
```bash
# Conectar como root
mysql -u root -p

# O usar el usuario con permisos ALTER
mysql -u admin_user -p
```

### El servidor no inicia después de la migración
**Causa:** Error en la sintaxis SQL

**Solución:**
```bash
# Ver logs del servidor
npm start

# Si hay error, revertir:
ALTER TABLE postulantes_registrados
MODIFY COLUMN estado ENUM('Registrado', 'Pendiente', 'En proceso', 'Rechazado') DEFAULT 'Pendiente';
```

---

## 📊 Impacto

### Antes de la Migración
- ❌ Archivar postulante → Error al guardar
- ❌ Refrescar página → Postulante vuelve a "Registrado"
- ❌ No se puede ver historial de archivados

### Después de la Migración
- ✅ Archivar postulante → Se guarda correctamente
- ✅ Refrescar página → Postulante permanece archivado
- ✅ Historial de archivados funciona correctamente
- ✅ Excel incluye hoja de archivados

---

## 🔒 Seguridad

Esta migración:
- ✅ NO elimina datos
- ✅ NO modifica registros existentes
- ✅ Solo agrega un nuevo valor al ENUM
- ✅ Es reversible (se puede quitar 'Archivado' si es necesario)

---

## 📝 Notas

- Esta migración es **segura** y no afecta datos existentes
- Se puede ejecutar múltiples veces sin problemas
- El código del servidor ya está actualizado para usar 'Archivado'
- Los archivos actualizados:
  - `Api/src/controllers/verificaciones.controller.js`
  - `Api/src/controllers/postulaciones.js`
  - `Api/src/controllers/anexos.js`

---

## 🆘 Soporte

Si tienes problemas:
1. Verifica que la base de datos esté corriendo
2. Verifica los permisos del usuario
3. Revisa los logs del servidor
4. Ejecuta el script de migración con logs detallados
