import express from 'express';
import { 
  registrarPostulacion, 
  obtenerPostulacionesUsuario, 
  anularPostulacion,
  validarRequisitosPostulacion 
} from '../controllers/postulaciones.js';
import { verifyToken } from '../authMiddleware.js';

const router = express.Router();

// Ruta para validar requisitos (debe ir ANTES de las rutas con parámetros dinámicos)
router.get('/validar/:idUsuario/:idConvocatoria', validarRequisitosPostulacion);

// Rutas de postulaciones
router.post('/', verifyToken, registrarPostulacion);
router.get('/usuario/:userId', verifyToken, obtenerPostulacionesUsuario);
router.patch('/:postulacionId/anular', verifyToken, anularPostulacion);

export default router;

