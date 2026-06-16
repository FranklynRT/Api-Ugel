import express from 'express';
import multer from 'multer';
import {
  crearConvocatoria,
  obtenerConvocatorias,
  obtenerConvocatoriaPorId,
  actualizarConvocatoria,
  cambiarEstadoPublicacion,
  eliminarConvocatoria,
  subirPDF,
  descargarPDF
} from '../controllers/convocatorias.js';

const router = express.Router();

// Configurar multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// Rutas de gestión de convocatorias (públicas, sin autenticación)
router.get('/', obtenerConvocatorias);
router.get('/:id', obtenerConvocatoriaPorId);
router.post('/', crearConvocatoria);
router.put('/:id', actualizarConvocatoria);
router.patch('/:id/estado', cambiarEstadoPublicacion);
router.delete('/:id', eliminarConvocatoria);

// Rutas para manejo de PDFs
// Nota: express-fileupload está configurado globalmente, así que multer es opcional
router.post('/:id/pdf', (req, res, next) => {
  // Si hay archivos en req.files (express-fileupload), continuar directamente
  if (req.files && req.files.pdf) {
    return subirPDF(req, res);
  }
  // Si no, intentar con multer
  upload.single('pdf')(req, res, (err) => {
    if (err) {
      console.error('Error en multer:', err);
      return res.status(400).json({ error: err.message });
    }
    subirPDF(req, res);
  });
});
router.get('/:id/pdf', descargarPDF);

export default router;
