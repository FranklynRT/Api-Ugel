import { pool } from "../database/conexion.js";

export async function obtenerDatosPostulante(postulanteId, convocatoriaId) {
  const [convocatoriaRows] = await pool.execute("SELECT * FROM convocatorias WHERE id = ?", [convocatoriaId]);
  const [anexosRows] = await pool.execute("SELECT * FROM Anexos WHERE IDUSUARIO = ?", [postulanteId]);

  return {
    convocatoria: convocatoriaRows[0],
    anexos: anexosRows,
  };
}

export async function ejecutarConsulta(query, params = []) {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('Error ejecutando consulta:', error);
    throw error;
  }
}

// Exportar un objeto con todas las funciones para compatibilidad
export default {
  obtenerDatosPostulante,
  ejecutarConsulta
};