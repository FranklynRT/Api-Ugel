import { pool } from '../database/conexion.js';
import { initializePostulacionesModule } from './postulaciones.js';
import { guardarEnHistorial } from './historial.controller.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear carpeta para constancias si no existe
const CONSTANCIAS_DIR = path.join(__dirname, '../../uploads/constancias');
if (!fs.existsSync(CONSTANCIAS_DIR)) {
  fs.mkdirSync(CONSTANCIAS_DIR, { recursive: true });
  console.log('✅ Carpeta de constancias creada:', CONSTANCIAS_DIR);
}

// ============================================================
// CONTROLADOR: VERIFICACIONES DE QR - UGEL TALARA
// ============================================================

/**
 * Asegurar que la tabla verificaciones_qr existe
 */
const asegurarTablaVerificaciones = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS verificaciones_qr (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigoCertificado VARCHAR(255) UNIQUE NOT NULL,
        datosQR JSON,
        datosVerificados JSON,
        fechaRegistro DATETIME NOT NULL,
        fechaActualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_codigoCertificado (codigoCertificado),
        INDEX idx_fechaRegistro (fechaRegistro)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla verificaciones_qr verificada/creada');
  } catch (error) {
    console.error('❌ Error al crear tabla verificaciones_qr:', error);
  }
};

/**
 * Asegurar que la tabla postulantes_registrados existe
 */
export const asegurarTablaPostulantesRegistrados = async () => {
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
        archivoConstancia VARCHAR(255),
        estado ENUM('Registrado', 'Pendiente', 'En proceso', 'Rechazado', 'Archivado') DEFAULT 'Pendiente',
        fechaRegistro DATETIME NOT NULL,
        fechaActualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_certificadoId (certificadoId),
        INDEX idx_dni (dni),
        INDEX idx_fechaRegistro (fechaRegistro),
        INDEX idx_estado (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Verificar si existe la columna archivoConstancia
    const [columnsArchivo] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'postulantes_registrados' 
         AND COLUMN_NAME = 'archivoConstancia'`
    );

    if (columnsArchivo.length === 0) {
      try {
        await pool.execute(`
          ALTER TABLE postulantes_registrados
          ADD COLUMN archivoConstancia VARCHAR(255) AFTER expedienteSIGEA
        `);
        console.log('✅ Columna archivoConstancia agregada a postulantes_registrados');
      } catch (alterError) {
        console.warn('⚠️ No se pudo agregar columna archivoConstancia:', alterError.message);
      }
    }

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
      console.log('✅ Columna IDUSUARIO agregada a postulantes_registrados');
    }

    if (!columnNames.includes('imagenConstancia')) {
      await pool.execute(`
        ALTER TABLE postulantes_registrados
        ADD COLUMN imagenConstancia LONGBLOB
      `);
      console.log('✅ Columna imagenConstancia agregada a postulantes_registrados');
    }

    // Verificar si el ENUM incluye 'Rechazado' y 'Archivado', si no, agregarlos
    const [columnInfo] = await pool.execute(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'postulantes_registrados' 
         AND COLUMN_NAME = 'estado'`
    );

    if (columnInfo.length > 0) {
      const columnType = columnInfo[0].COLUMN_TYPE;

      // Verificar si falta 'Rechazado' o 'Archivado'
      const faltaRechazado = !columnType.includes("'Rechazado'");
      const faltaArchivado = !columnType.includes("'Archivado'");

      if (faltaRechazado || faltaArchivado) {
        try {
          await pool.execute(`
            ALTER TABLE postulantes_registrados
            MODIFY COLUMN estado ENUM('Registrado', 'Pendiente', 'En proceso', 'Rechazado', 'Archivado') DEFAULT 'Pendiente'
          `);
          console.log('✅ Estados "Rechazado" y "Archivado" agregados al ENUM de postulantes_registrados');
        } catch (alterError) {
          console.warn('⚠️ No se pudo actualizar el ENUM (puede que ya exista):', alterError.message);
        }
      }
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
      console.log('✅ Índice único uniq_usuario_convocatoria agregado a postulantes_registrados');
    }
  } catch (error) {
    console.error('❌ Error al asegurar tabla postulantes_registrados:', error);
  }
};

// ============================================================
// FUNCIONES AUXILIARES PARA MANEJO DE CONSTANCIAS
// ============================================================

/**
 * Guardar imagen de constancia en el sistema de archivos
 * @param {string} certificadoId - ID del certificado
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {string} - Ruta del archivo guardado
 */
const guardarConstanciaEnArchivo = (certificadoId, imageBuffer) => {
  try {
    // Limpiar el certificadoId para usarlo como nombre de archivo
    const nombreArchivo = `${certificadoId.replace(/[^a-zA-Z0-9-]/g, '_')}.png`;
    const rutaArchivo = path.join(CONSTANCIAS_DIR, nombreArchivo);
    
    // Guardar el archivo
    fs.writeFileSync(rutaArchivo, imageBuffer);
    console.log(`✅ Constancia guardada: ${nombreArchivo}`);
    
    return nombreArchivo;
  } catch (error) {
    console.error('❌ Error al guardar constancia:', error);
    throw error;
  }
};

/**
 * Leer imagen de constancia desde el sistema de archivos
 * @param {string} nombreArchivo - Nombre del archivo
 * @returns {Buffer|null} - Buffer de la imagen o null si no existe
 */
const leerConstanciaDesdeArchivo = (nombreArchivo) => {
  try {
    const rutaArchivo = path.join(CONSTANCIAS_DIR, nombreArchivo);
    
    if (fs.existsSync(rutaArchivo)) {
      return fs.readFileSync(rutaArchivo);
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error al leer constancia:', error);
    return null;
  }
};

/**
 * Obtener nombre de archivo de constancia desde certificadoId
 * @param {string} certificadoId - ID del certificado
 * @returns {string} - Nombre del archivo
 */
const obtenerNombreArchivoConstancia = (certificadoId) => {
  return `${certificadoId.replace(/[^a-zA-Z0-9-]/g, '_')}.png`;
};

/**
 * Verificar si existe una constancia en el sistema de archivos
 * @param {string} certificadoId - ID del certificado
 * @returns {boolean} - true si existe, false si no
 */
const existeConstancia = (certificadoId) => {
  const nombreArchivo = obtenerNombreArchivoConstancia(certificadoId);
  const rutaArchivo = path.join(CONSTANCIAS_DIR, nombreArchivo);
  return fs.existsSync(rutaArchivo);
};

// Inicializar tablas al cargar el módulo
(async () => {
  await asegurarTablaVerificaciones();
  await asegurarTablaPostulantesRegistrados();
})();

/**
 * Crear una nueva verificación de QR
 * POST /ugel-talara/documentos/verificacion
 */
export const crearVerificacion = async (req, res) => {
  try {
    await asegurarTablaVerificaciones();

    const { codigoCertificado, datosQR, datosVerificados } = req.body;

    if (!codigoCertificado) {
      return res.status(400).json({
        success: false,
        error: 'El código del certificado es requerido'
      });
    }

    // Verificar si ya existe
    const [existentes] = await pool.execute(
      'SELECT id FROM verificaciones_qr WHERE codigoCertificado = ?',
      [codigoCertificado]
    );

    if (existentes.length > 0) {
      // Actualizar existente
      await pool.execute(
        `UPDATE verificaciones_qr 
         SET datosQR = ?, datosVerificados = ?, fechaActualizacion = CURRENT_TIMESTAMP 
         WHERE codigoCertificado = ?`,
        [JSON.stringify(datosQR), JSON.stringify(datosVerificados), codigoCertificado]
      );

      return res.status(200).json({
        success: true,
        message: 'Verificación actualizada correctamente',
        id: existentes[0].id
      });
    }

    // Crear nueva
    const [result] = await pool.execute(
      `INSERT INTO verificaciones_qr (codigoCertificado, datosQR, datosVerificados, fechaRegistro) 
       VALUES (?, ?, ?, NOW())`,
      [codigoCertificado, JSON.stringify(datosQR), JSON.stringify(datosVerificados)]
    );

    res.status(201).json({
      success: true,
      message: 'Verificación creada correctamente',
      id: result.insertId
    });
  } catch (error) {
    console.error('❌ Error al crear verificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear verificación',
      details: error.message
    });
  }
};

/**
 * Obtener todas las verificaciones (para el comité)
 * GET /ugel-talara/documentos/verificaciones-sesion-comite
 */
