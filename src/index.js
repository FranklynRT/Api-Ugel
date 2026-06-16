import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Cargar .env ANTES de importar cualquier módulo que lo necesite
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Importar después de cargar .env
import { pool, configureMaxPacket } from "./database/conexion.js"; // Import pool and configureMaxPacket
import { transporter } from './mailer.js';

// Función para asegurar que la tabla historial_tramites existe
const asegurarTablaHistorialTramites = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS historial_tramites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        postulanteId INT NOT NULL,
        certificadoId VARCHAR(255),
        nombreCompleto VARCHAR(255) NOT NULL,
        apellidoPaterno VARCHAR(100),
        apellidoMaterno VARCHAR(100),
        dni VARCHAR(20),
        email VARCHAR(255),
        telefono VARCHAR(20),
        numeroCAS VARCHAR(50),
        puesto VARCHAR(255),
        area VARCHAR(255),
        convocatoriaId INT,
        anexoId INT,
        curriculumId INT,
        expedienteSIGEA VARCHAR(100),
        estado ENUM('Registrado', 'Rechazado', 'Archivado') NOT NULL,
        motivoRechazo TEXT,
        fechaAccion DATETIME NOT NULL,
        usuarioAccion VARCHAR(255),
        INDEX idx_postulanteId (postulanteId),
        INDEX idx_estado (estado),
        INDEX idx_fechaAccion (fechaAccion),
        INDEX idx_dni (dni)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla historial_tramites verificada/creada');
  } catch (error) {
    console.error('❌ Error al crear tabla historial_tramites:', error);
  }
};

// Usar createRequire para importar express-fileupload (CommonJS)
const require = createRequire(import.meta.url);
const fileUpload = require('express-fileupload');

const app = express();

// Deshabilitar ETag para evitar respuestas 304 Not Modified
app.set('etag', false);

// Configurar CORS de forma SIMPLIFICADA - Permitir TODO en desarrollo
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Permitir cualquier origen (especialmente para desarrollo con ngrok)
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, ngrok-skip-browser-warning, Accept, X-Requested-With, Cache-Control, cache-control');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  // Manejar peticiones OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    console.log(`🔵 [CORS] OPTIONS preflight desde: ${origin || 'sin origen'} → ${req.path}`);
    return res.status(200).end();
  }
  
  next();
});

// Middleware para deshabilitar caché en todas las respuestas de la API
app.use((req, res, next) => {
  // Solo aplicar a rutas de API, no a archivos estáticos
  if (req.path.startsWith('/ugel-talara') || req.path.startsWith('/api')) {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': false
    });
  }
  next();
});

app.use(express.json());

// Configurar express-fileupload para manejar archivos
app.use(fileUpload({
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB máximo
    abortOnLimit: true,
    responseOnLimit: 'El archivo es demasiado grande. Máximo 500MB.',
    createParentPath: true
}));

// Servir archivos estáticos desde la carpeta uploads
// Usar path absoluto para evitar problemas con rutas relativas
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res, filePath) => {
        // Permitir CORS para archivos estáticos
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        // Deshabilitar caché para imágenes de perfil
        if (filePath.includes('profiles')) {
            res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
}));

import UgelTalaraRoutes from './routes/UgelTalara.routes.js';
import convocatoriasRoutes from './routes/convocatorias.routes.js';
import evaluationRoutes from './routes/evaluation.routes.js';
import anexosRoutes from './routes/anexos.routes.js';
import certificadoRoutes from './routes/certificado.routes.js';
import gruposComiteRoutes from './routes/gruposComite.routes.js';
import postulacionesRoutes from './routes/postulaciones.routes.js';
import historialRoutes from './routes/historial.routes.js';
// import convocatoriasURLRoutes from './routes/convocatoriasURL.routes.js'; // Comentado - archivo no existe

