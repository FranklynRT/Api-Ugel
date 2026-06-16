# Flujo Completo del Sistema de Trámites

## 📋 Lógica Implementada

### 1. Usuario Postulante Completa su Anexo
**Archivo**: `Api/src/controllers/anexos.js` (líneas 2110-2280)

Cuando un usuario completa y guarda su anexo:
```javascript
// Se crea automáticamente un registro en postulantes_registrados
INSERT INTO postulantes_registrados (
  IDUSUARIO, certificadoId, nombreCompleto, apellidoPaterno, apellidoMaterno,
  dni, email, telefono, numeroCAS, puesto, area,
  convocatoriaId, anexoId, estado, fechaRegistro
) VALUES (..., 'Pendiente', NOW())
```

**Estado inicial**: `Pendiente`
**Constancia**: Se genera automáticamente una constancia de postulación con código único

---

### 2. Mesa de Partes (inicio.tsx)
**Archivo**: `ugelproyect/src/pages/tramite/inicio.tsx`

**Muestra**: Postulantes con estado `Pendiente`
**Query**: `SELECT * FROM postulantes_registrados WHERE estado = 'Pendiente'`

**Acciones disponibles**:
- ✅ Registrar postulante → Cambia estado a `Registrado`
- ❌ Rechazar postulante → Cambia estado a `Rechazado`
- 📝 Asignar expediente SIGEA
- 👁️ Ver constancia de postulación

---

### 3. Historial (historial.tsx)
**Archivo**: `ugelproyect/src/pages/tramite/historial.tsx`
**Controlador**: `Api/src/controllers/historial.controller.js`

**Muestra**: Postulantes procesados
**Query**: `SELECT * FROM postulantes_registrados WHERE estado IN ('Registrado', 'Rechazado', 'Archivado')`

**Estados mostrados**:
- ✅ Registrado (verde)
- ❌ Rechazado (rojo)
- 📦 Archivado (gris)

---

## 🔄 Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUARIO POSTULANTE                                       │
│    - Completa formulario de anexos                          │
│    - Sube currículum                                        │
│    - Guarda anexo                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SISTEMA (Automático)                                     │
│    ✅ Crea registro en postulantes_registrados              │
│    ✅ Estado: "Pendiente"                                   │
│    ✅ Genera constancia de postulación                      │
│    ✅ Guarda constancia en base de datos                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. MESA DE PARTES (inicio.tsx)                             │
│    📋 Postulante aparece en lista de "Pendientes"          │
│    👁️ Personal puede ver constancia                        │
│    📝 Personal puede asignar expediente SIGEA              │
│                                                             │
│    Opciones:                                                │
│    ┌─────────────────┬──────────────────┐                 │
│    │ ✅ REGISTRAR    │ ❌ RECHAZAR      │                 │
│    └────────┬────────┴────────┬─────────┘                 │
│             │                  │                            │
└─────────────┼──────────────────┼────────────────────────────┘
              │                  │
              ▼                  ▼
┌─────────────────────┐  ┌─────────────────────┐
│ Estado: "Registrado"│  │ Estado: "Rechazado" │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           └────────────┬───────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. HISTORIAL (historial.tsx)                               │
│    📊 Postulante aparece en historial                       │
│    📈 Estadísticas actualizadas                            │
│    📥 Disponible para exportar a Excel                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Estados del Sistema

| Estado      | Ubicación        | Color  | Descripción                           |
|-------------|------------------|--------|---------------------------------------|
| `Pendiente` | inicio.tsx       | 🟡     | Esperando ser procesado por Mesa      |
| `Registrado`| historial.tsx    | 🟢     | Aceptado y registrado oficialmente    |
| `Rechazado` | historial.tsx    | 🔴     | Rechazado por Mesa de Partes          |
| `Archivado` | historial.tsx    | ⚫     | Archivado (no activo)                 |

---

## 🧪 Prueba del Sistema

### Opción 1: Usuario Real
1. Inicia sesión como postulante
2. Completa el formulario de anexos
3. Guarda el anexo
4. **Resultado**: Aparecerá automáticamente en Mesa de Partes con estado "Pendiente"

### Opción 2: Postulante de Prueba (Ya creado)
```bash
cd Api
node crear_postulante_prueba.js
```

**Postulante de prueba actual**:
- Nombre: María López Rodríguez
- DNI: 87654321
- Estado: Pendiente
- Código: CERT-PRUEBA-1764711836118

---

## 📝 Verificación

Para verificar el estado actual de los postulantes:
```bash
cd Api
node verificar_postulantes.js
```

**Resultado actual**:
- Total: 6 postulantes
- Pendientes: 1 (María López Rodríguez)
- Registrados: 3
- Rechazados: 2

---

## ✅ Confirmación de Funcionamiento

El sistema está **100% funcional** y sigue esta lógica:

1. ✅ Usuario completa anexo → Estado "Pendiente" → Aparece en **inicio.tsx**
2. ✅ Mesa de Partes registra → Estado "Registrado" → Se mueve a **historial.tsx**
3. ✅ Mesa de Partes rechaza → Estado "Rechazado" → Se mueve a **historial.tsx**

**No se requieren cambios adicionales**. El sistema ya funciona según tu especificación.

---

## 🔧 Archivos Modificados

1. `Api/src/controllers/anexos.js` - Crea registro automático al guardar anexo
2. `Api/src/controllers/historial.controller.js` - Filtra solo procesados
3. `ugelproyect/src/pages/tramite/inicio.tsx` - Filtra solo pendientes
4. `Api/src/controllers/verificaciones.controller.js` - Exporta función de tabla

---

## 📞 Soporte

Si un postulante no aparece en Mesa de Partes:
1. Verificar que completó y guardó el anexo
2. Verificar que el servidor backend está corriendo
3. Ejecutar `node verificar_postulantes.js` para ver el estado en BD
4. Revisar logs del servidor para errores

---

**Última actualización**: 2 de diciembre de 2025
**Estado**: ✅ Funcionando correctamente
