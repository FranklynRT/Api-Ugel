import express from 'express';

import cors from 'cors'; // Importa cors para permitir solicitudes de diferentes orígenes

import config from './config.js';
import UgelTalara from './routes/UgelTalara.routes.js';
import evaluationRoutes from './routes/evaluation.routes.js';
import convocatoriasURLRoutes from './routes/convocatoriasURL.routes.js';
import postulacionesRoutes from './routes/postulaciones.routes.js';
import anexosRoutes from './routes/anexos.routes.js';
import historialRoutes from './routes/historial.routes.js';
import { initializePostulacionesModule } from './controllers/postulaciones.js';

const app = express();

initializePostulacionesModule().catch((error) => {
  console.error('⚠️ Error al preparar la tabla de postulaciones:', error);
});

// Configuración del puerto
app.set('port', config.port);

// Configurar middlewares para el análisis del cuerpo de la solicitud
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors()); // Agrega cors para manejar las políticas de origen cruzado

// Middleware de logging para debug
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

console.log('✅ Middleware de logging activado');

// Monta tus rutas bajo el prefijo '/api'
app.use('/api', UgelTalara);
app.use('/api/documentos', anexosRoutes);

// Rutas de evaluación automática CAS
app.use('/api/evaluaciones', evaluationRoutes);

// Rutas de convocatorias por URL
app.use('/api/convocatorias', convocatoriasURLRoutes);

// Rutas de postulaciones de postulantes
app.use('/api/postulaciones', postulacionesRoutes);

// Compatibilidad con el prefijo legacy '/ugel-talara'
app.use('/ugel-talara', UgelTalara);
app.use('/ugel-talara/evaluaciones', evaluationRoutes);
app.use('/ugel-talara/convocatorias', convocatoriasURLRoutes);
app.use('/ugel-talara/postulaciones', postulacionesRoutes);
app.use('/ugel-talara/documentos', anexosRoutes);
app.use('/ugel-talara/historial', historialRoutes);

console.log('✅ Rutas registradas:');
console.log('   - /ugel-talara/historial');

// Ruta de salud del sistema
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
    }
  });
});

export default app;