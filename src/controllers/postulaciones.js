import { pool } from '../database/conexion.js';

async function ensurePostulacionesTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'postulaciones'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS postulaciones (
          IDPOSTULACION INT AUTO_INCREMENT PRIMARY KEY,
          IDUSUARIO INT NOT NULL,
          IDCONVOCATORIA INT NOT NULL,
          IDANEXO INT NULL,
          IDCURRICULUM INT NULL,
          estado ENUM('registrada', 'anulada') DEFAULT 'registrada',
          datosAnexo LONGTEXT NULL COMMENT 'JSON con datos del anexo al momento de postular',
          declaracionesJuradas LONGTEXT NULL COMMENT 'JSON con declaraciones juradas',
          pdfGenerado LONGBLOB NULL COMMENT 'PDF de la postulación con anexos y declaraciones',
          nombrePDF VARCHAR(255) NULL,
          fechaRegistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unq_usuario_convocatoria (IDUSUARIO, IDCONVOCATORIA),
          INDEX idx_usuario (IDUSUARIO),
          INDEX idx_convocatoria (IDCONVOCATORIA),
          INDEX idx_anexo (IDANEXO),
          INDEX idx_curriculum (IDCURRICULUM)
        )
      `);
      console.log('✅ Tabla postulaciones creada exitosamente');
    } else {
      const [columns] = await pool.execute(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'postulaciones'`
      );
      const columnNames = columns.map((col) => col.COLUMN_NAME);

      // Agregar columnas nuevas si no existen
      if (!columnNames.includes('fechaActualizacion')) {
        await pool.execute(`
          ALTER TABLE postulaciones
          ADD COLUMN fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        `);
      }
      if (!columnNames.includes('estado')) {
        await pool.execute(`
          ALTER TABLE postulaciones
          ADD COLUMN estado ENUM('registrada', 'anulada') DEFAULT 'registrada'
        `);
      }
      if (!columnNames.includes('IDANEXO')) {
        await pool.execute(`
          ALTER TABLE postulaciones
          ADD COLUMN IDANEXO INT NULL AFTER IDCONVOCATORIA,
          ADD INDEX idx_anexo (IDANEXO)
        `);
        console.log('✅ Columna IDANEXO agregada a postulaciones');
      }
      if (!columnNames.includes('IDCURRICULUM')) {
        await pool.execute(`
          ALTER TABLE postulaciones
          ADD COLUMN IDCURRICULUM INT NULL AFTER IDANEXO,
          ADD INDEX idx_curriculum (IDCURRICULUM)
        `);
        console.log('✅ Columna IDCURRICULUM agregada a postulaciones');
      }
      if (!columnNames.includes('datosAnexo')) {
        await pool.execute(`
          ALTER TABLE postulaciones
          ADD COLUMN datosAnexo LONGTEXT NULL COMMENT 'JSON con datos del anexo al momento de postular'
        `);
        console.log('✅ Columna datosAnexo agregada a postulaciones');
      }
      if (!columnNames.includes('declaracionesJuradas')) {
        await pool.execute(`
          ALTER TABLE postulaciones
          ADD COLUMN declaracionesJuradas LONGTEXT NULL COMMENT 'JSON con declaraciones juradas'
        `);
        console.log('✅ Columna declaracionesJuradas agregada a postulaciones');
      }
      if (!columnNames.includes('pdfGenerado')) {
        await pool.execute(`
          ALTER TABLE postulaciones
          ADD COLUMN pdfGenerado LONGBLOB NULL COMMENT 'PDF de la postulación con anexos y declaraciones',
          ADD COLUMN nombrePDF VARCHAR(255) NULL
        `);
        console.log('✅ Columnas pdfGenerado y nombrePDF agregadas a postulaciones');
      }
      const [uniqueIndex] = await pool.execute(
        `SELECT INDEX_NAME 
         FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'postulaciones' 
         AND INDEX_NAME = 'unq_usuario_convocatoria'`
      );

      if (uniqueIndex.length === 0) {
        await pool.execute(`
          ALTER TABLE postulaciones
          ADD UNIQUE KEY unq_usuario_convocatoria (IDUSUARIO, IDCONVOCATORIA)
        `);
      }
    }
  } catch (error) {
    console.error('⚠️ Error al asegurar tabla postulaciones:', error.message);
    throw error;
  }
}

export async function initializePostulacionesModule() {
  try {
    await ensurePostulacionesTable();
  } catch (error) {
    console.error('⚠️ No se pudo inicializar el módulo de postulaciones:', error);
    throw error;
  }
}

async function ensurePostulantesRegistradosTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS postulantes_registrados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        IDUSUARIO INT NULL,
        certificadoId VARCHAR(255) UNIQUE NOT NULL,
        nombreCompleto VARCHAR(255) NOT NULL,
        apellidoPaterno VARCHAR(100),
        apellidoMaterno VARCHAR(100),
        dni VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        telefono VARCHAR(20),
        numeroCAS VARCHAR(50),
        puesto VARCHAR(255),
        area VARCHAR(255),
        convocatoriaId INT,
        anexoId INT,
        curriculumId INT,
        expedienteSIGEA VARCHAR(100),
        estado ENUM('Registrado', 'Pendiente', 'En proceso', 'Rechazado', 'Archivado') DEFAULT 'Pendiente',
        fechaRegistro DATETIME NOT NULL,
        fechaActualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_certificadoId (certificadoId),
        INDEX idx_dni (dni),
        INDEX idx_fechaRegistro (fechaRegistro),
        INDEX idx_estado (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'postulantes_registrados'`
    );
    const columnNames = columns.map((col) => col.COLUMN_NAME);

    if (!columnNames.includes('IDUSUARIO')) {
      await pool.execute(`
        ALTER TABLE postulantes_registrados
        ADD COLUMN IDUSUARIO INT NULL AFTER id
      `);
    }

    const [uniqueKeys] = await pool.execute(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'postulantes_registrados' 
         AND INDEX_NAME = 'uniq_usuario_convocatoria'`
    );

    if (uniqueKeys.length === 0) {
      await pool.execute(`
        ALTER TABLE postulantes_registrados
        ADD UNIQUE KEY uniq_usuario_convocatoria (IDUSUARIO, convocatoriaId)
      `);
    }
  } catch (error) {
    console.error('⚠️ Error al asegurar postulantes_registrados:', error);
  }
}

