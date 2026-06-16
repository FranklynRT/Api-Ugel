import { pool } from '../database/conexion.js';

// ============================================================
// 🔧 FUNCIONES DEL CONTROLADOR DE CONVOCATORIAS
// ============================================================

// Función para verificar y crear la tabla CONVOCATORIAS si no existe
async function ensureConvocatoriasTable() {
  try {
    // Verificar si la tabla existe
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'convocatorias'`
    );

    if (tables.length === 0) {
      // Crear la tabla con TODAS las columnas requeridas
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS convocatorias (
          IDCONVOCATORIA INT AUTO_INCREMENT PRIMARY KEY,
          area VARCHAR(255) NOT NULL,
          puesto VARCHAR(255) NOT NULL,
          tipoPuesto ENUM('Técnico', 'Profesional', 'Personal de apoyo') DEFAULT NULL,
          sueldo VARCHAR(100),
          tituloProfesional VARCHAR(500) DEFAULT NULL,
          expPublicaMin VARCHAR(100),
          expPublicaMax VARCHAR(100),
          experienciaTotal VARCHAR(255),
          fechaInicio DATE NOT NULL,
          fechaFin DATE NOT NULL,
          horaInicio TIME DEFAULT NULL,
          horaFin TIME DEFAULT NULL,
          estado ENUM('Activo', 'Inactivo', 'Publicada', 'No Publicada') DEFAULT 'No Publicada',
          publicada TINYINT(1) DEFAULT 0,
          numeroCAS VARCHAR(100) NOT NULL UNIQUE,
          requisitosAcademicos TEXT,
          habilidadesTecnicas TEXT,
          experienciaEspecifica TEXT,
          experienciaMaxima VARCHAR(100),
          formacionNivel TEXT,
          formacionGrado TEXT,
          requiereColegiatura ENUM('si', 'no') DEFAULT 'no',
          requiereHabilitacion ENUM('si', 'no') DEFAULT 'no',
          cursosEspecializacion TEXT,
          duracionContrato VARCHAR(255),
          conocimientosOfimatica TEXT,
          conocimientosIdiomas TEXT,
          tituladoTecnico VARCHAR(255),
          colegiaturaProfesional ENUM('si', 'no') DEFAULT 'no',
          nivelEducativoMinimo VARCHAR(255),
          nombreArchivoPDF VARCHAR(500),
          rutaArchivoPDF VARCHAR(500),
          tamanoArchivoPDF BIGINT,
          tipoArchivoPDF VARCHAR(100),
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_area (area),
          INDEX idx_puesto (puesto),
          INDEX idx_estado (estado),
          INDEX idx_numeroCAS (numeroCAS),
          INDEX idx_fechaInicio (fechaInicio),
          INDEX idx_fechaFin (fechaFin),
          INDEX idx_tipoPuesto (tipoPuesto)
        )
      `);
      console.log('✅ Tabla convocatorias creada exitosamente con todos los campos');
    } else {
      // Si la tabla existe, verificar y agregar columnas faltantes
      try {
        // Verificar y agregar columnas una por una si no existen
        const [columns] = await pool.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'convocatorias'`
        );

        const existingColumns = columns.map(col => col.COLUMN_NAME);

        // Definir todas las columnas necesarias
        const columnDefinitions = [
          { name: 'tipoPuesto', sql: "ADD COLUMN tipoPuesto ENUM('Técnico', 'Profesional', 'Personal de apoyo') DEFAULT NULL AFTER puesto" },
          { name: 'tituloProfesional', sql: "ADD COLUMN tituloProfesional VARCHAR(500) DEFAULT NULL AFTER sueldo" },
          { name: 'expPublicaMin', sql: "ADD COLUMN expPublicaMin VARCHAR(100) AFTER tituloProfesional" },
          { name: 'expPublicaMax', sql: "ADD COLUMN expPublicaMax VARCHAR(100) AFTER expPublicaMin" },
          { name: 'experienciaTotal', sql: "ADD COLUMN experienciaTotal VARCHAR(255) AFTER expPublicaMax" },
          { name: 'horaInicio', sql: "ADD COLUMN horaInicio TIME DEFAULT NULL AFTER fechaInicio" },
          { name: 'horaFin', sql: "ADD COLUMN horaFin TIME DEFAULT NULL AFTER horaInicio" },
          { name: 'experienciaEspecifica', sql: "ADD COLUMN experienciaEspecifica TEXT AFTER habilidadesTecnicas" },
          { name: 'experienciaMaxima', sql: "ADD COLUMN experienciaMaxima VARCHAR(100) AFTER experienciaEspecifica" },
          { name: 'formacionNivel', sql: "ADD COLUMN formacionNivel TEXT AFTER experienciaMaxima" },
          { name: 'formacionGrado', sql: "ADD COLUMN formacionGrado TEXT AFTER formacionNivel" },
          { name: 'requiereColegiatura', sql: "ADD COLUMN requiereColegiatura ENUM('si', 'no') DEFAULT 'no' AFTER formacionGrado" },
          { name: 'requiereHabilitacion', sql: "ADD COLUMN requiereHabilitacion ENUM('si', 'no') DEFAULT 'no' AFTER requiereColegiatura" },
          { name: 'cursosEspecializacion', sql: "ADD COLUMN cursosEspecializacion TEXT AFTER requiereHabilitacion" },
          { name: 'duracionContrato', sql: "ADD COLUMN duracionContrato VARCHAR(255) AFTER cursosEspecializacion" },
          { name: 'conocimientosOfimatica', sql: "ADD COLUMN conocimientosOfimatica TEXT AFTER duracionContrato" },
          { name: 'conocimientosIdiomas', sql: "ADD COLUMN conocimientosIdiomas TEXT AFTER conocimientosOfimatica" },
          { name: 'tituladoTecnico', sql: "ADD COLUMN tituladoTecnico VARCHAR(255) AFTER conocimientosIdiomas" },
          { name: 'colegiaturaProfesional', sql: "ADD COLUMN colegiaturaProfesional ENUM('si', 'no') DEFAULT 'no' AFTER tituladoTecnico" },
          { name: 'colegioProfesionalHabilitado', sql: "ADD COLUMN colegioProfesionalHabilitado ENUM('SI', 'NO') DEFAULT 'NO' AFTER colegiaturaProfesional" },
          { name: 'nivelEducativoMinimo', sql: "ADD COLUMN nivelEducativoMinimo VARCHAR(255) AFTER colegioProfesionalHabilitado" },
          { name: 'nombreArchivoPDF', sql: "ADD COLUMN nombreArchivoPDF VARCHAR(500) AFTER nivelEducativoMinimo" },
          { name: 'rutaArchivoPDF', sql: "ADD COLUMN rutaArchivoPDF VARCHAR(500) AFTER nombreArchivoPDF" },
          { name: 'tamanoArchivoPDF', sql: "ADD COLUMN tamanoArchivoPDF BIGINT AFTER rutaArchivoPDF" },
          { name: 'tipoArchivoPDF', sql: "ADD COLUMN tipoArchivoPDF VARCHAR(100) AFTER tamanoArchivoPDF" },
          { name: 'publicada', sql: "ADD COLUMN publicada TINYINT(1) DEFAULT 0 AFTER estado" },
          { name: 'fechaActualizacion', sql: "ADD COLUMN fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" }
        ];

        // Agregar columnas faltantes
        for (const col of columnDefinitions) {
          if (!existingColumns.includes(col.name)) {
            try {
              await pool.execute(`ALTER TABLE convocatorias ${col.sql}`);
              console.log(`✅ Columna ${col.name} agregada`);
            } catch (e) {
              console.warn(`⚠️ No se pudo agregar columna ${col.name}:`, e.message);
            }
          }
        }

        // Actualizar columna estado si existe
        if (existingColumns.includes('estado')) {
          try {
            await pool.execute(`
              ALTER TABLE convocatorias 
              MODIFY COLUMN estado ENUM('Activo', 'Inactivo', 'Publicada', 'No Publicada') DEFAULT 'No Publicada'
            `);
            console.log('✅ Columna estado actualizada');
          } catch (e) {
            console.log('⚠️ Columna estado ya está actualizada');
          }
        }

        // Actualizar columna tituloProfesional si existe como ENUM
        if (existingColumns.includes('tituloProfesional')) {
          try {
            // Verificar el tipo actual de la columna
            const [columnInfo] = await pool.execute(`
              SELECT DATA_TYPE, COLUMN_TYPE 
              FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'convocatorias' 
              AND COLUMN_NAME = 'tituloProfesional'
            `);

            if (columnInfo.length > 0 && columnInfo[0].DATA_TYPE === 'enum') {
              console.log('🔄 Migrando tituloProfesional de ENUM a VARCHAR(500)...');

              // Cambiar el tipo de columna
              await pool.execute(`
                ALTER TABLE convocatorias 
                MODIFY COLUMN tituloProfesional VARCHAR(500) DEFAULT NULL
              `);

              console.log('✅ Columna tituloProfesional migrada exitosamente a VARCHAR(500)');

              // Copiar datos de requisitosAcademicos si contienen "Titulo profesional"
              await pool.execute(`
                UPDATE convocatorias 
                SET tituloProfesional = requisitosAcademicos 
                WHERE (requisitosAcademicos LIKE 'Titulo profesional%' 
                   OR requisitosAcademicos LIKE 'Título profesional%')
                   AND (tituloProfesional IS NULL 
                        OR tituloProfesional = '' 
                        OR tituloProfesional = 'Sí' 
                        OR tituloProfesional = 'No')
              `);

              console.log('✅ Datos migrados de requisitosAcademicos a tituloProfesional');
            } else {
              console.log('✅ Columna tituloProfesional ya es VARCHAR');
            }
          } catch (e) {
            console.warn('⚠️ Error al migrar tituloProfesional:', e.message);
          }
        }

      } catch (error) {
        console.error('Error al actualizar estructura de tabla convocatorias:', error);
      }
    }
  } catch (error) {
    console.error('Error al verificar/crear tabla convocatorias:', error);
    throw error;
  }
}

// Crear nueva convocatoria
const crearConvocatoria = async (req, res) => {
  try {
    await ensureConvocatoriasTable();

    const {
      area,
      puesto,
      tipoPuesto,
      sueldo,
      tituloProfesional,
      expPublicaMin,
      expPublicaMax,
      experienciaTotal,
      experiencia,
      experienciaLaboral,
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin,
      estado,
      numeroCAS,
      requisitosAcademicos,
      habilidadesTecnicas,
      publicada,
      // Campos del perfil del puesto
      experienciaEspecifica,
      experienciaMaxima,
      formacionNivel,
      formacionGrado,
      requiereColegiatura,
      requiereHabilitacion,
      cursosEspecializacion,
      duracionContrato,
      conocimientosOfimatica,
      conocimientosIdiomas,
      // Campos específicos por tipo
      tituladoTecnico,
      colegiaturaProfesional,
      colegioProfesionalHabilitado,
      nivelEducativoMinimo
    } = req.body;

    // Validar campos requeridos
    if (!area || !puesto || !numeroCAS || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: 'Los campos área, puesto, número CAS, fecha inicio y fecha fin son requeridos'
      });
    }

    // Validar formato de fechas
    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);

    if (isNaN(fechaInicioDate.getTime())) {
      return res.status(400).json({
        error: 'La fecha de inicio no es válida'
      });
    }

    if (isNaN(fechaFinDate.getTime())) {
      return res.status(400).json({
        error: 'La fecha de fin no es válida'
      });
    }

    if (fechaFinDate < fechaInicioDate) {
      return res.status(400).json({
        error: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
    }

    // Verificar si el número CAS ya existe
    const [existingCAS] = await pool.execute(
      'SELECT IDCONVOCATORIA FROM convocatorias WHERE numeroCAS = ?',
      [numeroCAS]
    );

    if (existingCAS.length > 0) {
      return res.status(400).json({
        error: 'Ya existe una convocatoria con este número CAS'
      });
    }

    // Normalizar valores
    const tituloProf = tituloProfesional ? tituloProfesional.trim() : null;
    const experienciaTexto = experienciaTotal ?? experiencia ?? experienciaLaboral;
    const publicadaFlag = publicada === true || publicada === 'true' || publicada === 1 || publicada === '1';
    let estadoFinal = estado && ['Activo', 'Inactivo', 'Publicada', 'No Publicada'].includes(estado)
      ? estado
      : 'No Publicada';

    if (publicada !== undefined && estado === undefined) {
      estadoFinal = publicadaFlag ? 'Publicada' : 'No Publicada';
    }

    // Convertir arrays a JSON strings
    const formacionNivelJSON = Array.isArray(formacionNivel) ? JSON.stringify(formacionNivel) : formacionNivel;
    const formacionGradoJSON = Array.isArray(formacionGrado) ? JSON.stringify(formacionGrado) : formacionGrado;

    // Insertar nueva convocatoria con TODOS los campos
    const [result] = await pool.execute(
      `INSERT INTO convocatorias (
        area, puesto, tipoPuesto, sueldo, tituloProfesional, expPublicaMin, expPublicaMax, experienciaTotal,
        fechaInicio, fechaFin, horaInicio, horaFin, estado, publicada, numeroCAS, 
        requisitosAcademicos, habilidadesTecnicas,
        experienciaEspecifica, experienciaMaxima, formacionNivel, formacionGrado,
        requiereColegiatura, requiereHabilitacion, cursosEspecializacion, duracionContrato,
        conocimientosOfimatica, conocimientosIdiomas,
        tituladoTecnico, colegiaturaProfesional, colegioProfesionalHabilitado, nivelEducativoMinimo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        area.trim(),
        puesto.trim(),
        tipoPuesto || null,
        sueldo ? sueldo.trim() : null,
        tituloProf,
        expPublicaMin ? expPublicaMin.trim() : null,
        expPublicaMax ? expPublicaMax.trim() : null,
        experienciaTexto ? experienciaTexto.toString().trim() : null,
        fechaInicio,
        fechaFin,
        horaInicio || null,
        horaFin || null,
        estadoFinal,
        publicadaFlag ? 1 : 0,
        numeroCAS.trim(),
        requisitosAcademicos ? requisitosAcademicos.trim() : null,
        habilidadesTecnicas ? habilidadesTecnicas.trim() : null,
        experienciaEspecifica ? experienciaEspecifica.trim() : null,
        experienciaMaxima ? experienciaMaxima.trim() : null,
        formacionNivelJSON || null,
        formacionGradoJSON || null,
        requiereColegiatura || 'no',
        requiereHabilitacion || 'no',
        cursosEspecializacion ? cursosEspecializacion.trim() : null,
        duracionContrato ? duracionContrato.trim() : null,
        conocimientosOfimatica ? conocimientosOfimatica.trim() : null,
        conocimientosIdiomas ? conocimientosIdiomas.trim() : null,
        tituladoTecnico ? tituladoTecnico.trim() : null,
        colegiaturaProfesional || 'no',
        colegioProfesionalHabilitado || 'NO',
        nivelEducativoMinimo ? nivelEducativoMinimo.trim() : null
      ]
    );

    console.log('✅ Convocatoria creada exitosamente con todos los campos:', result.insertId);
    res.status(201).json({
      message: 'Convocatoria creada exitosamente',
      convocatoriaId: result.insertId,
      numeroCAS: numeroCAS
    });
  } catch (error) {
    console.error('❌ Error al crear convocatoria:', error);
    res.status(500).json({
      error: 'Error al crear convocatoria',
      details: error.message
    });
  }
};