export const obtenerVerificacionesComite = async (req, res) => {
  try {
    await asegurarTablaVerificaciones();

    const [rows] = await pool.execute(
      'SELECT * FROM verificaciones_qr ORDER BY fechaRegistro DESC'
    );

    const verificaciones = rows.map(row => ({
      ...row,
      datosQR: typeof row.datosQR === 'string' ? JSON.parse(row.datosQR) : row.datosQR,
      datosVerificados: typeof row.datosVerificados === 'string' ? JSON.parse(row.datosVerificados) : row.datosVerificados
    }));

    res.status(200).json(verificaciones);
  } catch (error) {
    console.error('❌ Error al obtener verificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener verificaciones',
      details: error.message
    });
  }
};

/**
 * Verificar un certificado por código (público)
 * GET /ugel-talara/documentos/verificar-certificado/:codigo
 */
export const verificarCertificado = async (req, res) => {
  try {
    const { codigo } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM verificaciones_qr WHERE codigoCertificado = ?',
      [codigo]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Certificado no encontrado'
      });
    }

    const verificacion = rows[0];
    verificacion.datosQR = typeof verificacion.datosQR === 'string' ? JSON.parse(verificacion.datosQR) : verificacion.datosQR;
    verificacion.datosVerificados = typeof verificacion.datosVerificados === 'string' ? JSON.parse(verificacion.datosVerificados) : verificacion.datosVerificados;

    res.status(200).json({
      success: true,
      verificacion
    });
  } catch (error) {
    console.error('❌ Error al verificar certificado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar certificado',
      details: error.message
    });
  }
};

/**
 * Obtener postulantes registrados
 * GET /ugel-talara/documentos/postulantes-registrados
 * Query params opcionales:
 *  - estado: filtrar por estado (ej: "Registrado", "Pendiente", "Rechazado")
 *  - convocatoriaId: filtrar por convocatoria específica
 *  - convocatorias: filtrar por múltiples convocatorias (array de IDs separados por coma)
 */
