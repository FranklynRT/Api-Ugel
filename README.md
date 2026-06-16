# 📋 Api-Ugel

API backend para el **Sistema de Gestión de Trámites de la UGEL** (Unidad de Gestión Educativa Local). Permite gestionar convocatorias CAS, postulaciones de personal docente y administrativo, y el flujo completo de Mesa de Partes.

---

## 🚀 Tecnologías

| Tecnología | Uso |
|------------|-----|
| Node.js + Express | Servidor y API REST |
| JavaScript (Babel/ES Modules) | Lenguaje principal |
| MySQL | Base de datos relacional |
| Docker + Docker Compose | Contenedores y despliegue |
| GitHub Actions | CI/CD automatizado |
| ngrok | Exposición local para pruebas remotas |

---

## 📁 Estructura del Proyecto

```
Api-Ugel/
├── src/                  # Código fuente principal
│   └── controllers/      # Lógica de negocio (anexos, historial, convocatorias, etc.)
├── database/             # Configuración de conexión a la base de datos
├── migrations/           # Scripts de migración SQL
├── uploads/              # Archivos subidos (constancias, currículums)
├── .github/workflows/    # Pipelines de CI/CD
├── Dockerfile            # Imagen de producción
├── Dockerfile.dev        # Imagen de desarrollo
├── docker-compose.yml    # Orquestación de servicios
└── package.json          # Dependencias del proyecto
```

---

## 🔄 Flujo del Sistema

### 1. Postulante completa su Anexo
El usuario llena el formulario con sus datos (DNI, puesto, área, número CAS, currículo, etc.) y al guardar, el sistema:
- Crea un registro en `postulantes_registrados` con estado **`Pendiente`**
- Genera automáticamente una **constancia de postulación** con código único

### 2. Mesa de Partes (`inicio.tsx`)
El personal de Mesa de Partes visualiza los postulantes en estado `Pendiente` y puede:
- ✅ **Registrar** → cambia el estado a `Registrado`
- ❌ **Rechazar** → cambia el estado a `Rechazado`
- 📝 Asignar número de expediente SIGEA
- 👁️ Ver la constancia de postulación

### 3. Historial (`historial.tsx`)
Muestra todos los postulantes ya procesados con sus estados, estadísticas y opción de **exportar a Excel**.

---

## 📊 Estados del Sistema

| Estado | Ubicación | Descripción |
|--------|-----------|-------------|
| 🟡 `Pendiente` | Mesa de Partes | Esperando ser procesado |
| 🟢 `Registrado` | Historial | Aceptado oficialmente |
| 🔴 `Rechazado` | Historial | Rechazado por Mesa de Partes |
| ⚫ `Archivado` | Historial | Archivado (no activo) |

---

## ⚙️ Instalación y Configuración

### Requisitos previos
- Node.js v18+
- MySQL 8+
- Docker (opcional)

### 1. Clonar el repositorio
```bash
git clone https://github.com/FranklynRT/Api-Ugel.git
cd Api-Ugel
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Editar el archivo `.env` con los datos de tu entorno:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=ugel_db
PORT=3000
```

### 4. Ejecutar migraciones
```bash
# Aplicar migraciones SQL en la carpeta /migrations
```

### 5. Iniciar el servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start

# Con ngrok (para pruebas remotas)
node start-with-ngrok.js
```

### Con Docker
```bash
docker-compose up --build
```

---

## 🧪 Scripts de Prueba y Utilidad

El proyecto incluye varios scripts utilitarios para verificación y pruebas:

```bash
# Verificar sistema completo
node verificar-sistema.js

# Crear un postulante de prueba
node crear_postulante_prueba.js

# Verificar postulantes en BD
node verificar_postulantes.js

# Probar endpoint de constancias
node PROBAR_ENDPOINT_CONSTANCIA.js

# Verificar historial de postulaciones
node PROBAR_ENDPOINT_HISTORIAL.js
```

---

## 🗄️ Base de Datos

El sistema usa MySQL. Se incluyen scripts SQL para configuración y correcciones:

- `CONFIGURAR_MYSQL.bat` — Configuración inicial en Windows
- `AUMENTAR_MAX_ALLOWED_PACKET.sql` — Ajuste del tamaño máximo de paquetes
- `CORREGIR_CURRICULUM_IDS.sql` — Corrección de IDs de currícula
- `CREAR_TABLA_CONVOCATORIA_INTEGRANTES.sql` — Tabla de integrantes de convocatorias

---

## 📄 Documentación Adicional

| Archivo | Descripción |
|---------|-------------|
| `RESUMEN_FLUJO_TRAMITE.md` | Flujo completo del sistema de trámites |
| `RESUMEN_CAMBIOS_API.md` | Historial de cambios en la API |
| `VERIFICACION_API.md` | Guía de verificación de endpoints |
| `INSTRUCCIONES_CORREGIR_MYSQL.md` | Solución de problemas con MySQL |

---

## 👤 Autor

**FranklynRT** — [@FranklynRT](https://github.com/FranklynRT)

---

## 📝 Licencia

Este proyecto es de uso institucional interno.
