import express from 'express';
import {
  uploadAnexo,
  obtenerAnexosPorUsuario,
  obtenerAnexosFiltrados,
  obtenerAnexoCompleto,
  obtenerAnexosCompletosPorUsuario,
  updateAnexoCompleto,
  descargarAnexo,
  uploadCurriculum,
  obtenerCurriculumPorUsuario,
  descargarCurriculum,
  hasCurriculum,
  corregirCurriculumIds,
  guardarBorradorAnexo,
  obtenerBorradorAnexo,
  eliminarBorradorAnexo,
  obtenerFormacionesAcademicas,
  crearFormacionAcademica,
  actualizarFormacionAcademica,
  eliminarFormacionAcademica,
  obtenerIdiomas,
  crearIdioma,
  actualizarIdioma,
  eliminarIdioma,
  obtenerOfimaticas,
  crearOfimatica,
  actualizarOfimatica,
  eliminarOfimatica,
  obtenerEspecializaciones,
  crearEspecializacion,
  actualizarEspecializacion,
  eliminarEspecializacion,
  obtenerExperienciasLaborales,
  crearExperienciaLaboral,
  actualizarExperienciaLaboral,
  eliminarExperienciaLaboral,
  obtenerReferenciasLaborales,
  crearReferenciaLaboral,
  actualizarReferenciaLaboral,
  eliminarReferenciaLaboral,
  obtenerParientes,
  crearPariente,
  actualizarPariente,
  eliminarPariente,
  analizarAnexosConConvocatoria,
  obtenerReportesIA,
  obtenerReporteIAPorId,
  actualizarPuntajeReporteIA,
  obtenerCandidatosConCV,
  generarPDFReporteIA,
  analizarAnexosCompleto,
  uploadCertificateImage
} from '../controllers/anexos.js';
import { generarCertificado } from '../controllers/certificado.controller.js';
import {
  crearVerificacion,
  obtenerVerificacionesComite,
  obtenerPostulantesRegistrados,
  registrarPostulante,
  actualizarExpedientePostulante,
  rechazarPostulante,
  archivarPostulante,
  verificarCertificado,
  eliminarVerificacion,
  obtenerImagenCertificado
} from '../controllers/verificaciones.controller.js';
import { obtenerConstanciaPostulante } from '../controllers/constancias.controller.js';
import { verifyToken } from '../authMiddleware.js';

const router = express.Router();

// Las peticiones OPTIONS son manejadas por el middleware principal en index.js
// No es necesario manejarlas aquí

// Rutas de anexos (requieren autenticación)
router.post('/upload-anexo', verifyToken, uploadAnexo);

// IMPORTANTE: Rutas específicas ANTES de rutas con parámetros dinámicos
// Ruta para analizar anexos con convocatoria (requiere autenticación)
router.post('/anexos/analizar/:postulanteId/:convocatoriaId', verifyToken, analizarAnexosConConvocatoria);

// Rutas de borradores de anexos (requieren autenticación)
router.post('/anexos/draft', verifyToken, guardarBorradorAnexo);
router.get('/anexos/draft', verifyToken, obtenerBorradorAnexo);
router.delete('/anexos/draft', verifyToken, eliminarBorradorAnexo);

// Rutas generales de anexos
router.get('/anexos', verifyToken, obtenerAnexosPorUsuario);
router.get('/anexos/filtered', verifyToken, obtenerAnexosFiltrados);
router.get('/anexos-completos/usuario/:userId', verifyToken, obtenerAnexosCompletosPorUsuario);
router.get('/anexos-completos', verifyToken, obtenerAnexosCompletosPorUsuario);
router.put('/anexos-completos/:id', verifyToken, updateAnexoCompleto);

// Rutas con parámetros dinámicos (deben ir al final)
router.get('/anexos/:anexoId/completo', verifyToken, obtenerAnexoCompleto);
router.get('/anexos/:id/download', verifyToken, descargarAnexo);
router.get('/anexos-completos/:id/download', verifyToken, descargarAnexo);

// Rutas de curriculum (requieren autenticación)
router.post('/upload-curriculum', verifyToken, uploadCurriculum);
router.get('/curriculum', verifyToken, obtenerCurriculumPorUsuario);
router.get('/curriculum/:id/download', verifyToken, descargarCurriculum);
router.get('/has-curriculum', verifyToken, hasCurriculum);
router.get('/corregir-curriculum-ids', verifyToken, corregirCurriculumIds);

// Ruta para generar certificado (compatibilidad con frontend)
router.post('/generar-certificado', verifyToken, generarCertificado);

// Rutas de verificaciones de QR
router.post('/verificacion', verifyToken, crearVerificacion);
router.get('/verificaciones-sesion-comite', verifyToken, obtenerVerificacionesComite);
router.get('/verificar-certificado/:codigo', verificarCertificado); // Sin token para acceso público
router.delete('/verificacion/:id', verifyToken, eliminarVerificacion); // Eliminar por ID
router.delete('/verificacion/codigo/:codigo', verifyToken, eliminarVerificacion); // Eliminar por código