async function upsertPostulanteRegistrado({
  idUsuario,
  idConvocatoria,
  postulacionId,
  estadoPostulacion,
  fechaReferencia,
}) {
  try {
    await ensurePostulantesRegistradosTable();

    const [usuarios] = await pool.execute(
      `SELECT 
        IDUSUARIO,
        nombreCompleto,
        apellidoPaterno,
        apellidoMaterno,
        documento AS dni,
        correo AS email,
        telefono
       FROM usuarios
       WHERE IDUSUARIO = ?`,
      [idUsuario]
    );

    if (usuarios.length === 0) {
      console.warn('⚠️ No se encontró usuario para registrar en postulantes_registrados:', idUsuario);
      return;
    }

    const usuario = usuarios[0];
    const nombreCompleto =
      usuario.nombreCompleto ||
      [usuario.apellidoPaterno, usuario.apellidoMaterno]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      'Postulante';

    let convocatoriaData = null;
    if (idConvocatoria) {
      const [convocatorias] = await pool.execute(
        `SELECT 
           IDCONVOCATORIA,
           numeroCAS,
           area,
           puesto
         FROM convocatorias
         WHERE IDCONVOCATORIA = ?`,
        [idConvocatoria]
      );

      if (convocatorias.length > 0) {
        convocatoriaData = convocatorias[0];
      }
    }

    let anexoId = null;
    try {
      const [anexoRows] = await pool.execute(
        `SELECT IDANEXO 
         FROM anexos 
         WHERE IDUSUARIO = ? 
           AND (? IS NULL OR IDCONVOCATORIA = ?)
         ORDER BY fechaActualizacion DESC 
         LIMIT 1`,
        [idUsuario, idConvocatoria, idConvocatoria]
      );
      if (anexoRows.length > 0) {
        anexoId = anexoRows[0].IDANEXO;
      } else {
        const [anexoFallback] = await pool.execute(
          `SELECT IDANEXO 
           FROM anexos 
           WHERE IDUSUARIO = ?
           ORDER BY fechaActualizacion DESC
           LIMIT 1`,
          [idUsuario]
        );
        if (anexoFallback.length > 0) {
          anexoId = anexoFallback[0].IDANEXO;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error al obtener anexo del postulante:', error);
    }

    let curriculumId = null;
    try {
      const [curriculumRows] = await pool.execute(
        `SELECT IDCURRICULUM 
         FROM curriculum 
         WHERE IDUSUARIO = ?
         ORDER BY fechaCreacion DESC 
         LIMIT 1`,
        [idUsuario]
      );
      if (curriculumRows.length > 0) {
        curriculumId = curriculumRows[0].IDCURRICULUM;
      }
    } catch (error) {
      console.warn('⚠️ Error al obtener curriculum del postulante:', error);
    }

    const numeroCAS =
      convocatoriaData?.numeroCAS ||
      convocatoriaData?.numeroCas ||
      '';

    const puesto = convocatoriaData?.puesto || '';
    const area = convocatoriaData?.area || '';

    // Buscar registro existente por usuario y convocatoria
    // También buscar por certificadoId si ya existe uno válido
    const [existentes] = await pool.execute(
      `SELECT id, certificadoId, estado 
       FROM postulantes_registrados
       WHERE IDUSUARIO = ? 
         AND (
           (convocatoriaId IS NULL AND ? IS NULL) OR convocatoriaId = ?
         )
       ORDER BY fechaRegistro DESC
       LIMIT 1`,
      [idUsuario, idConvocatoria, idConvocatoria]
    );
    
    // También buscar si ya existe un certificadoId válido para este usuario y convocatoria
    // en caso de que el registro esté en otra convocatoria pero con el mismo certificadoId
    let certificadoIdExistente = null;
    if (existentes.length > 0 && existentes[0].certificadoId && existentes[0].certificadoId.startsWith('CERT-')) {
      certificadoIdExistente = existentes[0].certificadoId;
      console.log('✅ CertificadoId existente encontrado, preservándolo:', certificadoIdExistente);
    }

    const estadoNormalizado =
      estadoPostulacion === 'registrada' ? 'Pendiente' : 'Pendiente';

    if (existentes.length > 0) {
      const existente = existentes[0];
      
      // IMPORTANTE: Preservar el certificadoId existente si ya tiene formato CERT- válido
      // Solo generar uno nuevo si es null, POST- o no empieza con CERT-
      let certificadoIdActualizado = existente.certificadoId;
      
      // Verificar si el certificadoId existente es válido (formato CERT-)
      const tieneCertificadoValido = existente.certificadoId && 
                                      String(existente.certificadoId).startsWith('CERT-') &&
                                      String(existente.certificadoId).length > 10; // Mínimo formato válido
      
      if (!tieneCertificadoValido) {
        // Solo generar nuevo certificadoId si no hay uno válido
        // Formato: CERT-{userId}-{convocatoriaId}-{año}-{timestamp completo}
        const año = new Date().getFullYear();
        const timestamp = Date.now(); // Timestamp completo en milisegundos
        
        if (idConvocatoria) {
          certificadoIdActualizado = `CERT-${idUsuario}-${idConvocatoria}-${año}-${timestamp}`;
        } else {
          certificadoIdActualizado = `CERT-${idUsuario}-${año}-${timestamp}`;
        }
        
        console.log('🔄 Generando nuevo certificadoId (no había uno válido):', {
          antiguo: existente.certificadoId || 'null',
          nuevo: certificadoIdActualizado
        });
      } else {
        console.log('✅ Preservando certificadoId existente:', certificadoIdActualizado);
      }
      
      await pool.execute(
        `UPDATE postulantes_registrados
         SET
           certificadoId = ?,
           nombreCompleto = ?,
           apellidoPaterno = ?,
           apellidoMaterno = ?,
           dni = ?,
           email = ?,
           telefono = ?,
           numeroCAS = ?,
           puesto = ?,
           area = ?,
           convocatoriaId = ?,
           anexoId = ?,
           curriculumId = ?,
           estado = CASE 
             WHEN estado = 'Registrado' THEN estado
             ELSE ?
           END,
           fechaActualizacion = NOW()
         WHERE id = ?`,
        [
          certificadoIdActualizado,
          nombreCompleto,
          usuario.apellidoPaterno || '',
          usuario.apellidoMaterno || '',
          usuario.dni || '',
          usuario.email || '',
          usuario.telefono || '',
          numeroCAS || 'N/A',
          puesto || 'N/A',
          area || 'N/A',
          idConvocatoria || null,
          anexoId,
          curriculumId,
          estadoNormalizado,
          existente.id,
        ]
      );
    } else {
      // Crear nuevo registro
      // Si hay un certificadoId existente válido, usarlo; si no, generar uno nuevo
      let certificadoId;
      
      if (certificadoIdExistente) {
        // Usar el certificadoId existente si hay uno válido
        certificadoId = certificadoIdExistente;
        console.log('✅ Usando certificadoId existente para nuevo registro:', certificadoId);
      } else {
        // Generar certificadoId real con formato CERT-{userId}-{convocatoriaId}-{año}-{timestamp completo}
        // Usando EXACTAMENTE el mismo formato que en el frontend
        const año = new Date().getFullYear();
        const timestamp = Date.now(); // Timestamp completo en milisegundos
        
        if (idConvocatoria) {
          certificadoId = `CERT-${idUsuario}-${idConvocatoria}-${año}-${timestamp}`;
        } else {
          // Si no hay convocatoria, usar formato sin convocatoria
          certificadoId = `CERT-${idUsuario}-${año}-${timestamp}`;
        }
        
        console.log('✅ CertificadoId generado con formato CERT-:', certificadoId);
      }
      
      await pool.execute(
        `INSERT INTO postulantes_registrados (
           IDUSUARIO,
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
           fechaRegistro
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`,
        [
          idUsuario,
          certificadoId,
          nombreCompleto,
          usuario.apellidoPaterno || '',
          usuario.apellidoMaterno || '',
          usuario.dni || '',
          usuario.email || '',
          usuario.telefono || '',
          numeroCAS || 'N/A',
          puesto || 'N/A',
          area || 'N/A',
          idConvocatoria || null,
          anexoId,
          curriculumId,
          estadoNormalizado,
          fechaReferencia || new Date(),
        ]
      );
    }
  } catch (error) {
    console.error('⚠️ Error al sincronizar postulante registrado:', error);
  }
}

export const registrarPostulacion = async (req, res) => {
  try {
    await ensurePostulacionesTable();

    const { idUsuario, idConvocatoria, omitirValidacion } = req.body || {};

    console.log('📝 Intentando registrar postulación:', { idUsuario, idConvocatoria });

    if (!idUsuario || !idConvocatoria) {
      console.error('❌ Faltan datos requeridos:', { idUsuario, idConvocatoria });
      return res.status(400).json({
        success: false,
        message: 'idUsuario e idConvocatoria son obligatorios',
      });
    }

    // Validación automática de requisitos (opcional, se puede omitir)
    if (!omitirValidacion) {
      try {
        const { validarPostulanteContraConvocatoria } = await import('../utils/validacionAutomatica.js');
        const resultadoValidacion = await validarPostulanteContraConvocatoria(idUsuario, idConvocatoria);
        
        // Si no cumple requisitos, devolver advertencia pero permitir postulación
        if (!resultadoValidacion.cumpleRequisitos) {
          console.warn(`⚠️ Usuario ${idUsuario} no cumple todos los requisitos para convocatoria ${idConvocatoria}`);
          // Puedes descomentar la siguiente línea para bloquear postulaciones que no cumplan requisitos
          // return res.status(400).json({
          //   success: false,
          //   message: resultadoValidacion.mensaje,
          //   validacion: resultadoValidacion
          // });
        }
      } catch (validationError) {
        console.warn('⚠️ Error en validación automática, continuando con postulación:', validationError.message);
      }
    }

    // Verificar si ya existe una postulación para esta convocatoria
    const [existing] = await pool.execute(
      `SELECT IDPOSTULACION, estado 
       FROM postulaciones 
       WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?`,
      [idUsuario, idConvocatoria]
    );

    console.log('🔍 Verificando postulación existente:', { 
      existe: existing.length > 0, 
      estado: existing.length > 0 ? existing[0].estado : 'N/A' 
    });

    if (existing.length > 0) {
      const postulacion = existing[0];

      // Si ya está registrada, no permitir duplicado
      if (postulacion.estado === 'registrada') {
        console.warn('⚠️ Postulación duplicada bloqueada:', { idUsuario, idConvocatoria });
        return res.status(409).json({
          success: false,
          message: 'Ya estás registrado en esta convocatoria. No puedes postular dos veces a la misma convocatoria.',
        });
      }

      // Si estaba anulada, reactivarla
      console.log('🔄 Reactivando postulación anulada...');

      await upsertPostulanteRegistrado({
        idUsuario,
        idConvocatoria,
        postulacionId: postulacion.IDPOSTULACION,
        estadoPostulacion: postulacion.estado,
        fechaReferencia: postulacion.fechaRegistro,
      });

      // Se eliminó la validación de límite de 2 postulaciones activas
      // Ahora se permite postular a múltiples convocatorias diferentes
      // Solo se valida que no postule dos veces a la misma convocatoria

      await pool.execute(
        `UPDATE postulaciones 
         SET estado = 'registrada', fechaActualizacion = CURRENT_TIMESTAMP 
         WHERE IDPOSTULACION = ?`,
        [postulacion.IDPOSTULACION]
      );

      await upsertPostulanteRegistrado({
        idUsuario,
        idConvocatoria,
        postulacionId: postulacion.IDPOSTULACION,
        estadoPostulacion: 'registrada',
        fechaReferencia: postulacion.fechaRegistro,
      });

      return res.json({
        success: true,
        message: 'Postulación reactivada correctamente.',
        data: {
          idPostulacion: postulacion.IDPOSTULACION,
          idUsuario,
          idConvocatoria,
          estado: 'registrada',
        }
      });
    }

    // Se eliminó la validación de límite de 2 postulaciones activas
    // Ahora se permite postular a múltiples convocatorias diferentes
    // Solo se valida que no postule dos veces a la misma convocatoria

    console.log('✅ Creando nueva postulación...');

    const [result] = await pool.execute(
      `INSERT INTO postulaciones (IDUSUARIO, IDCONVOCATORIA, estado) VALUES (?, ?, 'registrada')`,
      [idUsuario, idConvocatoria]
    );

    console.log('✅ Postulación creada con ID:', result.insertId);

    await upsertPostulanteRegistrado({
      idUsuario,
      idConvocatoria,
      postulacionId: result.insertId,
      estadoPostulacion: 'registrada',
      fechaReferencia: new Date(),
    });

    console.log('✅ Postulación registrada exitosamente');

    return res.status(201).json({
      success: true,
      message: 'Postulación registrada correctamente.',
      data: {
        idPostulacion: result.insertId,
        idUsuario,
        idConvocatoria,
        estado: 'registrada',
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Ya estás registrado en esta convocatoria.',
      });
    }

    console.error('❌ Error al registrar postulación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar la postulación.',
      error: error.message,
    });
  }
};

export const obtenerPostulacionesUsuario = async (req, res) => {
  try {
    await ensurePostulacionesTable();

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId es requerido',
      });
    }

    const [rows] = await pool.execute(
      `SELECT p.IDPOSTULACION, p.IDUSUARIO, p.IDCONVOCATORIA, p.estado, p.fechaRegistro, p.fechaActualizacion,
              c.puesto, c.area, c.numeroCAS, c.numeroCas
       FROM postulaciones p
       LEFT JOIN convocatorias c ON c.IDCONVOCATORIA = p.IDCONVOCATORIA
       WHERE p.IDUSUARIO = ?
       ORDER BY p.fechaRegistro DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('❌ Error al obtener postulaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las postulaciones.',
      error: error.message,
    });
  }
};

export const anularPostulacion = async (req, res) => {
  try {
    await ensurePostulacionesTable();

    const { postulacionId } = req.params;

    if (!postulacionId) {
      return res.status(400).json({
        success: false,
        message: 'postulacionId es requerido',
      });
    }

    const [result] = await pool.execute(
      `UPDATE postulaciones 
       SET estado = 'anulada', fechaActualizacion = CURRENT_TIMESTAMP 
       WHERE IDPOSTULACION = ?`,
      [postulacionId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Postulación no encontrada.',
      });
    }

    return res.json({
      success: true,
      message: 'Postulación anulada correctamente.',
    });
  } catch (error) {
    console.error('❌ Error al anular postulación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al anular la postulación.',
      error: error.message,
    });
  }
};



/**
 * Endpoint para validar si un usuario cumple con los requisitos de una convocatoria
 * GET /api/postulaciones/validar/:idUsuario/:idConvocatoria
 */
export const validarRequisitosPostulacion = async (req, res) => {
  try {
    const { idUsuario, idConvocatoria } = req.params;

    if (!idUsuario || !idConvocatoria) {
      return res.status(400).json({
        success: false,
        message: 'idUsuario e idConvocatoria son requeridos'
      });
    }

    const { validarPostulanteContraConvocatoria, generarMensajeValidacion } = await import('../utils/validacionAutomatica.js');
    
    const resultadoValidacion = await validarPostulanteContraConvocatoria(
      parseInt(idUsuario), 
      parseInt(idConvocatoria)
    );

    const mensajeFormateado = generarMensajeValidacion(resultadoValidacion);

    return res.json({
      success: true,
      cumpleRequisitos: resultadoValidacion.cumpleRequisitos,
      mensaje: resultadoValidacion.mensaje,
      mensajeDetallado: mensajeFormateado,
      validacion: resultadoValidacion
    });

  } catch (error) {
    console.error('❌ Error al validar requisitos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar requisitos de la postulación',
      error: error.message
    });
  }
};
