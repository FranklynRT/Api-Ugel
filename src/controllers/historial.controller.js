import { pool } from '../database/conexion.js';

// ============================================================
// CONTROLADOR: HISTORIAL DE TRÁMITES
// ============================================================

/**
 * Asegurar que la tabla historial_postulaciones tiene las columnas necesarias
 */
const asegurarTablaHistorialPostulaciones = async () => {
  try {
    // Agregar columnas faltantes si no existen
    const columnasNecesarias = [
      { nombre: 'certificado_id', tipo: 'VARCHAR(255)' },
      { nombre: 'apellido_paterno', tipo: 'VARCHAR(100)' },
      { nombre: 'apellido_materno', tipo: 'VARCHAR(100)' },
      { nombre: 'email', tipo: 'VARCHAR(255)' },
      { nombre: 'telefono', tipo: 'VARCHAR(20)' },
      { nombre: 'expediente_sigea', tipo: 'VARCHAR(100)' },
      { nombre: 'estado', tipo: "ENUM('Registrado', 'Rechazado', 'Archivado', 'Pendiente')" },
      { nombre: 'motivo_rechazo', tipo: 'TEXT' },
      { nombre: 'usuario_accion', tipo: 'VARCHAR(255)' }
    ];

    for (const columna of columnasNecesarias) {
      try {
        await pool.execute(`
          ALTER TABLE historial_postulaciones 
          ADD COLUMN ${columna.nombre} ${columna.tipo}
        `);
        console.log(`✅ Columna ${columna.nombre} agregada a historial_postulaciones`);
      } catch (error) {
        // Ignorar error si la columna ya existe
        if (!error.message.includes('Duplicate column name')) {
          console.warn(`⚠️ Error al agregar columna ${columna.nombre}:`, error.message);
        }
      }
    }
    
    console.log('✅ Tabla historial_postulaciones verificada/actualizada');
  } catch (error) {
    console.error('❌ Error al actualizar tabla historial_postulaciones:', error);
  }
};

/**
 * Guardar en historial cuando se registra o rechaza un postulante
 */
export const guardarEnHistorial = async (req, res) => {
  try {
    await asegurarTablaHistorialPostulaciones();

    const {
      postulanteId,
      certificadoId,
      nombreCompleto,
      apellidoPaterno,
      apellidoMaterno,
      dni,
      email,
      telefono,
      numeroCAS,
      puesto,
      area,
      convocatoriaId,
      anexoId,
      curriculumId,
      expedienteSIGEA,
      estado,
      motivoRechazo,
      usuarioAccion
    } = req.body;

    if (!postulanteId || !nombreCompleto || !estado) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos: postulanteId, nombreCompleto, estado'
      });
    }

    const fechaAccion = new Date();

    await pool.execute(`
      INSERT INTO historial_postulaciones (
        usuario_id, convocatoria_id, anexo_id, curriculum_id,
        certificado_id, nombre_completo, apellido_paterno, apellido_materno,
        dni, email, telefono, numero_cas, puesto, area,
        expediente_sigea, estado, motivo_rechazo, fecha_accion, usuario_accion, accion, detalles
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      postulanteId, convocatoriaId, anexoId, curriculumId,
      certificadoId, nombreCompleto, apellidoPaterno, apellidoMaterno,
      dni, email, telefono, numeroCAS, puesto, area,
      expedienteSIGEA, estado, motivoRechazo, fechaAccion, usuarioAccion,
      estado, // accion
      `Postulante ${estado.toLowerCase()} en mesa de partes` // detalles
    ]);

    console.log(`✅ Postulante ${nombreCompleto} guardado en historial con estado: ${estado}`);

    res.json({
      success: true,
      message: 'Guardado en historial exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al guardar en historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar en historial',
      details: error.message
    });
  }
};

/**
 * Obtener historial de trámites
 * IMPORTANTE: Solo muestra postulantes que YA fueron procesados (Registrado, Rechazado, Archivado)
 * Los postulantes con estado "Pendiente" NO aparecen aquí, aparecen en Mesa de Partes
 */
export const obtenerHistorialTramites = async (req, res) => {
  try {
    console.log('🔍 [HISTORIAL] Petición recibida para obtener historial');
    await asegurarTablaHistorialPostulaciones();

    const { estado, desde, hasta } = req.query;

    // Obtener postulantes procesados desde postulantes_registrados
    // EXCLUIR los que tienen estado "Pendiente" (esos van a Mesa de Partes)
    let query = `
      SELECT 
        id,
        certificadoId,
        nombreCompleto,
        apellidoPaterno,
        apellidoMaterno,
        dni,
        email,
        telefono,
        numeroCAS,
        puesto,
        area,
        expedienteSIGEA,
        estado,
        fechaRegistro,
        fechaActualizacion as fechaAccion
      FROM postulantes_registrados 
      WHERE estado IN ('Registrado', 'Rechazado', 'Archivado')
    `;
    const params = [];

    // Filtrar por estado específico si se solicita
    if (estado && estado !== 'todos') {
      query = `
        SELECT 
          id,
          certificadoId,
          nombreCompleto,
          apellidoPaterno,
          apellidoMaterno,
          dni,
          email,
          telefono,
          numeroCAS,
          puesto,
          area,
          expedienteSIGEA,
          estado,
          fechaRegistro,
          fechaActualizacion as fechaAccion
        FROM postulantes_registrados 
        WHERE estado = ?
      `;
      params.push(estado);
    }

    if (desde) {
      query += ' AND fechaRegistro >= ?';
      params.push(desde);
    }

    if (hasta) {
      query += ' AND fechaRegistro <= ?';
      params.push(hasta);
    }

    query += ' ORDER BY fechaActualizacion DESC, fechaRegistro DESC';

    console.log('🔍 [HISTORIAL] Ejecutando query:', query);
    console.log('📊 [HISTORIAL] Parámetros:', params);

    const [historial] = await pool.execute(query, params);

    console.log(`✅ [HISTORIAL] Historial obtenido: ${historial.length} registro(s)`);
    console.log(`📊 [HISTORIAL] Estados en historial:`, historial.map(h => h.estado));
    
    // Los datos ya vienen en el formato correcto desde postulantes_registrados
    const historialMapeado = historial.map(h => ({
      id: h.id,
      certificadoId: h.certificadoId,
      nombreCompleto: h.nombreCompleto,
      apellidoPaterno: h.apellidoPaterno,
      apellidoMaterno: h.apellidoMaterno,
      dni: h.dni,
      email: h.email,
      telefono: h.telefono,
      numeroCAS: h.numeroCAS,
      puesto: h.puesto,
      area: h.area,
      expedienteSIGEA: h.expedienteSIGEA,
      estado: h.estado,
      fechaAccion: h.fechaAccion || h.fechaRegistro,
      fechaRegistro: h.fechaRegistro
    }));
    
    // Mostrar muestra de los primeros registros
    if (historialMapeado.length > 0) {
      console.log('📋 Muestra de registros:', historialMapeado.slice(0, 3).map(h => ({
        id: h.id,
        nombre: h.nombreCompleto,
        estado: h.estado,
        fecha: h.fechaAccion
      })));
    }

    res.json({
      success: true,
      historial: historialMapeado
    });

  } catch (error) {
    console.error('❌ Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial',
      details: error.message
    });
  }
};

export default {
  guardarEnHistorial,
  obtenerHistorialTramites
};