export const obtenerPostulantesRegistrados = async (req, res) => {
  try {
    await asegurarTablaPostulantesRegistrados();

    // Obtener parámetros de filtro
    const { estado, convocatoriaId, convocatorias } = req.query;

    // Construir query dinámicamente
    // Por defecto, solo mostrar postulantes con estado "Registrado" (excluir Rechazados y Archivados)
    let query = "SELECT * FROM postulantes_registrados WHERE 1=1";
    const params = [];

    // Filtro por estado
    if (estado) {
      if (estado === 'Registrado') {
        query += " AND estado = 'Registrado'";
        console.log(`🔍 Filtrando por estado: Registrado`);
      } else if (estado === 'Pendiente') {
        query += " AND (estado = 'Pendiente' OR estado IS NULL)";
        console.log(`🔍 Filtrando por estado: Pendiente`);
      } else if (estado === 'todos') {
        // No agregar filtro de estado
        console.log(`🔍 Mostrando todos los estados`);
      } else {
        query += " AND estado = ?";
        params.push(estado);
        console.log(`🔍 Filtrando por estado: ${estado}`);
      }
    } else {
      // Si no se especifica estado, solo mostrar "Pendiente" (excluir Registrados, Rechazados y Archivados)
      query += " AND (estado = 'Pendiente' OR estado IS NULL)";
      console.log(`🔍 Filtrando por estado por defecto: Pendiente`);
    }

    // Filtro por convocatoria única
    if (convocatoriaId) {
      query += " AND convocatoriaId = ?";
      params.push(convocatoriaId);
      console.log(`🔍 Filtrando por convocatoria: ${convocatoriaId}`);
    }
    // Filtro por múltiples convocatorias
    else if (convocatorias) {
      const convocatoriasArray = convocatorias.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (convocatoriasArray.length > 0) {
        query += ` AND convocatoriaId IN (${convocatoriasArray.map(() => '?').join(',')})`;
        params.push(...convocatoriasArray);
        console.log(`🔍 Filtrando por convocatorias: ${convocatoriasArray.join(', ')}`);
      }
    }

    query += " ORDER BY fechaRegistro DESC";

    console.log(`\n📊 EJECUTANDO QUERY SQL:`);
    console.log(`   Query: ${query}`);
    console.log(`   Parámetros: ${JSON.stringify(params)}`);

    const [rows] = await pool.execute(query, params);
    
    console.log(`📊 Resultados de la query: ${rows.length} registros`);
    if (rows.length > 0) {
      console.log(`📋 Primeros resultados:`, rows.slice(0, 3).map(r => ({
        id: r.id,
        nombre: r.nombreCompleto,
        convocatoria: r.convocatoriaId,
        estado: r.estado
      })));
    }

    // Formatear los datos para el frontend e incluir información de anexos y currículums
    const postulantes = await Promise.all(rows.map(async (row) => {
      const postulante = {
        id: row.id,
        certificadoId: row.certificadoId,
        nombreCompleto: row.nombreCompleto,
        apellidoPaterno: row.apellidoPaterno || '',
        apellidoMaterno: row.apellidoMaterno || '',
        dni: row.dni,
        email: row.email,
        telefono: row.telefono,
        numeroCAS: row.numeroCAS,
        puesto: row.puesto,
        area: row.area,
        convocatoriaId: row.convocatoriaId,
        anexoId: row.anexoId,
        curriculumId: row.curriculumId,
        expedienteSIGEA: row.expedienteSIGEA || '',
        fechaRegistro: row.fechaRegistro,
        fechaActualizacion: row.fechaActualizacion,
        estado: row.estado || 'Registrado',
        registrado: row.estado === 'Registrado' || row.registrado === 1 || row.registrado === true,
        anexo: null,
        curriculum: null
      };

      // Obtener información del anexo completo - Múltiples estrategias de búsqueda
      let anexoEncontrado = false;
      
      // Estrategia 1: Buscar en anexos_completos por IDUSUARIO y convocatoriaId (más confiable)
      if (row.IDUSUARIO && row.convocatoriaId && !anexoEncontrado) {
        try {
          const [anexos] = await pool.execute(
            'SELECT * FROM anexos_completos WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ? ORDER BY fechaCreacion DESC LIMIT 1',
            [row.IDUSUARIO, row.convocatoriaId]
          );
          if (anexos.length > 0) {
            // Log de todas las columnas del anexo para debugging
            console.log(`📋 Columnas del anexo ${anexos[0].IDANEXO}:`, Object.keys(anexos[0]));
            console.log(`📋 Datos del anexo ${anexos[0].IDANEXO}:`, anexos[0]);
            
            postulante.anexo = {
              id: anexos[0].IDANEXO,
              nombreArchivo: `Anexo_${anexos[0].IDANEXO}.pdf`,
              rutaArchivo: null, // Los anexos completos se almacenan en pdfFile
              fechaSubida: anexos[0].fechaCreacion,
              esAnexoCompleto: true,
              // Incluir TODOS los datos del anexo completo
              ...anexos[0], // Spread para incluir todas las columnas
              formacionAcademica: anexos[0].formacionAcademica,
              experienciaLaboral: anexos[0].experienciaLaboral,
              referenciasLaborales: anexos[0].referenciasLaborales,
              idiomas: anexos[0].idiomas,
              ofimatica: anexos[0].ofimatica,
              colegioProfesional: anexos[0].colegioProfesional
            };
            postulante.anexoId = anexos[0].IDANEXO;
            anexoEncontrado = true;
            console.log(`✅ Anexo completo encontrado por IDUSUARIO ${row.IDUSUARIO} + convocatoria ${row.convocatoriaId}: ANEXO-${anexos[0].IDANEXO}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error al buscar anexo completo por IDUSUARIO:`, error.message);
        }
      }
      
      // Estrategia 2: Buscar en anexos_completos por anexoId si existe
      if (row.anexoId && !anexoEncontrado) {
        try {
          const anexoIdNum = String(row.anexoId).replace('ANEXO-', '');
          const [anexos] = await pool.execute(
            'SELECT * FROM anexos_completos WHERE IDANEXO = ?',
            [anexoIdNum]
          );
          if (anexos.length > 0) {
            postulante.anexo = {
              id: anexos[0].IDANEXO,
              nombreArchivo: `Anexo_${anexos[0].IDANEXO}.pdf`,
              rutaArchivo: null,
              fechaSubida: anexos[0].fechaCreacion,
              esAnexoCompleto: true,
              formacionAcademica: anexos[0].formacionAcademica,
              experienciaLaboral: anexos[0].experienciaLaboral,
              referenciasLaborales: anexos[0].referenciasLaborales,
              idiomas: anexos[0].idiomas,
              ofimatica: anexos[0].ofimatica,
              colegioProfesional: anexos[0].colegioProfesional
            };
            anexoEncontrado = true;
            console.log(`✅ Anexo completo encontrado por anexoId: ${row.anexoId}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error al obtener anexo completo por anexoId:`, error.message);
        }
      }
      
      // Estrategia 3: Buscar por DNI si no se encontró y tenemos DNI
      if (row.dni && !anexoEncontrado) {
        try {
          // Primero buscar el usuario por DNI
          const [usuarios] = await pool.execute(
            'SELECT IDUSUARIO FROM usuarios WHERE documento = ? LIMIT 1',
            [row.dni]
          );
          if (usuarios.length > 0) {
            const userId = usuarios[0].IDUSUARIO;
            // Buscar anexo completo del usuario en la convocatoria
            const [anexos] = await pool.execute(
              'SELECT * FROM anexos_completos WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ? ORDER BY fechaCreacion DESC LIMIT 1',
              [userId, row.convocatoriaId]
            );
            if (anexos.length > 0) {
              postulante.anexo = {
                id: anexos[0].IDANEXO,
                nombreArchivo: `Anexo_${anexos[0].IDANEXO}.pdf`,
                rutaArchivo: null,
                fechaSubida: anexos[0].fechaCreacion,
                esAnexoCompleto: true,
                formacionAcademica: anexos[0].formacionAcademica,
                experienciaLaboral: anexos[0].experienciaLaboral,
                referenciasLaborales: anexos[0].referenciasLaborales,
                idiomas: anexos[0].idiomas,
                ofimatica: anexos[0].ofimatica,
                colegioProfesional: anexos[0].colegioProfesional
              };
              postulante.anexoId = anexos[0].IDANEXO;
              postulante.IDUSUARIO = userId; // Actualizar el IDUSUARIO
              anexoEncontrado = true;
              console.log(`✅ Anexo completo encontrado por DNI ${row.dni}: ANEXO-${anexos[0].IDANEXO}`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error al buscar anexo completo por DNI:`, error.message);
        }
      }
      
      if (!anexoEncontrado) {
        console.log(`ℹ️ No se encontró anexo completo para postulante ${row.nombreCompleto} (ID: ${row.id}, IDUSUARIO: ${row.IDUSUARIO}, DNI: ${row.dni}, Convocatoria: ${row.convocatoriaId})`);
      }

      // Obtener información del curriculum si existe
      if (row.curriculumId) {
        try {
          const cvIdNum = String(row.curriculumId).replace('CV-', '');
          const [cvs] = await pool.execute(
            'SELECT * FROM curriculum WHERE IDCURRICULUM = ?',
            [cvIdNum]
          );
          if (cvs.length > 0) {
            postulante.curriculum = {
              id: cvs[0].IDCURRICULUM,
              nombreArchivo: cvs[0].nombreArchivo || `CV_${cvs[0].IDCURRICULUM}.pdf`,
              rutaArchivo: cvs[0].archivoPath || cvs[0].filePath || null,
              fechaSubida: cvs[0].fechaCreacion
            };
          }
        } catch (error) {
          console.warn(`⚠️ Error al obtener curriculum ${row.curriculumId}:`, error.message);
        }
      }
      // Si no tiene curriculumId pero tiene IDUSUARIO, buscar su curriculum
      else if (row.IDUSUARIO) {
        try {
          const [cvs] = await pool.execute(
            'SELECT * FROM curriculum WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC LIMIT 1',
            [row.IDUSUARIO]
          );
          if (cvs.length > 0) {
            postulante.curriculum = {
              id: cvs[0].IDCURRICULUM,
              nombreArchivo: cvs[0].nombreArchivo || `CV_${cvs[0].IDCURRICULUM}.pdf`,
              rutaArchivo: cvs[0].archivoPath || cvs[0].filePath || null,
              fechaSubida: cvs[0].fechaCreacion
            };
            // Actualizar el curriculumId en el postulante para futuras referencias
            postulante.curriculumId = cvs[0].IDCURRICULUM;
            console.log(`✅ Curriculum encontrado para usuario ${row.IDUSUARIO}: CV-${cvs[0].IDCURRICULUM}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error al buscar curriculum por IDUSUARIO ${row.IDUSUARIO}:`, error.message);
        }
      }

      return postulante;
    }));

    console.log(`✅ Obtenidos ${postulantes.length} postulantes registrados (filtrados)`);
    console.log(`📋 Resumen por convocatoria:`, 
      postulantes.reduce((acc, p) => {
        acc[p.convocatoriaId] = (acc[p.convocatoriaId] || 0) + 1;
        return acc;
      }, {})
    );

    res.status(200).json({
      success: true,
      postulantes: postulantes,
      total: postulantes.length,
      filtros: {
        estado: estado || 'todos',
        convocatoriaId: convocatoriaId || null,
        convocatorias: convocatorias || null
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener postulantes registrados:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener postulantes registrados',
      details: error.message
    });
  }
};

/**
 * Obtener imagen de constancia de un postulante registrado
 * GET /ugel-talara/documentos/postulantes-registrados/:id/certificado-imagen
 */
export const obtenerImagenConstanciaPostulante = async (req, res) => {
  try {
    const { id } = req.params;
    
    await asegurarTablaPostulantesRegistrados();

    // Obtener información del postulante
    const [rows] = await pool.execute(
      "SELECT certificadoId, archivoConstancia, imagenConstancia FROM postulantes_registrados WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Postulante no encontrado'
      });
    }

    const { certificadoId, archivoConstancia, imagenConstancia } = rows[0];

    // Intentar leer desde archivo primero
    let imageBuffer = null;
    
    if (archivoConstancia) {
      imageBuffer = leerConstanciaDesdeArchivo(archivoConstancia);
      if (imageBuffer) {
        console.log(`✅ Constancia leída desde archivo: ${archivoConstancia}`);
      }
    }

    // Si no hay archivo, intentar desde la base de datos (migración)
    if (!imageBuffer && imagenConstancia) {
      imageBuffer = imagenConstancia;
      console.log(`⚠️ Constancia leída desde BD (migrar a archivo)`);
      
      // Migrar a archivo
      try {
        const nombreArchivo = guardarConstanciaEnArchivo(certificadoId, imagenConstancia);
        await pool.execute(
          "UPDATE postulantes_registrados SET archivoConstancia = ? WHERE id = ?",
          [nombreArchivo, id]
        );
        console.log(`✅ Constancia migrada a archivo: ${nombreArchivo}`);
      } catch (migrateError) {
        console.error('❌ Error al migrar constancia:', migrateError);
      }
    }

    // Si no hay imagen, buscar por certificadoId
    if (!imageBuffer && certificadoId) {
      const nombreArchivo = obtenerNombreArchivoConstancia(certificadoId);
      imageBuffer = leerConstanciaDesdeArchivo(nombreArchivo);
      
      if (imageBuffer) {
        // Actualizar la BD con el nombre del archivo
        await pool.execute(
          "UPDATE postulantes_registrados SET archivoConstancia = ? WHERE id = ?",
          [nombreArchivo, id]
        );
        console.log(`✅ Constancia encontrada y vinculada: ${nombreArchivo}`);
      }
    }

    if (!imageBuffer) {
      return res.status(404).json({
        success: false,
        error: 'Imagen de constancia no disponible'
      });
    }

    // Enviar la imagen como respuesta
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache por 1 día
    res.send(imageBuffer);
    
    console.log(`✅ Imagen de constancia enviada para postulante ID: ${id}`);
  } catch (error) {
    console.error('❌ Error al obtener imagen de constancia:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener imagen de constancia',
      details: error.message
    });
  }
};

export const registrarPostulante = async (req, res) => {
  try {
    await asegurarTablaPostulantesRegistrados();

    const {
      idVerificacion,
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
      anexoId,
      curriculumId,
      convocatoriaId,
      expedienteSIGEA,
      IDUSUARIO
    } = req.body;

    const anexoIdFinal = anexoId || null;
    const curriculumIdFinal = curriculumId || null;

    // Buscar archivo de constancia del certificado en registros existentes
    let archivoConstancia = null;
    try {
      // Primero intentar buscar por certificadoId exacto
      const [imgRows] = await pool.execute(
        'SELECT archivoConstancia FROM postulantes_registrados WHERE certificadoId = ? AND archivoConstancia IS NOT NULL LIMIT 1',
        [certificadoId]
      );

      if (imgRows.length > 0 && imgRows[0].archivoConstancia) {
        archivoConstancia = imgRows[0].archivoConstancia;
        console.log(`✅ Archivo de constancia encontrado para certificado ${certificadoId}: ${archivoConstancia}`);
      } else if (IDUSUARIO) {
        // Si no se encuentra, buscar por IDUSUARIO
        const [userImgRows] = await pool.execute(
          'SELECT archivoConstancia FROM postulantes_registrados WHERE IDUSUARIO = ? AND archivoConstancia IS NOT NULL ORDER BY fechaRegistro DESC LIMIT 1',
          [IDUSUARIO]
        );
        if (userImgRows.length > 0 && userImgRows[0].archivoConstancia) {
          archivoConstancia = userImgRows[0].archivoConstancia;
          console.log(`✅ Archivo de constancia encontrado para usuario ${IDUSUARIO}: ${archivoConstancia}`);
        }
      }
      
      // Si no se encontró archivo, verificar si existe el archivo físico basado en certificadoId
      if (!archivoConstancia && certificadoId) {
        const nombreArchivoEsperado = obtenerNombreArchivoConstancia(certificadoId);
        if (existeConstancia(certificadoId)) {
          archivoConstancia = nombreArchivoEsperado;
          console.log(`✅ Archivo de constancia encontrado en sistema de archivos: ${nombreArchivoEsperado}`);
        }
      }
    } catch (imgError) {
      console.warn('⚠️ Error al buscar archivo de constancia:', imgError.message);
    }

    // Verificar si ya existe - buscar por certificadoId primero (más específico)
    let existentes = [];
    
    // Prioridad 1: Buscar por certificadoId exacto
    if (certificadoId) {
      const [certRows] = await pool.execute(
        'SELECT * FROM postulantes_registrados WHERE certificadoId = ?',
        [certificadoId]
      );
      if (certRows.length > 0) {
        existentes = certRows;
      }
    }
    
    // Prioridad 2: Si no se encontró por certificadoId, buscar por IDUSUARIO + convocatoriaId
    if (existentes.length === 0 && IDUSUARIO && convocatoriaId) {
      const [userConvRows] = await pool.execute(
        'SELECT * FROM postulantes_registrados WHERE IDUSUARIO = ? AND convocatoriaId = ?',
        [IDUSUARIO, convocatoriaId]
      );
      if (userConvRows.length > 0) {
        existentes = userConvRows;
      }
    }
    
    // Prioridad 3: Si no se encontró, buscar por DNI + convocatoriaId (menos específico)
    if (existentes.length === 0 && dni && convocatoriaId) {
      const [dniConvRows] = await pool.execute(
        'SELECT * FROM postulantes_registrados WHERE dni = ? AND convocatoriaId = ?',
        [dni, convocatoriaId]
      );
      if (dniConvRows.length > 0) {
        existentes = dniConvRows;
      }
    }

    if (existentes.length > 0) {
      // Actualizar registro existente
      const existente = existentes[0];
      const postulanteId = existente.id;

      // Actualizar registro existente
      // Solo actualizar certificadoId si es el mismo registro o si no hay conflicto
      const actualizarCertificadoId = existente.certificadoId === certificadoId;
      
      if (archivoConstancia) {
        if (actualizarCertificadoId) {
          await pool.execute(`
            UPDATE postulantes_registrados SET 
              IDUSUARIO = ?, nombreCompleto = ?, apellidoPaterno = ?, apellidoMaterno = ?,
              email = ?, telefono = ?, numeroCAS = ?, puesto = ?, area = ?,
              anexoId = ?, curriculumId = ?, convocatoriaId = ?, expedienteSIGEA = ?,
              archivoConstancia = ?, estado = 'Registrado', fechaActualizacion = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            IDUSUARIO || existente.IDUSUARIO || null,
            nombreCompleto, apellidoPaterno, apellidoMaterno,
            email, telefono, numeroCAS, puesto, area,
            anexoIdFinal, curriculumIdFinal, convocatoriaId ? parseInt(convocatoriaId) : null, expedienteSIGEA,
            archivoConstancia, postulanteId
          ]);
        } else {
          await pool.execute(`
            UPDATE postulantes_registrados SET 
              IDUSUARIO = ?, certificadoId = ?, nombreCompleto = ?, apellidoPaterno = ?, apellidoMaterno = ?,
              email = ?, telefono = ?, numeroCAS = ?, puesto = ?, area = ?,
              anexoId = ?, curriculumId = ?, convocatoriaId = ?, expedienteSIGEA = ?,
              archivoConstancia = ?, estado = 'Registrado', fechaActualizacion = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            IDUSUARIO || existente.IDUSUARIO || null,
            certificadoId, nombreCompleto, apellidoPaterno, apellidoMaterno,
            email, telefono, numeroCAS, puesto, area,
            anexoIdFinal, curriculumIdFinal, convocatoriaId ? parseInt(convocatoriaId) : null, expedienteSIGEA,
            archivoConstancia, postulanteId
          ]);
        }
        console.log(`✅ Archivo de constancia actualizado para postulante ${postulanteId} (IDUSUARIO: ${IDUSUARIO || existente.IDUSUARIO}): ${archivoConstancia}`);
      } else {
        if (actualizarCertificadoId) {
          await pool.execute(`
            UPDATE postulantes_registrados SET 
              IDUSUARIO = ?, nombreCompleto = ?, apellidoPaterno = ?, apellidoMaterno = ?,
              email = ?, telefono = ?, numeroCAS = ?, puesto = ?, area = ?,
              anexoId = ?, curriculumId = ?, convocatoriaId = ?, expedienteSIGEA = ?,
              estado = 'Registrado', fechaActualizacion = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            IDUSUARIO || existente.IDUSUARIO || null,
            nombreCompleto, apellidoPaterno, apellidoMaterno,
            email, telefono, numeroCAS, puesto, area,
            anexoIdFinal, curriculumIdFinal, convocatoriaId ? parseInt(convocatoriaId) : null, expedienteSIGEA,
            postulanteId
          ]);
        } else {
          await pool.execute(`
            UPDATE postulantes_registrados SET 
              IDUSUARIO = ?, certificadoId = ?, nombreCompleto = ?, apellidoPaterno = ?, apellidoMaterno = ?,
              email = ?, telefono = ?, numeroCAS = ?, puesto = ?, area = ?,
              anexoId = ?, curriculumId = ?, convocatoriaId = ?, expedienteSIGEA = ?,
              estado = 'Registrado', fechaActualizacion = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            IDUSUARIO || existente.IDUSUARIO || null,
            certificadoId, nombreCompleto, apellidoPaterno, apellidoMaterno,
            email, telefono, numeroCAS, puesto, area,
            anexoIdFinal, curriculumIdFinal, convocatoriaId ? parseInt(convocatoriaId) : null, expedienteSIGEA,
            postulanteId
          ]);
        }
        console.log(`✅ Postulante ${postulanteId} actualizado (IDUSUARIO: ${IDUSUARIO || existente.IDUSUARIO})`);
      }

      // Guardar en historial (actualización)
      try {
        await pool.execute(
          `INSERT INTO historial_postulaciones (
            usuario_id, convocatoria_id, anexo_id, curriculum_id,
            certificado_id, nombre_completo, apellido_paterno, apellido_materno,
            dni, email, telefono, numero_cas, puesto, area,
            expediente_sigea, estado, fecha_accion, usuario_accion, accion, detalles
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Registrado', NOW(), ?, 'ACTUALIZADO', 'Postulante actualizado en mesa de partes')`,
          [
            IDUSUARIO || existente.IDUSUARIO || null,
            convocatoriaId ? parseInt(convocatoriaId) : null,
            anexoIdFinal,
            curriculumIdFinal,
            certificadoId,
            nombreCompleto,
            apellidoPaterno || null,
            apellidoMaterno || null,
            dni,
            email || null,
            telefono || null,
            numeroCAS || null,
            puesto || null,
            area || null,
            expedienteSIGEA || null,
            req.user?.nombre || 'Sistema'
          ]
        );
        console.log(`✅ Postulante ${postulanteId} guardado en historial (actualización)`);
      } catch (historialError) {
        console.error('❌ Error al registrar historial:', historialError);
      }

      // 🎯 ASIGNAR AUTOMÁTICAMENTE AL GRUPO DE COMITÉ
      let asignacionComite = await asignarIntegrantesComiteAutomaticamente(convocatoriaId);

      res.status(200).json({
        success: true,
        message: 'Postulante actualizado correctamente',
        postulante: {
          id: postulanteId,
          certificadoId,
          nombreCompleto,
          dni,
          estado: 'Registrado'
        },
        asignacionComite: asignacionComite
      });
    } else {
      // Crear nuevo registro con el archivo si se encontró
      let insertQuery, insertParams;

      if (archivoConstancia) {
        insertQuery = `INSERT INTO postulantes_registrados (
           IDUSUARIO, certificadoId, nombreCompleto, apellidoPaterno, apellidoMaterno, 
           dni, email, telefono, numeroCAS, puesto, area, 
           convocatoriaId, anexoId, curriculumId, expedienteSIGEA, archivoConstancia, estado, fechaRegistro
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Registrado', NOW())`;
        insertParams = [
          IDUSUARIO || null,
          certificadoId,
          nombreCompleto,
          apellidoPaterno || null,
          apellidoMaterno || null,
          dni,
          email || null,
          telefono || null,
          numeroCAS || null,
          puesto || null,
          area || null,
          convocatoriaId ? parseInt(convocatoriaId) : null,
          anexoIdFinal,
          curriculumIdFinal,
          expedienteSIGEA || null,
          archivoConstancia
        ];
        console.log('✅ Registrando postulante con archivo de constancia (IDUSUARIO:', IDUSUARIO, '):', archivoConstancia);
      } else {
        insertQuery = `INSERT INTO postulantes_registrados (
           IDUSUARIO, certificadoId, nombreCompleto, apellidoPaterno, apellidoMaterno, 
           dni, email, telefono, numeroCAS, puesto, area, 
           convocatoriaId, anexoId, curriculumId, expedienteSIGEA, estado, fechaRegistro
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Registrado', NOW())`;
        insertParams = [
          IDUSUARIO || null,
          certificadoId,
          nombreCompleto,
          apellidoPaterno || null,
          apellidoMaterno || null,
          dni,
          email || null,
          telefono || null,
          numeroCAS || null,
          puesto || null,
          area || null,
          convocatoriaId ? parseInt(convocatoriaId) : null,
          anexoIdFinal,
          curriculumIdFinal,
          expedienteSIGEA || null
        ];
        console.log('⚠️ Registrando postulante sin imagen de constancia (IDUSUARIO:', IDUSUARIO, ')');
      }

      const [result] = await pool.execute(insertQuery, insertParams);
      const nuevoId = result.insertId;

      // Guardar en historial (nuevo registro)
      try {
        await pool.execute(
          `INSERT INTO historial_postulaciones (
            usuario_id, convocatoria_id, anexo_id, curriculum_id,
            certificado_id, nombre_completo, apellido_paterno, apellido_materno,
            dni, email, telefono, numero_cas, puesto, area,
            expediente_sigea, estado, fecha_accion, usuario_accion, accion, detalles
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Registrado', NOW(), ?, 'REGISTRADO', 'Postulante registrado en mesa de partes')`,
          [
            IDUSUARIO || null,
            convocatoriaId ? parseInt(convocatoriaId) : null,
            anexoIdFinal,
            curriculumIdFinal,
            certificadoId,
            nombreCompleto,
            apellidoPaterno || null,
            apellidoMaterno || null,
            dni,
            email || null,
            telefono || null,
            numeroCAS || null,
            puesto || null,
            area || null,
            expedienteSIGEA || null,
            req.user?.nombre || 'Sistema'
          ]
        );
        console.log(`✅ Postulante ${nuevoId} guardado en historial (nuevo registro)`);
      } catch (historialError) {
        console.error('❌ Error al registrar historial:', historialError);
      }

      console.log('✅ Nuevo postulante registrado:', nuevoId);

      // 🎯 ASIGNAR AUTOMÁTICAMENTE AL GRUPO DE COMITÉ
      let asignacionComite = await asignarIntegrantesComiteAutomaticamente(convocatoriaId);

      res.status(201).json({
        success: true,
        message: 'Postulante registrado correctamente',
        postulante: {
          id: nuevoId,
          certificadoId,
          nombreCompleto,
          dni,
          estado: 'Registrado'
        },
        asignacionComite: asignacionComite
      });
    }
  } catch (error) {
    console.error('❌ Error al registrar postulante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar postulante',
      details: error.message
    });
  }
};

// 🎯 FUNCIÓN HELPER: Asignar integrantes del comité automáticamente
async function asignarIntegrantesComiteAutomaticamente(convocatoriaId) {
  let integrantesAsignados = [];
  let gruposInfo = [];
  
  if (!convocatoriaId) {
    console.log('ℹ️ No hay convocatoriaId, no se puede asignar comité');
    return { totalGrupos: 0, totalIntegrantes: 0, grupos: [], integrantes: [] };
  }
  
  try {
    // 🧹 PASO 1: LIMPIAR asignaciones anteriores de esta convocatoria
    console.log(`🧹 Limpiando asignaciones anteriores de convocatoria ${convocatoriaId}...`);
    
    const [asignacionesAnteriores] = await pool.execute(
      `SELECT COUNT(*) as total FROM convocatoria_integrantes 
       WHERE IDCONVOCATORIA = ? AND activo = TRUE`,
      [convocatoriaId]
    );
    
    if (asignacionesAnteriores[0].total > 0) {
      await pool.execute(
        `UPDATE convocatoria_integrantes 
         SET activo = FALSE 
         WHERE IDCONVOCATORIA = ?`,
        [convocatoriaId]
      );
      console.log(`✅ ${asignacionesAnteriores[0].total} asignación(es) anterior(es) desactivada(s)`);
    } else {
      console.log(`ℹ️ No había asignaciones anteriores para limpiar`);
    }

    // 🎯 PASO 2: ASIGNAR integrantes del grupo de comité
    const [gruposConvocatoria] = await pool.execute(
      `SELECT DISTINCT gcc.IDGRUPO, gc.nombre as nombreGrupo
       FROM grupos_comite_convocatorias gcc
       INNER JOIN grupos_comite gc ON gcc.IDGRUPO = gc.IDGRUPO
       WHERE gcc.IDCONVOCATORIA = ?`,
      [convocatoriaId]
    );

    if (gruposConvocatoria.length > 0) {
      console.log(`📋 Convocatoria asignada a ${gruposConvocatoria.length} grupo(s)`);
      
      for (const grupoInfo of gruposConvocatoria) {
        const grupoId = grupoInfo.IDGRUPO;
        const nombreGrupo = grupoInfo.nombreGrupo;

        // Obtener integrantes del grupo con sus datos
        const [integrantesGrupo] = await pool.execute(
          `SELECT gcu.IDUSUARIO, u.nombreCompleto, u.correo
           FROM grupos_comite_usuarios gcu
           INNER JOIN usuarios u ON gcu.IDUSUARIO = u.IDUSUARIO
           WHERE gcu.IDGRUPO = ?`,
          [grupoId]
        );

        console.log(`📋 Grupo "${nombreGrupo}" (ID: ${grupoId}) tiene ${integrantesGrupo.length} integrante(s)`);

        let integrantesGrupoAsignados = [];

        // Asignar cada integrante del grupo a esta convocatoria
        for (const integrante of integrantesGrupo) {
          try {
            await pool.execute(
              `INSERT INTO convocatoria_integrantes (IDCONVOCATORIA, IDUSUARIO, IDGRUPO, activo)
               VALUES (?, ?, ?, TRUE)
               ON DUPLICATE KEY UPDATE activo = TRUE, fechaAsignacion = CURRENT_TIMESTAMP`,
              [convocatoriaId, integrante.IDUSUARIO, grupoId]
            );
            
            console.log(`✅ ${integrante.nombreCompleto} (ID: ${integrante.IDUSUARIO}) asignado a convocatoria ${convocatoriaId}`);
            
            integrantesGrupoAsignados.push({
              id: integrante.IDUSUARIO,
              nombre: integrante.nombreCompleto,
              correo: integrante.correo
            });
          } catch (assignError) {
            console.error(`⚠️ Error al asignar integrante ${integrante.IDUSUARIO}:`, assignError.message);
          }
        }

        gruposInfo.push({
          grupoId: grupoId,
          nombreGrupo: nombreGrupo,
          totalIntegrantes: integrantesGrupo.length,
          integrantes: integrantesGrupoAsignados
        });

        integrantesAsignados.push(...integrantesGrupoAsignados);
      }
      
      console.log(`✅ Total de ${integrantesAsignados.length} integrante(s) asignado(s) a convocatoria ${convocatoriaId}`);
    } else {
      console.log(`ℹ️ Convocatoria ${convocatoriaId} no está asignada a ningún grupo de comité`);
    }
  } catch (assignError) {
    console.error('⚠️ Error al asignar integrantes del comité automáticamente:', assignError.message);
  }
  
  return {
    totalGrupos: gruposInfo.length,
    totalIntegrantes: integrantesAsignados.length,
    grupos: gruposInfo,
    integrantes: integrantesAsignados
  };
}

/**
 * Actualizar expediente SIGEA de un postulante
 * PUT /ugel-talara/documentos/postulantes-registrados/:id/expediente
 */
export const actualizarExpedientePostulante = async (req, res) => {
  try {
    await asegurarTablaPostulantesRegistrados();

    const { id } = req.params;
    const { expedienteSIGEA } = req.body;

    if (!expedienteSIGEA) {
      return res.status(400).json({
        success: false,
        error: 'El número de expediente SIGEA es requerido'
      });
    }

    // Obtener datos del postulante para el historial
    const [postulantes] = await pool.execute(
      'SELECT * FROM postulantes_registrados WHERE id = ?',
      [id]
    );

    if (postulantes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Postulante no encontrado'
      });
    }
    const postulante = postulantes[0];

    // Actualizar en la nueva tabla postulantes_registrados
    // NO cambiar el estado automáticamente, solo actualizar el expediente SIGEA
    const [result] = await pool.execute(
      `UPDATE postulantes_registrados 
       SET expedienteSIGEA = ?,
           fechaActualizacion = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [expedienteSIGEA, id]
    );

    // --- HISTORIAL AUTOMÁTICO ---
    try {
      await pool.execute(
        `INSERT INTO historial_tramites (
          postulante_id, certificado_id, nombre_completo, dni, 
          accion, expediente_sigea, detalles
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          postulante.certificadoId,
          postulante.nombreCompleto,
          postulante.dni,
          'ACTUALIZACION_EXPEDIENTE',
          expedienteSIGEA,
          `Expediente SIGEA actualizado a: ${expedienteSIGEA}`
        ]
      );
      console.log('✅ Historial de actualización registrado');
    } catch (historialError) {
      console.error('❌ Error al registrar historial:', historialError);
    }

    res.status(200).json({
      success: true,
      message: 'Expediente SIGEA actualizado correctamente',
      expedienteSIGEA: expedienteSIGEA
    });
  } catch (error) {
    console.error('❌ Error al actualizar expediente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar expediente SIGEA',
      details: error.message
    });
  }
};

/**
 * Rechazar un postulante
 * PUT /ugel-talara/documentos/postulantes-registrados/:id/rechazar
 */
export const rechazarPostulante = async (req, res) => {
  try {
    await asegurarTablaPostulantesRegistrados();

    const { id } = req.params;
    const { motivo } = req.body; // Motivo opcional del rechazo

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'El ID del postulante es requerido'
      });
    }

    console.log(`🔄 Iniciando proceso de rechazo para postulante ID: ${id}`);

    // Obtener datos completos del postulante para el historial
    const [postulantes] = await pool.execute(
      `SELECT 
        pr.*,
        c.puesto as nombreConvocatoria,
        c.numeroCAS as numeroCAS,
        c.area as areaConvocatoria
      FROM postulantes_registrados pr
      LEFT JOIN convocatorias c ON pr.convocatoriaId = c.IDCONVOCATORIA
      WHERE pr.id = ?`,
      [id]
    );

    if (postulantes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Postulante no encontrado'
      });
    }
    const postulante = postulantes[0];

    console.log(`📋 Postulante encontrado: ${postulante.nombreCompleto} (DNI: ${postulante.dni})`);

    // Obtener información de anexos asociados
    let anexosInfo = '';
    try {
      const [anexos] = await pool.execute(
        `SELECT COUNT(*) as total, GROUP_CONCAT(IDANEXO) as ids
         FROM anexos 
         WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?`,
        [postulante.usuarioId, postulante.convocatoriaId]
      );
      
      if (anexos.length > 0 && anexos[0].total > 0) {
        anexosInfo = `Anexos: ${anexos[0].total} (IDs: ${anexos[0].ids})`;
        console.log(`📎 ${anexosInfo}`);
      }
    } catch (anexosError) {
      console.warn('⚠️ No se pudo obtener información de anexos:', anexosError.message);
    }

    // Actualizar el estado a 'Rechazado'
    const [result] = await pool.execute(
      `UPDATE postulantes_registrados 
       SET estado = 'Rechazado',
           fechaActualizacion = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id]
    );

    console.log(`✅ Estado actualizado a 'Rechazado' en postulantes_registrados`);

    // Guardar en historial (rechazo)
    try {
      await pool.execute(
        `INSERT INTO historial_postulaciones (
          usuario_id, convocatoria_id, anexo_id, curriculum_id,
          certificado_id, nombre_completo, apellido_paterno, apellido_materno,
          dni, email, telefono, numero_cas, puesto, area,
          expediente_sigea, estado, motivo_rechazo, fecha_accion, usuario_accion, accion, detalles
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Rechazado', ?, NOW(), ?, 'RECHAZADO', ?)`,
        [
          postulante.usuarioId || postulante.IDUSUARIO || null,
          postulante.convocatoriaId || null,
          postulante.anexoId || null,
          postulante.curriculumId || null,
          postulante.certificadoId || null,
          postulante.nombreCompleto,
          postulante.apellidoPaterno || null,
          postulante.apellidoMaterno || null,
          postulante.dni,
          postulante.email || null,
          postulante.telefono || null,
          postulante.numeroCAS || null,
          postulante.puesto || postulante.nombreConvocatoria || null,
          postulante.area || postulante.areaConvocatoria || null,
          postulante.expedienteSIGEA || null,
          motivo || 'Sin motivo especificado',
          req.user?.nombre || 'Sistema',
          `Postulante rechazado en mesa de partes. Motivo: ${motivo || 'Sin motivo especificado'}`
        ]
      );
      
      console.log('✅ Postulante rechazado guardado en historial_postulaciones');
    } catch (historialError) {
      console.error('❌ Error al registrar en historial:', historialError);
      // No fallar la operación si el historial falla
    }

    // Respuesta exitosa
    res.status(200).json({
      success: true,
      message: 'Postulante rechazado y movido al historial correctamente',
      estado: 'Rechazado',
      postulante: {
        id: postulante.id,
        nombreCompleto: postulante.nombreCompleto,
        dni: postulante.dni,
        convocatoria: postulante.nombreConvocatoria,
        fechaRechazo: new Date().toISOString()
      }
    });

    console.log(`✅ Proceso de rechazo completado exitosamente para ${postulante.nombreCompleto}`);

  } catch (error) {
    console.error('❌ Error al rechazar postulante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al rechazar postulante',
      details: error.message
    });
  }
};