// Obtener todas las convocatorias
const obtenerConvocatorias = async (req, res) => {
  try {
    await ensureConvocatoriasTable();

    const { estado, area, publicada } = req.query;

    // Verificar si la tabla grupos_comite_convocatorias existe
    let tablaGruposExiste = false;
    try {
      const [tables] = await pool.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grupos_comite_convocatorias'`
      );
      tablaGruposExiste = tables.length > 0;
    } catch (e) {
      // Si hay error, asumir que la tabla no existe
      tablaGruposExiste = false;
    }

    let query = 'SELECT * FROM convocatorias WHERE 1=1';
    const params = [];

    // Filtro por estado
    if (estado) {
      query += ' AND estado = ?';
      params.push(estado);
    }

    // Filtro por área
    if (area) {
      query += ' AND area = ?';
      params.push(area);
    }

    // Filtro por publicada (Publicada/No Publicada)
    if (publicada !== undefined) {
      if (publicada === 'true' || publicada === '1') {
        query += " AND estado IN ('Publicada', 'Activo')";
        // Excluir convocatorias que están asignadas a grupos de comité (solo si la tabla existe)
        if (tablaGruposExiste) {
          query += ` AND IDCONVOCATORIA NOT IN (
            SELECT DISTINCT IDCONVOCATORIA 
            FROM grupos_comite_convocatorias
          )`;
        }
      } else {
        query += " AND estado IN ('No Publicada', 'Inactivo')";
      }
    } else {
      // Si no hay filtro de publicada, pero se está buscando por estado activo/publicada, también excluir las asignadas a grupos
      if (estado && (estado === 'Publicada' || estado === 'Activo') && tablaGruposExiste) {
        query += ` AND IDCONVOCATORIA NOT IN (
          SELECT DISTINCT IDCONVOCATORIA 
          FROM grupos_comite_convocatorias
        )`;
      }
    }

    query += ' ORDER BY fechaCreacion DESC';

    const [convocatorias] = await pool.execute(query, params);

    console.log(`✅ ${convocatorias.length} convocatorias obtenidas`);
    res.status(200).json(convocatorias);
  } catch (error) {
    console.error('❌ Error al obtener convocatorias:', error);
    res.status(500).json({
      error: 'Error al obtener convocatorias',
      details: error.message
    });
  }
};

