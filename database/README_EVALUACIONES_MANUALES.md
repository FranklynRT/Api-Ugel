# Configuración de Evaluaciones Manuales de CV

## 📋 Descripción
Este módulo permite al comité de evaluación asignar notas manuales a los postulantes basándose en la revisión de sus CVs. Es **independiente** del sistema de evaluación automática por IA.

## 🗄️ Instalación de la Base de Datos

### Paso 1: Ejecutar el script SQL
Ejecuta el siguiente script en tu base de datos MySQL:

```bash
mysql -u tu_usuario -p tu_base_de_datos < create_evaluaciones_manuales_cv.sql
```

O desde MySQL Workbench / phpMyAdmin:
1. Abre el archivo `create_evaluaciones_manuales_cv.sql`
2. Ejecuta el script completo

### Paso 2: Verificar la tabla
```sql
DESCRIBE EVALUACIONES_MANUALES_CV;
```

Deberías ver la siguiente estructura:
- `IDEVALUACION` (INT, AUTO_INCREMENT, PRIMARY KEY)
- `CANDIDATOID` (INT, NOT NULL)
- `NOTAMANUAL` (DECIMAL(5,2), DEFAULT 0)
- `ESTADO` (VARCHAR(20), DEFAULT 'pendiente')
- `EVALUADOPOR` (VARCHAR(255))
- `FECHAEVALUACION` (DATETIME)
- `OBSERVACIONES` (TEXT)

## 🔌 Endpoints API

### 1. Guardar Nota Manual
**POST** `/api/evaluaciones/guardar-nota-manual`

**Body:**
```json
{
  "candidatoId": 123,
  "notaManual": 75,
  "estado": "aprobado",
  "evaluadoPor": "Juan Pérez"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Nota guardada exitosamente",
  "candidatoId": 123,
  "notaManual": 75,
  "estado": "aprobado"
}
```

### 2. Obtener Todas las Notas Manuales
**GET** `/api/evaluaciones/notas-manuales`

**Respuesta:**
```json
[
  {
    "candidatoId": 123,
    "notaManual": 75,
    "estado": "aprobado",
    "evaluadoPor": "Juan Pérez",
    "fechaEvaluacion": "2024-01-15T10:30:00.000Z"
  }
]
```

### 3. Generar Reporte Excel de Evaluaciones Manuales
**GET** `/api/evaluaciones/reporte-excel-manual/:convocatoriaId`

**Respuesta:** Archivo Excel descargable

## 📊 Flujo de Trabajo

1. **Evaluador abre el CV** del postulante en el sistema
2. **Revisa el CV** y asigna una nota de 0 a 100
3. **Guarda la nota** (se almacena en `EVALUACIONES_MANUALES_CV`)
4. **La nota persiste** incluso al recargar la página
5. **Exporta el Excel** con todas las evaluaciones manuales

## 🎯 Criterios de Evaluación

- **Nota ≥ 60**: APTO (aprobado)
- **Nota < 60**: NO APTO (desaprobado)
- **Nota = 0**: PENDIENTE (sin evaluar)

## 🔒 Seguridad

- Todos los endpoints requieren autenticación (token JWT)
- Solo usuarios del comité pueden acceder
- Las notas se pueden actualizar (no se duplican)

## 📝 Notas Importantes

- Esta tabla es **independiente** de las evaluaciones de IA
- No se mezclan las evaluaciones manuales con las automáticas
- El Excel exportado contiene **solo** las evaluaciones manuales de CV
- Las notas se guardan por `CANDIDATOID` (único por candidato)

## 🐛 Troubleshooting

### Error: "Tabla no existe"
```bash
# Ejecuta el script SQL nuevamente
mysql -u root -p ugel_talara < create_evaluaciones_manuales_cv.sql
```

### Error: "Duplicate entry"
```sql
-- Verifica si ya existe una evaluación para ese candidato
SELECT * FROM EVALUACIONES_MANUALES_CV WHERE CANDIDATOID = 123;

-- Si quieres eliminar y empezar de nuevo
DELETE FROM EVALUACIONES_MANUALES_CV WHERE CANDIDATOID = 123;
```

### Las notas no persisten al recargar
- Verifica que el endpoint `/api/evaluaciones/notas-manuales` esté funcionando
- Revisa la consola del navegador para errores
- Verifica que la tabla tenga datos: `SELECT * FROM EVALUACIONES_MANUALES_CV;`