/**
 * Archivar un postulante (mover al historial)
 * PUT /ugel-talara/documentos/postulantes-registrados/:id/archivar
 * 
 * IMPORTANTE: Esta función NO elimina datos, solo cambia el estado a 'Archivado'.
 * Los datos permanecen en la base de datos de forma permanente para:
 * - Mantener historial completo
 * - Auditoría y trazabilidad
 * - Reportes y estadísticas
 * - Consultas futuras
 */
export const archivarPostulante = async (req, res) => {
  try {
    await asegurarTablaPostulantesRegistrados();
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'El ID del postulante es requerido'
      });
    }

    // Obtener datos del postulante para el historial
    const [postulantes] = await pool.execute(
      'SELECT * FROM postulantes_registrados WHERE id = ?',
      [id]
    );

    if (postulantes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Postulante no encontrado'
      });
    }
    const postulante = postulantes[0];

    // SOLO actualizar el estado a 'Archivado' - NO se eliminan datos
    // Los datos permanecen en la tabla postulantes_registrados de forma permanente
    const [result] = await pool.execute(
      `UPDATE postulantes_registrados 
       SET estado = 'Archivado',
           fechaActualizacion = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id]
    );

    // --- HISTORIAL AUTOMÁTICO ---
    try {
      await pool.execute(
        `INSERT INTO historial_tramites (
          postulante_id, certificado_id, nombre_completo, dni, 
          accion, expediente_sigea, detalles
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          postulante.certificadoId,
          postulante.nombreCompleto,
          postulante.dni,
          'ARCHIVADO',
          postulante.expedienteSIGEA || null,
          'Postulante archivado (movido al historial)'
        ]
      );
      console.log('✅ Historial de archivado registrado');
    } catch (historialError) {
      console.error('❌ Error al registrar historial:', historialError);
    }

    console.log(`✅ Postulante ID ${id} archivado correctamente (datos permanentes en BD)`);

    res.status(200).json({
      success: true,
      message: 'Postulante archivado correctamente. Movido al historial.',
      estado: 'Archivado'
    });
  } catch (error) {
    console.error('❌ Error al archivar postulante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al archivar postulante',
      details: error.message
    });
  }
};