// Obtener convocatoria por ID
const obtenerConvocatoriaPorId = async (req, res) => {
  try {
    await ensureConvocatoriasTable();

    const { id } = req.params;

    const [convocatorias] = await pool.execute(
      'SELECT * FROM convocatorias WHERE IDCONVOCATORIA = ?',
      [id]
    );

    if (convocatorias.length === 0) {
      return res.status(404).json({
        error: 'Convocatoria no encontrada'
      });
    }

    res.status(200).json(convocatorias[0]);
  } catch (error) {
    console.error('❌ Error al obtener convocatoria:', error);
    res.status(500).json({
      error: 'Error al obtener convocatoria',
      details: error.message
    });
  }
};

// Actualizar convocatoria
const actualizarConvocatoria = async (req, res) => {
  try {
    await ensureConvocatoriasTable();

    const { id } = req.params;
    const {
      area,
      puesto,
      tipoPuesto,
      sueldo,
      tituloProfesional,
      expPublicaMin,
      expPublicaMax,
      experienciaTotal,
      experiencia,
      experienciaLaboral,
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin,
      estado,
      numeroCAS,
      requisitosAcademicos,
      habilidadesTecnicas,
      publicada,
      // Campos del perfil del puesto
      experienciaEspecifica,
      experienciaMaxima,
      formacionNivel,
      formacionGrado,
      requiereColegiatura,
      requiereHabilitacion,
      cursosEspecializacion,
      duracionContrato,
      conocimientosOfimatica,
      conocimientosIdiomas,
      // Campos específicos por tipo
      tituladoTecnico,
      colegiaturaProfesional,
      colegioProfesionalHabilitado,
      nivelEducativoMinimo
    } = req.body;

    // Verificar que la convocatoria existe
    const [existing] = await pool.execute(
      'SELECT IDCONVOCATORIA FROM convocatorias WHERE IDCONVOCATORIA = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Convocatoria no encontrada'
      });
    }

    // Si se actualiza el número CAS, verificar que no esté duplicado
    if (numeroCAS) {
      const [existingCAS] = await pool.execute(
        'SELECT IDCONVOCATORIA FROM convocatorias WHERE numeroCAS = ? AND IDCONVOCATORIA != ?',
        [numeroCAS, id]
      );

      if (existingCAS.length > 0) {
        return res.status(400).json({
          error: 'Ya existe otra convocatoria con este número CAS'
        });
      }
    }

    // Validar fechas si se proporcionan
    if (fechaInicio && fechaFin) {
      const fechaInicioDate = new Date(fechaInicio);
      const fechaFinDate = new Date(fechaFin);

      if (isNaN(fechaInicioDate.getTime()) || isNaN(fechaFinDate.getTime())) {
        return res.status(400).json({
          error: 'Las fechas proporcionadas no son válidas'
        });
      }

      if (fechaFinDate < fechaInicioDate) {
        return res.status(400).json({
          error: 'La fecha de fin debe ser posterior a la fecha de inicio'
        });
      }
    }

    // Construir query dinámico con TODOS los campos
    const updates = [];
    const values = [];

    if (area !== undefined) {
      updates.push('area = ?');
      values.push(area.trim());
    }
    if (puesto !== undefined) {
      updates.push('puesto = ?');
      values.push(puesto.trim());
    }
    if (tipoPuesto !== undefined) {
      updates.push('tipoPuesto = ?');
      values.push(tipoPuesto || null);
    }
    if (sueldo !== undefined) {
      updates.push('sueldo = ?');
      values.push(sueldo ? sueldo.trim() : null);
    }
    if (tituloProfesional !== undefined) {
      updates.push('tituloProfesional = ?');
      values.push(tituloProfesional ? tituloProfesional.trim() : null);
    }
    if (expPublicaMin !== undefined) {
      updates.push('expPublicaMin = ?');
      values.push(expPublicaMin ? expPublicaMin.trim() : null);
    }
    if (expPublicaMax !== undefined) {
      updates.push('expPublicaMax = ?');
      values.push(expPublicaMax ? expPublicaMax.trim() : null);
    }
    const experienciaTexto = experienciaTotal ?? experiencia ?? experienciaLaboral;
    if (experienciaTexto !== undefined) {
      updates.push('experienciaTotal = ?');
      values.push(experienciaTexto ? experienciaTexto.toString().trim() : null);
    }
    if (fechaInicio !== undefined) {
      updates.push('fechaInicio = ?');
      values.push(fechaInicio);
    }
    if (fechaFin !== undefined) {
      updates.push('fechaFin = ?');
      values.push(fechaFin);
    }
    if (horaInicio !== undefined) {
      updates.push('horaInicio = ?');
      values.push(horaInicio || null);
    }
    if (horaFin !== undefined) {
      updates.push('horaFin = ?');
      values.push(horaFin || null);
    }
    if (estado !== undefined) {
      updates.push('estado = ?');
      const estadoFinal = ['Activo', 'Inactivo', 'Publicada', 'No Publicada'].includes(estado)
        ? estado
        : 'No Publicada';
      values.push(estadoFinal);
    }
    if (numeroCAS !== undefined) {
      updates.push('numeroCAS = ?');
      values.push(numeroCAS.trim());
    }
    if (requisitosAcademicos !== undefined) {
      updates.push('requisitosAcademicos = ?');
      values.push(requisitosAcademicos ? requisitosAcademicos.trim() : null);
    }
    if (habilidadesTecnicas !== undefined) {
      updates.push('habilidadesTecnicas = ?');
      values.push(habilidadesTecnicas ? habilidadesTecnicas.trim() : null);
    }
    if (experienciaEspecifica !== undefined) {
      updates.push('experienciaEspecifica = ?');
      values.push(experienciaEspecifica ? experienciaEspecifica.trim() : null);
    }
    if (experienciaMaxima !== undefined) {
      updates.push('experienciaMaxima = ?');
      values.push(experienciaMaxima ? experienciaMaxima.trim() : null);
    }
    if (formacionNivel !== undefined) {
      updates.push('formacionNivel = ?');
      const formacionNivelJSON = Array.isArray(formacionNivel) ? JSON.stringify(formacionNivel) : formacionNivel;
      values.push(formacionNivelJSON || null);
    }
    if (formacionGrado !== undefined) {
      updates.push('formacionGrado = ?');
      const formacionGradoJSON = Array.isArray(formacionGrado) ? JSON.stringify(formacionGrado) : formacionGrado;
      values.push(formacionGradoJSON || null);
    }
    if (requiereColegiatura !== undefined) {
      updates.push('requiereColegiatura = ?');
      values.push(requiereColegiatura || 'no');
    }
    if (requiereHabilitacion !== undefined) {
      updates.push('requiereHabilitacion = ?');
      values.push(requiereHabilitacion || 'no');
    }
    if (cursosEspecializacion !== undefined) {
      updates.push('cursosEspecializacion = ?');
      values.push(cursosEspecializacion ? cursosEspecializacion.trim() : null);
    }
    if (duracionContrato !== undefined) {
      updates.push('duracionContrato = ?');
      values.push(duracionContrato ? duracionContrato.trim() : null);
    }
    if (conocimientosOfimatica !== undefined) {
      updates.push('conocimientosOfimatica = ?');
      values.push(conocimientosOfimatica ? conocimientosOfimatica.trim() : null);
    }
    if (conocimientosIdiomas !== undefined) {
      updates.push('conocimientosIdiomas = ?');
      values.push(conocimientosIdiomas ? conocimientosIdiomas.trim() : null);
    }
    if (tituladoTecnico !== undefined) {
      updates.push('tituladoTecnico = ?');
      values.push(tituladoTecnico ? tituladoTecnico.trim() : null);
    }
    if (colegiaturaProfesional !== undefined) {
      updates.push('colegiaturaProfesional = ?');
      values.push(colegiaturaProfesional || 'no');
    }
    if (colegioProfesionalHabilitado !== undefined) {
      updates.push('colegioProfesionalHabilitado = ?');
      values.push(colegioProfesionalHabilitado || 'NO');
    }
    if (nivelEducativoMinimo !== undefined) {
      updates.push('nivelEducativoMinimo = ?');
      values.push(nivelEducativoMinimo ? nivelEducativoMinimo.trim() : null);
    }
    if (publicada !== undefined) {
      const publicadaFlag = publicada === true || publicada === 'true' || publicada === 1 || publicada === '1';
      updates.push('publicada = ?');
      values.push(publicadaFlag ? 1 : 0);
      if (estado === undefined) {
        updates.push('estado = ?');
        values.push(publicadaFlag ? 'Publicada' : 'No Publicada');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No se proporcionaron campos para actualizar'
      });
    }

    values.push(id);

    const query = `UPDATE convocatorias SET ${updates.join(', ')} WHERE IDCONVOCATORIA = ?`;

    await pool.execute(query, values);

    console.log('✅ Convocatoria actualizada exitosamente con todos los campos:', id);
    res.status(200).json({
      message: 'Convocatoria actualizada exitosamente',
      convocatoriaId: id
    });
  } catch (error) {
    console.error('❌ Error al actualizar convocatoria:', error);
    res.status(500).json({
      error: 'Error al actualizar convocatoria',
      details: error.message
    });
  }
};