// Ruta para guardar la imagen del certificado generado en el frontend
router.post('/upload-certificate-image', verifyToken, uploadCertificateImage);

// Rutas para Mesa de Partes (Trámites)
router.get('/postulantes-registrados', verifyToken, obtenerPostulantesRegistrados);
router.post('/registrar-postulante', verifyToken, registrarPostulante);
router.post('/postulantes-registrados', verifyToken, registrarPostulante); // Ruta alternativa para compatibilidad
router.put('/postulantes-registrados/:id/expediente', verifyToken, actualizarExpedientePostulante);
router.put('/postulantes-registrados/:id/rechazar', verifyToken, rechazarPostulante);
router.put('/postulantes-registrados/:id/archivar', verifyToken, archivarPostulante);
// Usar el nuevo controlador de constancias (más robusto)
router.get('/postulantes-registrados/:id/certificado-imagen', verifyToken, obtenerConstanciaPostulante);

// Rutas CRUD para Formación Académica
router.get('/anexos/:anexoId/formaciones-academicas', verifyToken, obtenerFormacionesAcademicas);
router.post('/anexos/:anexoId/formaciones-academicas', verifyToken, crearFormacionAcademica);
router.put('/anexos/formaciones-academicas/:id', verifyToken, actualizarFormacionAcademica);
router.delete('/anexos/formaciones-academicas/:id', verifyToken, eliminarFormacionAcademica);

// Rutas CRUD para Idiomas
router.get('/anexos/:anexoId/idiomas', verifyToken, obtenerIdiomas);
router.post('/anexos/:anexoId/idiomas', verifyToken, crearIdioma);
router.put('/anexos/idiomas/:id', verifyToken, actualizarIdioma);
router.delete('/anexos/idiomas/:id', verifyToken, eliminarIdioma);

// Rutas CRUD para Ofimática
router.get('/anexos/:anexoId/ofimaticas', verifyToken, obtenerOfimaticas);
router.post('/anexos/:anexoId/ofimaticas', verifyToken, crearOfimatica);
router.put('/anexos/ofimaticas/:id', verifyToken, actualizarOfimatica);
router.delete('/anexos/ofimaticas/:id', verifyToken, eliminarOfimatica);

// Rutas CRUD para Especialización
router.get('/anexos/:anexoId/especializaciones', verifyToken, obtenerEspecializaciones);
router.post('/anexos/:anexoId/especializaciones', verifyToken, crearEspecializacion);
router.put('/anexos/especializaciones/:id', verifyToken, actualizarEspecializacion);
router.delete('/anexos/especializaciones/:id', verifyToken, eliminarEspecializacion);

// Rutas CRUD para Experiencia Laboral
router.get('/anexos/:anexoId/experiencias-laborales', verifyToken, obtenerExperienciasLaborales);
router.post('/anexos/:anexoId/experiencias-laborales', verifyToken, crearExperienciaLaboral);
router.put('/anexos/experiencias-laborales/:id', verifyToken, actualizarExperienciaLaboral);
router.delete('/anexos/experiencias-laborales/:id', verifyToken, eliminarExperienciaLaboral);

// Rutas CRUD para Referencias Laborales
router.get('/anexos/:anexoId/referencias-laborales', verifyToken, obtenerReferenciasLaborales);
router.post('/anexos/:anexoId/referencias-laborales', verifyToken, crearReferenciaLaboral);
router.put('/anexos/referencias-laborales/:id', verifyToken, actualizarReferenciaLaboral);
router.delete('/anexos/referencias-laborales/:id', verifyToken, eliminarReferenciaLaboral);

// Rutas CRUD para Parientes en UGEL
router.get('/anexos/:anexoId/parientes', verifyToken, obtenerParientes);
router.post('/anexos/:anexoId/parientes', verifyToken, crearPariente);
router.put('/anexos/parientes/:id', verifyToken, actualizarPariente);
router.delete('/anexos/parientes/:id', verifyToken, eliminarPariente);

// Rutas para reportes de IA (requieren autenticación)
router.get('/reportes-ia', verifyToken, obtenerReportesIA);
router.get('/reportes-ia/:reporteId', verifyToken, obtenerReporteIAPorId);
router.put('/reportes-ia/:reporteId/score', verifyToken, actualizarPuntajeReporteIA);
router.post('/reportes-ia/:reporteId/pdf', verifyToken, generarPDFReporteIA);

// Ruta para análisis completo con URLs (usado por calificación masiva)
// Esta ruta estará disponible en /ugel-talara/documentos/analyze-anexos-completo
// También necesita estar disponible en /reports/analyze-anexos-completo para compatibilidad
router.post('/analyze-anexos-completo', verifyToken, analizarAnexosCompleto);

// Ruta para obtener candidatos con CV (usado por el frontend)
router.get('/candidates-with-cv', verifyToken, obtenerCandidatosConCV);

// Ruta de estadísticas
import { obtenerEstadisticas } from '../controllers/estadisticas.controller.js';
router.get('/estadisticas', verifyToken, obtenerEstadisticas);
router.get('/stats', verifyToken, obtenerEstadisticas); // Alias para /reports/stats

export default router;