/**
 * Eliminar una verificación de QR por ID o código de certificado
 * DELETE /ugel-talara/documentos/verificacion/:id
 * DELETE /ugel-talara/documentos/verificacion/codigo/:codigo
 */
export const eliminarVerificacion = async (req, res) => {
  try {
    const id = req.params.id;
    const codigo = req.params.codigo || req.query.codigo;

    if (!id && !codigo) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID o el código del certificado para eliminar'
      });
    }

    let eliminado = false;
    let nombrePostulante = '';

    // Intentar eliminar por ID primero
    if (id && !isNaN(id)) {
      // Obtener el nombre del postulante antes de eliminar (para el mensaje)
      try {
        const [verificacion] = await pool.execute(
          `SELECT datosQR FROM verificaciones_qr WHERE id = ?`,
          [id]
        );

        if (verificacion.length > 0) {
          const datosQR = typeof verificacion[0].datosQR === 'string'
            ? JSON.parse(verificacion[0].datosQR)
            : verificacion[0].datosQR;
          nombrePostulante = datosQR.postulante || datosQR.nombreCompleto || 'Postulante';
        }

        const [result] = await pool.execute(
          `DELETE FROM verificaciones_qr WHERE id = ?`,
          [id]
        );

        if (result.affectedRows > 0) {
          eliminado = true;
        }
      } catch (error) {
        console.error('Error al eliminar por ID:', error);
      }
    }

    // Si no se eliminó por ID, intentar por código de certificado
    if (!eliminado && codigo) {
      try {
        // Obtener el nombre del postulante antes de eliminar
        const [verificacion] = await pool.execute(
          `SELECT datosQR FROM verificaciones_qr WHERE codigoCertificado = ?`,
          [codigo]
        );

        if (verificacion.length > 0) {
          const datosQR = typeof verificacion[0].datosQR === 'string'
            ? JSON.parse(verificacion[0].datosQR)
            : verificacion[0].datosQR;
          nombrePostulante = datosQR.postulante || datosQR.nombreCompleto || 'Postulante';
        }

        const [result] = await pool.execute(
          `DELETE FROM verificaciones_qr WHERE codigoCertificado = ?`,
          [codigo]
        );

        if (result.affectedRows > 0) {
          eliminado = true;
        }
      } catch (error) {
        console.error('Error al eliminar por código:', error);
      }
    }

    if (eliminado) {
      console.log(`✅ Verificación eliminada: ${nombrePostulante || id || codigo}`);
      res.status(200).json({
        success: true,
        message: 'Verificación eliminada exitosamente',
        postulante: nombrePostulante
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Verificación no encontrada'
      });
    }
  } catch (error) {
    console.error('❌ Error al eliminar verificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar verificación',
      details: error.message
    });
  }
};