// Cambiar estado de publicación de una convocatoria
const cambiarEstadoPublicacion = async (req, res) => {
  try {
    await ensureConvocatoriasTable();

    const { id } = req.params;
    const { estado } = req.body;

    // Verificar que la convocatoria existe
    const [existing] = await pool.execute(
      'SELECT IDCONVOCATORIA FROM convocatorias WHERE IDCONVOCATORIA = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Convocatoria no encontrada'
      });
    }

    // Validar estado
    const estadosPermitidos = ['Activo', 'Inactivo', 'Publicada', 'No Publicada'];
    const estadoFinal = estadosPermitidos.includes(estado) ? estado : 'No Publicada';

    // Si se está desactivando la convocatoria, removerla de todos los grupos
    const estaDesactivando = estadoFinal === 'No Publicada' || estadoFinal === 'Inactivo';
    if (estaDesactivando) {
      try {
        // Verificar si existe la tabla de grupos_comite_convocatorias
        const [tables] = await pool.execute(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grupos_comite_convocatorias'`
        );

        if (tables.length > 0) {
          // Obtener los grupos donde está asignada esta convocatoria
          const [gruposAsignados] = await pool.execute(
            `SELECT DISTINCT IDGRUPO FROM grupos_comite_convocatorias WHERE IDCONVOCATORIA = ?`,
            [id]
          );

          if (gruposAsignados.length > 0) {
            // Eliminar la convocatoria de todos los grupos
            await pool.execute(
              `DELETE FROM grupos_comite_convocatorias WHERE IDCONVOCATORIA = ?`,
              [id]
            );

            console.log(`✅ Convocatoria ${id} removida automáticamente de ${gruposAsignados.length} grupo(s) al desactivarse`);
          }
        }
      } catch (error) {
        // Si hay error al remover de grupos, continuar con el cambio de estado
        console.warn('⚠️ Error al remover convocatoria de grupos (continuando con cambio de estado):', error.message);
      }
    }

    await pool.execute(
      'UPDATE convocatorias SET estado = ?, publicada = ? WHERE IDCONVOCATORIA = ?',
      [estadoFinal, (estadoFinal === 'Publicada' || estadoFinal === 'Activo') ? 1 : 0, id]
    );

    console.log(`✅ Estado de convocatoria ${id} actualizado a: ${estadoFinal}`);
    res.status(200).json({
      message: 'Estado de publicación actualizado exitosamente',
      convocatoriaId: id,
      nuevoEstado: estadoFinal
    });
  } catch (error) {
    console.error('❌ Error al cambiar estado de publicación:', error);
    res.status(500).json({
      error: 'Error al cambiar estado de publicación',
      details: error.message
    });
  }
};

