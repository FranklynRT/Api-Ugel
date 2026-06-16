import { pool } from '../database/conexion.js';

/**
 * Obtener estadísticas generales de documentos
 * GET /ugel-talara/documentos/estadisticas
 */
export const obtenerEstadisticas = async (req, res) => {
  try {
    // Contar postulantes registrados
    const [postulantes] = await pool.execute(
      "SELECT COUNT(*) as total FROM postulantes_registrados WHERE estado = 'Registrado'"
    );

    // Contar CVs
    const [cvs] = await pool.execute(
      "SELECT COUNT(DISTINCT curriculumId) as total FROM postulantes_registrados WHERE curriculumId IS NOT NULL AND estado = 'Registrado'"
    );

    // Contar anexos
    const [anexos] = await pool.execute(
      "SELECT COUNT(DISTINCT anexoId) as total FROM postulantes_registrados WHERE anexoId IS NOT NULL AND estado = 'Registrado'"
    );

    // Contar convocatorias activas
    const [convocatorias] = await pool.execute(
      "SELECT COUNT(*) as total FROM convocatorias WHERE estado = 'activo'"
    );

    res.json({
      success: true,
      estadisticas: {
        totalPostulantes: postulantes[0].total || 0,
        totalCVs: cvs[0].total || 0,
        totalAnexos: anexos[0].total || 0,
        totalConvocatorias: convocatorias[0].total || 0
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
};

export default {
  obtenerEstadisticas
};
