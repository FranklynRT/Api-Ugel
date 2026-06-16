import express from 'express';
import { generarCertificado } from '../controllers/certificado.controller.js';
import { verifyToken } from '../authMiddleware.js';

const router = express.Router();

// Ruta para generar certificado (requiere autenticación)
router.post('/generar-certificado', verifyToken, generarCertificado);

export default router;

