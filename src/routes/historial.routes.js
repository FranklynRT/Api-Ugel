import express from 'express';
import { guardarEnHistorial, obtenerHistorialTramites } from '../controllers/historial.controller.js';
import { verifyToken } from '../authMiddleware.js';

const router = express.Router();

// Rutas de historial
router.post('/historial-tramites', verifyToken, guardarEnHistorial);
router.get('/historial-tramites', obtenerHistorialTramites); // Sin autenticación temporalmente para debug

// Ruta de prueba
router.get('/test', (req, res) => {
  console.log('✅ Ruta de prueba del historial funcionando');
  res.json({ success: true, message: 'Historial routes funcionando correctamente' });
});

export default router;