app.use('/api', UgelTalaraRoutes);
app.use('/api/convocatorias', convocatoriasRoutes);
app.use('/api/documentos', anexosRoutes);
app.use('/api/certificados', certificadoRoutes);
app.use('/api/grupos-comite', gruposComiteRoutes);
app.use('/api/postulaciones', postulacionesRoutes);

app.use('/ugel-talara', UgelTalaraRoutes);
app.use('/ugel-talara/convocatorias', convocatoriasRoutes);
app.use('/ugel-talara/documentos', anexosRoutes); // Incluye /generar-certificado, /analyze-anexos-completo, /reportes-ia
app.use('/ugel-talara/certificados', certificadoRoutes); // Ruta alternativa para certificados
app.use('/ugel-talara', gruposComiteRoutes); // Rutas de grupos de comité
app.use('/ugel-talara/postulaciones', postulacionesRoutes); // Rutas de postulaciones
app.use('/ugel-talara/historial', historialRoutes); // Rutas de historial de trámites

// Rutas de evaluación automática CAS
app.use('/api/evaluaciones', evaluationRoutes);
// Rutas de evaluación también disponibles en /ugel-talara/evaluaciones
app.use('/ugel-talara/evaluaciones', evaluationRoutes);

// Rutas de reports (para compatibilidad con el frontend)
// Estas rutas también están disponibles en /ugel-talara/documentos
app.use('/reports', anexosRoutes); // Incluye /analyze-anexos-completo
app.use('/ugel-talara/reports', anexosRoutes); // Ruta alternativa

// Rutas de convocatorias por URL (comentado - archivo no existe)
// app.use('/api/convocatorias', convocatoriasURLRoutes);

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API de UGEL Talara - Sistema de Evaluación CAS Automática',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            evaluaciones: '/api/evaluaciones',
            convocatorias: '/api/convocatorias'
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Sistema UGEL Talara - Evaluación CAS Automática',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        servicios: {
            evaluacionCAS: 'Activo',
            convocatoriasURL: 'Activo',
            reportesPDF: 'Activo',
            openai: 'Activo'
        },
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 9000
    });
});

// Endpoint de prueba para CORS
app.options('/ugel-talara/documentos/reportes-ia', (req, res) => {
    const origin = req.headers.origin;
    console.log(`🔵 [CORS TEST] OPTIONS a /reportes-ia desde: ${origin}`);
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, ngrok-skip-browser-warning, Accept, X-Requested-With, Cache-Control, cache-control');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
});

// Endpoint de prueba para verificar CORS
app.get('/ugel-talara/test-cors', (req, res) => {
    const origin = req.headers.origin;
    console.log(`✅ [CORS TEST] GET a /test-cors desde: ${origin}`);
    res.json({
        success: true,
        message: 'CORS funcionando correctamente',
        origin: origin,
        timestamp: new Date().toISOString()
    });
});

// Hacer que el pool esté disponible en todas las rutas
app.set('pool', pool);

const PORT = process.env.PORT || 9000;

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en el puerto ${PORT} 🔥`);
  console.log(`📊 Rutas de evaluaciones manuales disponibles en: http://localhost:${PORT}/api/evaluaciones`);

  try {
    const connection = await pool.getConnection(); // Use pool directly
    console.log("✅ Conectado correctamente a MySQL (XAMPP)");
    
    // Configurar max_allowed_packet automáticamente
    await configureMaxPacket();
    
    // Asegurar que la tabla historial_tramites existe
    await asegurarTablaHistorialTramites();
    
    connection.release();
    transporter.verify().then(() => {
        console.log('Servicio de correo configurado y listo para enviar. 📧');
    }).catch(console.error);
  } catch (err) {
    console.error("Error al conectar a la base de datos:", err);
  }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('*** ERROR NO MANEJADO (Promesa Rechazada): ***', reason);
});

process.on('uncaughtException', (error) => {
    console.error('*** ERROR NO CAPTURADO (Excepción Síncrona): ***', error);
});