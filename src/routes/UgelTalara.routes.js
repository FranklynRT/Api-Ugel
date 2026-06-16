import express from 'express';
import { 
  registrarUsuario, 
  loginUsuario,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  actualizarContrasena,
  cambiarContrasena,
  cambiarEstado,
  eliminarUsuario,
  obtenerConvocatoriasComite,
  asignarConvocatoriaComite,
  removerConvocatoriaComite,
  obtenerEstadisticas,
  checkUserRole,
  forgotPassword,
  resetPassword,
  subirFotoPerfil,
  servirFotoPerfil
} from '../controllers/usuarios.js';
import { verifyToken } from '../authMiddleware.js';

const router = express.Router();

// Rutas públicas (sin autenticación)
router.post('/register', registrarUsuario);
router.post('/login', loginUsuario);
router.post('/users/check-role', checkUserRole);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Rutas de gestión de usuarios (requieren autenticación)
router.get('/users', verifyToken, obtenerUsuarios);
router.get('/users/:id', verifyToken, obtenerUsuarioPorId);
router.post('/users', verifyToken, crearUsuario);
router.put('/users/:id', verifyToken, actualizarUsuario);
router.put('/users/:id/change-password', verifyToken, cambiarContrasena);
router.put('/users/:id/password', verifyToken, actualizarContrasena); // Alternativa para actualizar sin validar actual
router.patch('/users/:id/estado', verifyToken, cambiarEstado);
router.delete('/users/:id', verifyToken, eliminarUsuario);

// Rutas para gestión de convocatorias del comité
router.get('/users/:id/convocatorias', verifyToken, obtenerConvocatoriasComite);
router.post('/users/:id/convocatorias', verifyToken, asignarConvocatoriaComite);
router.delete('/users/:id/convocatorias/:convocatoriaId', verifyToken, removerConvocatoriaComite);

// Rutas para subir foto de perfil (soporta ambos endpoints)
router.post('/usuarios/:id/foto-perfil', verifyToken, subirFotoPerfil);
router.put('/users/:id/profile-picture', verifyToken, subirFotoPerfil);

// Ruta para servir imágenes de perfil (pública, sin autenticación)
router.get('/uploads/profiles/:filename', servirFotoPerfil);

// Ruta de estadísticas (requiere autenticación)
router.get('/estadisticas', verifyToken, obtenerEstadisticas);

export default router;