// Eliminar convocatoria
const eliminarConvocatoria = async (req, res) => {
  try {
    await ensureConvocatoriasTable();

    const { id } = req.params;

    // Verificar que la convocatoria existe
    const [existing] = await pool.execute(
      'SELECT IDCONVOCATORIA FROM convocatorias WHERE IDCONVOCATORIA = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Convocatoria no encontrada'
      });
    }

    await pool.execute(
      'DELETE FROM convocatorias WHERE IDCONVOCATORIA = ?',
      [id]
    );

    console.log('✅ Convocatoria eliminada exitosamente:', id);
    res.status(200).json({
      message: 'Convocatoria eliminada exitosamente',
      convocatoriaId: id
    });
  } catch (error) {
    console.error('❌ Error al eliminar convocatoria:', error);
    res.status(500).json({
      error: 'Error al eliminar convocatoria',
      details: error.message
    });
  }
};

// ============================================================
// 📄 FUNCIONES PARA MANEJO DE PDFs
// ============================================================

// Subir PDF al sistema de archivos
const subirPDF = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📥 Recibiendo solicitud de subida de PDF para convocatoria:', id);
    console.log('📦 Datos de la solicitud:', {
      hasFiles: !!req.files,
      hasFile: !!req.file,
      headers: req.headers['content-type'],
      filesKeys: req.files ? Object.keys(req.files) : [],
      bodyKeys: Object.keys(req.body || {})
    });

    // Intentar obtener el archivo de req.files (express-fileupload) o req.file (multer)
    let pdfFile = null;

    if (req.files && req.files.pdf) {
      // express-fileupload
      pdfFile = req.files.pdf;
      console.log('📄 Archivo recibido via express-fileupload');
    } else if (req.file) {
      // multer
      pdfFile = {
        data: req.file.buffer,
        name: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      };
      console.log('📄 Archivo recibido via multer');
    }

    if (!pdfFile) {
      console.error('❌ No se recibió ningún archivo');
      console.error('req.files:', req.files);
      console.error('req.file:', req.file);
      return res.status(400).json({
        error: 'No se proporcionó ningún archivo PDF'
      });
    }

    console.log('📄 Archivo recibido:', {
      name: pdfFile.name,
      mimetype: pdfFile.mimetype,
      size: pdfFile.size,
      hasData: !!pdfFile.data
    });

    // Validar que sea un PDF
    if (pdfFile.mimetype !== 'application/pdf') {
      return res.status(400).json({
        error: 'Solo se permiten archivos PDF'
      });
    }

    // Verificar que la convocatoria existe
    const [existing] = await pool.execute(
      'SELECT IDCONVOCATORIA FROM convocatorias WHERE IDCONVOCATORIA = ?',
      [id]
    );

    if (existing.length === 0) {
      console.error('❌ Convocatoria no encontrada:', id);
      return res.status(404).json({
        error: 'Convocatoria no encontrada'
      });
    }

    // Crear carpeta de uploads si no existe
    const fs = await import('fs');
    const path = await import('path');
    const uploadsDir = path.join(process.cwd(), 'uploads', 'convocatorias');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Carpeta de uploads creada:', uploadsDir);
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const sanitizedName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `convocatoria_${id}_${timestamp}_${sanitizedName}`;
    const filePath = path.join(uploadsDir, fileName);

    // Guardar el archivo en el sistema de archivos
    fs.writeFileSync(filePath, pdfFile.data);
    console.log('💾 PDF guardado en:', filePath);

    // Guardar la ruta del archivo en la base de datos
    const relativePath = `uploads/convocatorias/${fileName}`;
    await pool.execute(
      `UPDATE convocatorias 
       SET nombreArchivoPDF = ?, 
           rutaArchivoPDF = ?,
           tamanoArchivoPDF = ? 
       WHERE IDCONVOCATORIA = ?`,
      [pdfFile.name, relativePath, pdfFile.size, id]
    );

    console.log(`✅ PDF guardado para convocatoria ${id}: ${pdfFile.name} (${pdfFile.size} bytes)`);

    res.status(200).json({
      message: 'PDF guardado exitosamente',
      convocatoriaId: id,
      nombreArchivo: pdfFile.name,
      tamano: pdfFile.size,
      ruta: relativePath
    });
  } catch (error) {
    console.error('❌ Error al subir PDF:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      error: 'Error al guardar el PDF',
      details: error.message
    });
  }
};

