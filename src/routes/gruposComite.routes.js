import express from 'express';
import {
  obtenerGruposComite,
  crearGrupoComite,
  obtenerGrupoComitePorId,
  obtenerGrupoPorUsuario,
  obtenerUsuariosGrupo,
  asignarUsuarioAGrupo,
  removerUsuarioDeGrupo,
  obtenerConvocatoriasGrupo,
  asignarConvocatoriaAGrupo,
  removerConvocatoriaDeGrupo,
  obtenerIntegrantesConvocatoria,
  asignarIntegranteConvocatoria,
  removerIntegranteConvocatoria,
  obtenerConvocatoriasIntegrante
} from '../controllers/gruposComite.js';
import { verifyToken } from '../authMiddleware.js';

const router = express.Router();

// Rutas de grupos-comite (GET sin autenticación para permitir acceso de lectura)
router.get('/grupos-comite', obtenerGruposComite);
router.post('/grupos-comite', verifyToken, crearGrupoComite);
router.get('/grupos-comite/:id', verifyToken, obtenerGrupoComitePorId);
router.get('/grupos-comite/usuario/:userId', verifyToken, obtenerGrupoPorUsuario);

// Rutas para usuarios de grupos
router.get('/grupos-comite/:id/usuarios', verifyToken, obtenerUsuariosGrupo);
router.post('/grupos-comite/:id/usuarios', verifyToken, asignarUsuarioAGrupo);
router.delete('/grupos-comite/:id/usuarios/:userId', verifyToken, removerUsuarioDeGrupo);

// Rutas para convocatorias de grupos
router.get('/grupos-comite/:id/convocatorias', verifyToken, obtenerConvocatoriasGrupo);
router.post('/grupos-comite/:id/convocatorias', verifyToken, asignarConvocatoriaAGrupo);
router.delete('/grupos-comite/:id/convocatorias/:convocatoriaId', verifyToken, removerConvocatoriaDeGrupo);

// Rutas para integrantes por convocatoria
router.get('/convocatorias/:convocatoriaId/integrantes', verifyToken, obtenerIntegrantesConvocatoria);
router.post('/convocatorias/:convocatoriaId/integrantes', verifyToken, asignarIntegranteConvocatoria);
router.delete('/convocatorias/:convocatoriaId/integrantes/:userId', verifyToken, removerIntegranteConvocatoria);
router.get('/usuarios/:userId/convocatorias-asignadas', verifyToken, obtenerConvocatoriasIntegrante);

export default router;