/**
 * Obtener la imagen del certificado de un postulante
 * GET /ugel-talara/documentos/postulantes-registrados/:id/certificado-imagen
 */
export const obtenerImagenCertificado = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Buscando imagen de constancia para postulante ID: ${id}`);

    // Primero intentar obtener del registro actual
    const [rows] = await pool.execute(
      `SELECT 
        pr.*
      FROM postulantes_registrados pr
      WHERE pr.id = ?`,
      [id]
    );
    
    // Obtener información de la convocatoria si existe
    let nombreConvocatoria = null;
    let numeroCAS = null;
    if (rows.length > 0 && rows[0].convocatoriaId) {
      try {
        const [convocatorias] = await pool.execute(
          'SELECT * FROM convocatorias WHERE IDCONVOCATORIA = ?',
          [rows[0].convocatoriaId]
        );
        if (convocatorias.length > 0) {
          // Intentar diferentes nombres de columnas
          nombreConvocatoria = convocatorias[0].titulo || convocatorias[0].puesto || convocatorias[0].area || 'CONVOCATORIA CAS';
          numeroCAS = convocatorias[0].numeroCAS || convocatorias[0].numeroCas || null;
        }
      } catch (convError) {
        console.warn('⚠️ No se pudo obtener información de convocatoria:', convError.message);
      }
    }

    if (rows.length === 0) {
      console.error(`❌ Postulante con ID ${id} no encontrado en la base de datos`);
      return res.status(404).json({
        success: false,
        error: 'Postulante no encontrado',
        details: `No se encontró ningún registro con ID ${id}`
      });
    }
    
    console.log(`✅ Postulante encontrado:`, {
      id: id,
      certificadoId: rows[0].certificadoId,
      dni: rows[0].dni,
      nombreCompleto: rows[0].nombreCompleto,
      IDUSUARIO: rows[0].IDUSUARIO,
      tieneImagen: rows[0].imagenConstancia ? 'SÍ' : 'NO',
      tamañoImagen: rows[0].imagenConstancia ? rows[0].imagenConstancia.length : 0
    });

    let imagenBuffer = rows[0].imagenConstancia;
    const certificadoId = rows[0].certificadoId;
    const dni = rows[0].dni;

    // Si no tiene imagen, buscar en otros registros
    if (!imagenBuffer) {
      console.log(`⚠️ Imagen no encontrada en registro ${id}, buscando en otros registros...`);
      console.log(`🔍 Buscando por certificadoId: ${certificadoId}, DNI: ${dni}, IDUSUARIO: ${rows[0].IDUSUARIO}`);

      // Buscar por IDUSUARIO primero (más confiable)
      if (rows[0].IDUSUARIO) {
        const [userRows] = await pool.execute(
          'SELECT id, certificadoId, imagenConstancia FROM postulantes_registrados WHERE IDUSUARIO = ? AND imagenConstancia IS NOT NULL ORDER BY fechaRegistro DESC LIMIT 1',
          [rows[0].IDUSUARIO]
        );

        if (userRows.length > 0 && userRows[0].imagenConstancia) {
          imagenBuffer = userRows[0].imagenConstancia;
          console.log(`✅ Imagen encontrada por IDUSUARIO: ${rows[0].IDUSUARIO} (Registro ID: ${userRows[0].id})`);

          // Actualizar el registro actual con la imagen
          try {
            await pool.execute(
              'UPDATE postulantes_registrados SET imagenConstancia = ? WHERE id = ?',
              [imagenBuffer, id]
            );
            console.log(`✅ Imagen copiada al registro ${id}`);
          } catch (updateError) {
            console.warn('⚠️ No se pudo actualizar la imagen:', updateError.message);
          }
        } else {
          console.log(`⚠️ No se encontró imagen por IDUSUARIO: ${rows[0].IDUSUARIO}`);
        }
      }

      // Buscar por certificadoId
      if (!imagenBuffer && certificadoId) {
        const [certRows] = await pool.execute(
          'SELECT id, imagenConstancia FROM postulantes_registrados WHERE certificadoId = ? AND imagenConstancia IS NOT NULL LIMIT 1',
          [certificadoId]
        );

        if (certRows.length > 0 && certRows[0].imagenConstancia) {
          imagenBuffer = certRows[0].imagenConstancia;
          console.log(`✅ Imagen encontrada por certificadoId: ${certificadoId} (Registro ID: ${certRows[0].id})`);

          // Actualizar el registro actual con la imagen
          try {
            await pool.execute(
              'UPDATE postulantes_registrados SET imagenConstancia = ? WHERE id = ?',
              [imagenBuffer, id]
            );
            console.log(`✅ Imagen copiada al registro ${id}`);
          } catch (updateError) {
            console.warn('⚠️ No se pudo actualizar la imagen:', updateError.message);
          }
        } else {
          console.log(`⚠️ No se encontró imagen por certificadoId: ${certificadoId}`);
        }
      }

      // Si aún no hay imagen, buscar por DNI
      if (!imagenBuffer && dni) {
        const [dniRows] = await pool.execute(
          'SELECT id, imagenConstancia FROM postulantes_registrados WHERE dni = ? AND imagenConstancia IS NOT NULL ORDER BY fechaRegistro DESC LIMIT 1',
          [dni]
        );

        if (dniRows.length > 0 && dniRows[0].imagenConstancia) {
          imagenBuffer = dniRows[0].imagenConstancia;
          console.log(`✅ Imagen encontrada por DNI: ${dni} (Registro ID: ${dniRows[0].id})`);

          // Actualizar el registro actual con la imagen
          try {
            await pool.execute(
              'UPDATE postulantes_registrados SET imagenConstancia = ? WHERE id = ?',
              [imagenBuffer, id]
            );
            console.log(`✅ Imagen copiada al registro ${id}`);
          } catch (updateError) {
            console.warn('⚠️ No se pudo actualizar la imagen:', updateError.message);
          }
        } else {
          console.log(`⚠️ No se encontró imagen por DNI: ${dni}`);
        }
      }
      
      // Log de resumen de búsqueda
      if (!imagenBuffer) {
        console.log(`❌ No se encontró imagen en ningún registro para:`, {
          id: id,
          IDUSUARIO: rows[0].IDUSUARIO,
          certificadoId: certificadoId,
          dni: dni
        });
      }
    }

    // Si después de buscar aún no hay imagen, generarla y guardarla en carpeta
    if (!imagenBuffer) {
      console.log(`⚠️ No se encontró imagen, generando y guardando en carpeta para postulante ${id}...`);
      
      // Importar módulos necesarios
      try {
        const { createCanvas } = await import('canvas');
        const fs = await import('fs');
        const path = await import('path');
        
        // Crear carpeta de constancias si no existe
        const constanciasDir = path.join(process.cwd(), 'uploads', 'constancias');
        if (!fs.existsSync(constanciasDir)) {
          fs.mkdirSync(constanciasDir, { recursive: true });
          console.log(`📁 Carpeta creada: ${constanciasDir}`);
        }
        
        // Nombre del archivo
        const fileName = `constancia_${certificadoId || id}_${dni || 'sin-dni'}.png`;
        const filePath = path.join(constanciasDir, fileName);
        
        // Verificar si ya existe el archivo en disco
        if (fs.existsSync(filePath)) {
          console.log(`✅ Archivo encontrado en disco: ${fileName}`);
          imagenBuffer = fs.readFileSync(filePath);
        } else {
          // Generar la imagen
          console.log(`🎨 Generando nueva constancia...`);
          const canvas = createCanvas(1200, 848);
          const ctx = canvas.getContext('2d');
          
          // Fondo blanco
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 1200, 848);
          
          // MARCO DECORATIVO
          ctx.strokeStyle = '#154c79';
          ctx.lineWidth = 8;
          ctx.strokeRect(20, 20, 1160, 808);
          
          ctx.strokeStyle = '#d4af37';
          ctx.lineWidth = 4;
          ctx.strokeRect(32, 32, 1136, 784);
          
          ctx.strokeStyle = '#154c79';
          ctx.lineWidth = 2;
          ctx.strokeRect(40, 40, 1120, 768);
          
          // ENCABEZADO
          let y = 110;
          ctx.fillStyle = '#154c79';
          ctx.font = 'bold 32px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('UNIDAD DE GESTIÓN EDUCATIVA LOCAL TALARA', 600, y);
          
          y += 35;
          ctx.fillStyle = '#d4af37';
          ctx.font = 'bold 16px Arial';
          ctx.fillText('★ ★ ★   EXCELENCIA Y TRANSPARENCIA   ★ ★ ★', 600, y);
          
          // TÍTULO PRINCIPAL
          y += 90;
          ctx.fillStyle = '#154c79';
          ctx.font = 'bold 56px Arial';
          ctx.fillText('CONSTANCIA DE POSTULACIÓN', 600, y);
          
          // Línea decorativa
          y += 25;
          ctx.fillStyle = '#154c79';
          ctx.fillRect(350, y, 500, 3);
          y += 8;
          ctx.fillStyle = '#d4af37';
          ctx.fillRect(450, y, 300, 2);
          
          // TEXTO INTRODUCTORIO
          y += 70;
          ctx.fillStyle = '#374151';
          ctx.font = 'normal 22px Arial';
          ctx.fillText('La Unidad de Gestión Educativa Local Talara hace constar que:', 600, y);
          
          // NOMBRE DEL POSTULANTE
          y += 70;
          const nombreParaCertificado = (rows[0].nombreCompleto || 'POSTULANTE').toUpperCase();
          ctx.fillStyle = '#154c79';
          ctx.font = 'bold 48px Arial';
          ctx.fillText(nombreParaCertificado, 600, y);
          
          // DNI
          y += 45;
          ctx.fillStyle = '#4b5563';
          ctx.font = 'bold 22px Arial';
          ctx.fillText(`Identificado(a) con DNI N° ${dni || 'N/A'}`, 600, y);
          
          // CUERPO DEL TEXTO
          y += 70;
          ctx.fillStyle = '#374151';
          ctx.font = 'normal 24px Arial';
          ctx.fillText('Ha completado satisfactoriamente su inscripción en el proceso de selección', 600, y);
          
          y += 35;
          ctx.font = 'bold 24px Arial';
          ctx.fillStyle = '#154c79';
          const convocatoriaNombre = nombreConvocatoria || 'CONVOCATORIA CAS';
          ctx.fillText(convocatoriaNombre.toUpperCase(), 600, y);
          
          y += 35;
          ctx.font = 'normal 20px Arial';
          ctx.fillStyle = '#4b5563';
          if (numeroCAS) {
            ctx.fillText(`N° CAS: ${numeroCAS}`, 600, y);
            y += 35;
          }
          
          // FECHA Y LUGAR
          const footerY = 668;
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(450, footerY - 50);
          ctx.lineTo(750, footerY - 50);
          ctx.stroke();
          
          ctx.fillStyle = '#374151';
          ctx.font = 'italic 18px Arial';
          const fecha = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
          ctx.fillText('Talara, ' + fecha, 600, footerY);
          
          // CÓDIGO DE CONSTANCIA
          const codigoY = footerY + 60;
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(400, codigoY - 25, 400, 50);
          ctx.strokeStyle = '#d1d5db';
          ctx.lineWidth = 1;
          ctx.strokeRect(400, codigoY - 25, 400, 50);
          
          ctx.fillStyle = '#154c79';
          ctx.font = 'bold 20px monospace';
          ctx.fillText(`CÓDIGO: ${certificadoId || 'N/A'}`, 600, codigoY + 8);
          
          // NOTA IMPORTANTE
          const notaY = 788;
          ctx.fillStyle = '#dc2626';
          ctx.font = 'bold 16px Arial';
          ctx.fillText('IMPORTANTE: Adjunte esta constancia en su expediente para Mesa de Partes.', 600, notaY);
          
          // Convertir a buffer
          imagenBuffer = canvas.toBuffer('image/png');
          
          // Guardar en disco
          fs.writeFileSync(filePath, imagenBuffer);
          console.log(`💾 Constancia guardada en: ${filePath}`);
          
          // Actualizar base de datos con la ruta del archivo
          await pool.execute(
            'UPDATE postulantes_registrados SET archivoConstancia = ?, imagenConstancia = ? WHERE id = ?',
            [fileName, imagenBuffer, id]
          );
          
          console.log(`✅ Imagen generada y guardada para postulante ${id} (Tamaño: ${imagenBuffer.length} bytes)`);
        }
      } catch (genError) {
        console.error('❌ Error al generar imagen dinámicamente:', genError);
        console.error('Stack trace:', genError.stack);
        
        // Si falla la generación con canvas, devolver un error más informativo
        return res.status(500).json({
          success: false,
          error: 'No se pudo generar la imagen de la constancia',
          details: genError.message,
          stack: genError.stack,
          postulante: {
            id: id,
            certificadoId: certificadoId,
            dni: dni,
            nombreCompleto: rows[0].nombreCompleto
          }
        });
      }
    }

    // Detectar el tipo de imagen basándose en los magic bytes
    let contentType = 'image/png'; // Default

    if (imagenBuffer.length > 4) {
      const header = imagenBuffer.slice(0, 4).toString('hex');

      if (header.startsWith('89504e47')) {
        contentType = 'image/png';
      } else if (header.startsWith('ffd8ff')) {
        contentType = 'image/jpeg';
      } else if (header.startsWith('47494638')) {
        contentType = 'image/gif';
      } else if (header.startsWith('52494646')) {
        // RIFF header, could be WebP
        contentType = 'image/webp';
      } else if (header.startsWith('424d')) {
        contentType = 'image/bmp';
      }
    }

    console.log(`✅ Sirviendo imagen de certificado (ID: ${id}, Tipo: ${contentType}, Tamaño: ${imagenBuffer.length} bytes)`);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': imagenBuffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(imagenBuffer);

  } catch (error) {
    console.error('❌ Error al obtener imagen del certificado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener imagen del certificado',
      details: error.message
    });
  }
};