// Descargar/Visualizar PDF desde el sistema de archivos
const descargarPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { download } = req.query; // Parámetro opcional para forzar descarga

    console.log(`📄 Solicitando PDF de convocatoria ${id}, download=${download}`);

    // Obtener la ruta del PDF de la base de datos
    const [rows] = await pool.execute(
      `SELECT nombreArchivoPDF, rutaArchivoPDF, tamanoArchivoPDF 
       FROM convocatorias 
       WHERE IDCONVOCATORIA = ?`,
      [id]
    );

    if (rows.length === 0) {
      console.error(`❌ Convocatoria ${id} no encontrada`);
      return res.status(404).json({
        error: 'Convocatoria no encontrada'
      });
    }

    const convocatoria = rows[0];

    if (!convocatoria.rutaArchivoPDF) {
      console.error(`❌ Convocatoria ${id} no tiene PDF asociado`);
      return res.status(404).json({
        error: 'Esta convocatoria no tiene un PDF asociado'
      });
    }

    const fs = await import('fs');
    const path = await import('path');

    const filePath = path.join(process.cwd(), convocatoria.rutaArchivoPDF);
    const nombreArchivo = convocatoria.nombreArchivoPDF || 'convocatoria.pdf';

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Archivo no encontrado: ${filePath}`);
      return res.status(404).json({
        error: 'El archivo PDF no se encuentra en el servidor'
      });
    }

    // Obtener el tamaño real del archivo
    const stats = fs.statSync(filePath);
    const tamano = stats.size;

    console.log(`✅ PDF encontrado: ${nombreArchivo}, tamaño: ${tamano} bytes, ruta: ${filePath}`);

    // Configurar headers para visualización en el navegador (inline) o descarga (attachment)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', tamano);

    // Si se pasa ?download=true, forzar descarga, sino mostrar inline
    if (download === 'true' || download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      console.log(`📥 Enviando PDF como descarga: ${nombreArchivo}`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
      console.log(`👁️ Enviando PDF para visualización: ${nombreArchivo}`);
    }

    // Headers adicionales para mejor compatibilidad
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.setHeader('Accept-Ranges', 'bytes');

    // Enviar el archivo
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('❌ Error al obtener PDF:', error);
    res.status(500).json({
      error: 'Error al obtener el PDF',
      details: error.message
    });
  }
};

export {
  crearConvocatoria,
  obtenerConvocatorias,
  obtenerConvocatoriaPorId,
  actualizarConvocatoria,
  cambiarEstadoPublicacion,
  eliminarConvocatoria,
  subirPDF,
  descargarPDF
};
