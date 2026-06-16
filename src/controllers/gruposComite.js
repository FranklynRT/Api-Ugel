import { pool } from '../database/conexion.js';

// ============================================================
// 🔧 FUNCIONES DEL CONTROLADOR DE GRUPOS DE COMITÉ
// ============================================================

// Helper para verificar que el usuario sea Admin o RRHH
function verificarRolAdminORRHH(req, res) {
  const userRole = (req.user?.rol || req.user?.ROLE || '').toLowerCase();
  
  console.log('🔐 Verificando rol para grupos de comité:', {
    usuario: req.user?.nombreCompleto || req.user?.nombre,
    rol: userRole,
    rolOriginal: req.user?.rol || req.user?.ROLE
  });
  
  // Verificar si el rol contiene admin, rrhh o recursos humanos
  const esAdmin = userRole.includes('admin');
  const esRRHH = userRole.includes('rrhh') || userRole.includes('recursos humanos') || userRole.includes('rr.hh');
  
  if (!esAdmin && !esRRHH) {
    console.log('❌ Acceso denegado - Rol no autorizado:', userRole);
    res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo Admin y RRHH pueden gestionar grupos de comité.',
      rolActual: req.user?.rol || req.user?.ROLE
    });
    return false;
  }
  
  console.log('✅ Acceso permitido para gestionar grupos de comité');
  return true;
}

// Función para verificar y crear la tabla grupos_comite si no existe
async function ensureGruposComiteTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grupos_comite'`
    );
    
    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS grupos_comite (
          IDGRUPO INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL UNIQUE,
          descripcion TEXT,
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_nombre (nombre)
        )
      `);
      console.log('✅ Tabla grupos_comite creada exitosamente');
      
      // Crear los 5 grupos iniciales con nombres específicos
      const gruposIniciales = [
        { nombre: 'Administración', descripcion: 'Grupo de Administración para evaluación de postulantes' },
        { nombre: 'UPDI', descripcion: 'Grupo UPDI para evaluación de postulantes' },
        { nombre: 'AGP', descripcion: 'Grupo AGP para evaluación de postulantes' },
        { nombre: 'Recursos Humanos', descripcion: 'Grupo de Recursos Humanos para evaluación de postulantes' },
        { nombre: 'Dirección', descripcion: 'Grupo de Dirección para evaluación de postulantes' }
      ];
      
      for (const grupo of gruposIniciales) {
        await pool.execute(
          `INSERT IGNORE INTO grupos_comite (nombre, descripcion) 
           VALUES (?, ?)`,
          [grupo.nombre, grupo.descripcion]
        );
      }
      console.log('✅ 5 grupos de comité iniciales creados');
    }
  } catch (error) {
    console.error('❌ Error al crear tabla grupos_comite:', error);
    throw error;
  }
}

// Función para verificar y crear la tabla grupos_comite_usuarios si no existe
async function ensureGruposComiteUsuariosTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grupos_comite_usuarios'`
    );
    
    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS grupos_comite_usuarios (
          ID INT AUTO_INCREMENT PRIMARY KEY,
          IDGRUPO INT NOT NULL,
          IDUSUARIO INT NOT NULL,
          fechaAsignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (IDGRUPO) REFERENCES grupos_comite(IDGRUPO) ON DELETE CASCADE,
          FOREIGN KEY (IDUSUARIO) REFERENCES usuarios(IDUSUARIO) ON DELETE CASCADE,
          UNIQUE KEY unique_grupo_usuario (IDGRUPO, IDUSUARIO),
          INDEX idx_grupo (IDGRUPO),
          INDEX idx_usuario (IDUSUARIO)
        )
      `);
      console.log('✅ Tabla grupos_comite_usuarios creada exitosamente');
    }
  } catch (error) {
    // Si falla por referencia de clave foránea, intentar crear sin ellas
    try {
      const [tables] = await pool.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grupos_comite_usuarios'`
      );
      if (tables.length === 0) {
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS grupos_comite_usuarios (
            ID INT AUTO_INCREMENT PRIMARY KEY,
            IDGRUPO INT NOT NULL,
            IDUSUARIO INT NOT NULL,
            fechaAsignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_grupo_usuario (IDGRUPO, IDUSUARIO),
            INDEX idx_grupo (IDGRUPO),
            INDEX idx_usuario (IDUSUARIO)
          )
        `);
        console.log('✅ Tabla grupos_comite_usuarios creada exitosamente (sin foreign keys)');
      }
    } catch (e2) {
      console.error('⚠️ Error al crear tabla grupos_comite_usuarios (intento alternativo):', e2.message);
    }
  }
}

// Función para verificar y crear la tabla grupos_comite_convocatorias si no existe
async function ensureGruposComiteConvocatoriasTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grupos_comite_convocatorias'`
    );
    
    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS grupos_comite_convocatorias (
          ID INT AUTO_INCREMENT PRIMARY KEY,
          IDGRUPO INT NOT NULL,
          IDCONVOCATORIA INT NOT NULL,
          fechaAsignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (IDGRUPO) REFERENCES grupos_comite(IDGRUPO) ON DELETE CASCADE,
          FOREIGN KEY (IDCONVOCATORIA) REFERENCES convocatorias(IDCONVOCATORIA) ON DELETE CASCADE,
          UNIQUE KEY unique_grupo_convocatoria (IDGRUPO, IDCONVOCATORIA),
          INDEX idx_grupo (IDGRUPO),
          INDEX idx_convocatoria (IDCONVOCATORIA)
        )
      `);
      console.log('✅ Tabla grupos_comite_convocatorias creada exitosamente');
    }
  } catch (error) {
    // Si falla por referencia de clave foránea, intentar crear sin ellas
    try {
      const [tables] = await pool.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grupos_comite_convocatorias'`
      );
      if (tables.length === 0) {
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS grupos_comite_convocatorias (
            ID INT AUTO_INCREMENT PRIMARY KEY,
            IDGRUPO INT NOT NULL,
            IDCONVOCATORIA INT NOT NULL,
            fechaAsignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_grupo_convocatoria (IDGRUPO, IDCONVOCATORIA),
            INDEX idx_grupo (IDGRUPO),
            INDEX idx_convocatoria (IDCONVOCATORIA)
          )
        `);
        console.log('✅ Tabla grupos_comite_convocatorias creada exitosamente (sin foreign keys)');
      }
    } catch (e2) {
      console.error('⚠️ Error al crear tabla grupos_comite_convocatorias (intento alternativo):', e2.message);
    }
  }
}

// Función para actualizar nombres de grupos existentes
async function actualizarNombresGrupos() {
  try {
    const gruposNombres = [
      { nombre: 'Administración', descripcion: 'Grupo de Administración para evaluación de postulantes' },
      { nombre: 'UPDI', descripcion: 'Grupo UPDI para evaluación de postulantes' },
      { nombre: 'AGP', descripcion: 'Grupo AGP para evaluación de postulantes' },
      { nombre: 'Recursos Humanos', descripcion: 'Grupo de Recursos Humanos para evaluación de postulantes' },
      { nombre: 'Dirección', descripcion: 'Grupo de Dirección para evaluación de postulantes' }
    ];
    
    // Verificar qué nombres correctos ya existen
    const nombresCorrectos = gruposNombres.map(g => g.nombre);
    const placeholders = nombresCorrectos.map(() => '?').join(',');
    const [gruposExistentes] = await pool.execute(
      `SELECT IDGRUPO, nombre FROM grupos_comite WHERE nombre IN (${placeholders})`,
      nombresCorrectos
    );
    
    const nombresExistentes = new Set(gruposExistentes.map(g => g.nombre));
    
    // Obtener grupos con nombres antiguos (Grupo 1, Grupo 2, etc.) o que no tengan nombres correctos
    const [grupos] = await pool.execute(
      `SELECT IDGRUPO, nombre FROM grupos_comite 
       WHERE nombre LIKE 'Grupo %' OR nombre NOT IN (${placeholders})
       ORDER BY IDGRUPO LIMIT 5`,
      nombresCorrectos
    );
    
    // Actualizar grupos por orden de ID, asignando nombres que aún no existen
    let indiceNombre = 0;
    for (const grupo of grupos) {
      if (indiceNombre >= gruposNombres.length) break;
      
      // Buscar el siguiente nombre que no existe aún
      while (indiceNombre < gruposNombres.length && nombresExistentes.has(gruposNombres[indiceNombre].nombre)) {
        indiceNombre++;
      }
      
      if (indiceNombre < gruposNombres.length) {
        const nuevoNombre = gruposNombres[indiceNombre];
        
        // Solo actualizar si el nombre es diferente
        if (grupo.nombre !== nuevoNombre.nombre) {
          try {
            await pool.execute(
              `UPDATE grupos_comite 
               SET nombre = ?, descripcion = ? 
               WHERE IDGRUPO = ?`,
              [nuevoNombre.nombre, nuevoNombre.descripcion, grupo.IDGRUPO]
            );
            nombresExistentes.add(nuevoNombre.nombre);
            console.log(`✅ Grupo ${grupo.IDGRUPO} actualizado: "${grupo.nombre}" -> "${nuevoNombre.nombre}"`);
            indiceNombre++;
          } catch (error) {
            // Si hay error (por ejemplo, nombre duplicado), continuar con el siguiente
            console.warn(`⚠️ No se pudo actualizar grupo ${grupo.IDGRUPO}:`, error.message);
            indiceNombre++;
          }
        } else {
          nombresExistentes.add(nuevoNombre.nombre);
          indiceNombre++;
        }
      }
    }
    
    // Crear grupos faltantes si no existen todos los 5
    const [todosGrupos] = await pool.execute(
      `SELECT COUNT(*) as count FROM grupos_comite WHERE nombre IN (${placeholders})`,
      nombresCorrectos
    );
    
    if (todosGrupos[0].count < 5) {
      for (const grupoNombre of gruposNombres) {
        if (!nombresExistentes.has(grupoNombre.nombre)) {
          try {
            await pool.execute(
              `INSERT IGNORE INTO grupos_comite (nombre, descripcion) VALUES (?, ?)`,
              [grupoNombre.nombre, grupoNombre.descripcion]
            );
            console.log(`✅ Grupo "${grupoNombre.nombre}" creado`);
          } catch (error) {
            console.warn(`⚠️ No se pudo crear grupo "${grupoNombre.nombre}":`, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Error al actualizar nombres de grupos:', error.message);
  }
}

// Inicializar todas las tablas
async function initializeTables() {
  await ensureGruposComiteTable();
  await ensureGruposComiteUsuariosTable();
  await ensureGruposComiteConvocatoriasTable();
  await actualizarNombresGrupos(); // Actualizar nombres de grupos existentes
}

// Obtener todos los grupos de comité
export async function obtenerGruposComite(req, res) {
  try {
    // No se requiere verificación de rol para lectura de grupos
    // Los usuarios del comité necesitan ver los grupos disponibles
    
    await initializeTables();
    
    const [grupos] = await pool.execute(
      `SELECT IDGRUPO as id, nombre, descripcion, fechaCreacion 
       FROM grupos_comite 
       ORDER BY FIELD(nombre, 'Administración', 'UPDI', 'AGP', 'Recursos Humanos', 'Dirección'), nombre`
    );
    
    // Obtener usuarios y convocatorias para cada grupo
    const gruposConDatos = await Promise.all(
      grupos.map(async (grupo) => {
        // Obtener usuarios del grupo
        const [usuarios] = await pool.execute(
          `SELECT u.IDUSUARIO as id, u.nombreCompleto as nombre, 
                  u.nombreCompleto, u.apellidoPaterno, u.apellidoMaterno, 
                  u.correo as email, u.telefono, u.documento
           FROM grupos_comite_usuarios gcu
           INNER JOIN usuarios u ON gcu.IDUSUARIO = u.IDUSUARIO
           WHERE gcu.IDGRUPO = ?`,
          [grupo.id]
        );
        
        // Obtener convocatorias del grupo
        // Incluir convocatorias con estado "Inactivo" porque son las que están asignadas a grupos
        // Excluir solo las que tienen estado "No Publicada" (desactivadas permanentemente)
        const [convocatorias] = await pool.execute(
          `SELECT c.IDCONVOCATORIA, c.numeroCAS, c.puesto, c.area, 
                  c.estado, gcc.fechaAsignacion
           FROM grupos_comite_convocatorias gcc
           INNER JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
           WHERE gcc.IDGRUPO = ?
           AND c.estado != 'No Publicada' AND c.estado != 'no publicada'`,
          [grupo.id]
        );
        
        // Eliminar automáticamente convocatorias desactivadas (estado "No Publicada") de este grupo
        const [convocatoriasDesactivadas] = await pool.execute(
          `SELECT gcc.IDCONVOCATORIA 
           FROM grupos_comite_convocatorias gcc
           INNER JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
           WHERE gcc.IDGRUPO = ? 
           AND (c.estado = 'No Publicada' OR c.estado = 'no publicada')`,
          [grupo.id]
        );
        
        if (convocatoriasDesactivadas.length > 0) {
          for (const conv of convocatoriasDesactivadas) {
            await pool.execute(
              `DELETE FROM grupos_comite_convocatorias 
               WHERE IDGRUPO = ? AND IDCONVOCATORIA = ?`,
              [grupo.id, conv.IDCONVOCATORIA]
            );
          }
        }
        
        return {
          id: grupo.id,
          nombre: grupo.nombre ? String(grupo.nombre) : `Grupo ${grupo.id}`,
          descripcion: grupo.descripcion ? String(grupo.descripcion) : 'Sin descripción',
          fechaCreacion: grupo.fechaCreacion,
          usuarios: (usuarios || []).map(u => ({
            ...u,
            nombre: u.nombre ? String(u.nombre) : '',
            nombreCompleto: u.nombreCompleto ? String(u.nombreCompleto) : '',
            apellidoPaterno: u.apellidoPaterno ? String(u.apellidoPaterno) : '',
            apellidoMaterno: u.apellidoMaterno ? String(u.apellidoMaterno) : '',
            email: u.email ? String(u.email) : '',
            telefono: u.telefono ? String(u.telefono) : '',
            documento: u.documento ? String(u.documento) : ''
          })),
          convocatorias: (convocatorias || []).map(c => ({
            ...c,
            numeroCAS: c.numeroCAS ? String(c.numeroCAS) : '',
            puesto: c.puesto ? String(c.puesto) : '',
            area: c.area ? String(c.area) : '',
            estado: c.estado ? String(c.estado) : ''
          }))
        };
      })
    );
    
    res.json(gruposConDatos);
  } catch (error) {
    console.error('Error al obtener grupos de comité:', error);
    res.status(500).json({ error: 'Error al obtener grupos de comité', message: error.message });
  }
}

// Crear un nuevo grupo de comité
export async function crearGrupoComite(req, res) {
  try {
    // Verificar que el usuario sea Admin o RRHH
    if (!verificarRolAdminORRHH(req, res)) return;
    
    await initializeTables();
    
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del grupo es requerido' });
    }
    
    const [result] = await pool.execute(
      `INSERT INTO grupos_comite (nombre, descripcion) 
       VALUES (?, ?)`,
      [nombre, descripcion || '']
    );
    
    const [grupo] = await pool.execute(
      `SELECT IDGRUPO as id, nombre, descripcion, fechaCreacion 
       FROM grupos_comite 
       WHERE IDGRUPO = ?`,
      [result.insertId]
    );
    
    res.status(201).json({
      id: grupo[0].id,
      nombre: grupo[0].nombre ? String(grupo[0].nombre) : `Grupo ${grupo[0].id}`,
      descripcion: grupo[0].descripcion ? String(grupo[0].descripcion) : 'Sin descripción',
      fechaCreacion: grupo[0].fechaCreacion,
      usuarios: [],
      convocatorias: []
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un grupo con ese nombre' });
    }
    console.error('Error al crear grupo de comité:', error);
    res.status(500).json({ error: 'Error al crear grupo de comité', message: error.message });
  }
}

// Obtener un grupo de comité por ID
export async function obtenerGrupoComitePorId(req, res) {
  try {
    await initializeTables();
    
    const { id } = req.params;
    
    const [grupos] = await pool.execute(
      `SELECT IDGRUPO as id, nombre, descripcion, fechaCreacion 
       FROM grupos_comite 
       WHERE IDGRUPO = ?`,
      [id]
    );
    
    if (grupos.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    
    const grupo = grupos[0];
    
    // Obtener usuarios del grupo
    const [usuarios] = await pool.execute(
      `SELECT u.IDUSUARIO as id, u.nombreCompleto as nombre, 
              u.nombreCompleto, u.apellidoPaterno, u.apellidoMaterno, 
              u.correo as email, u.telefono, u.documento
       FROM grupos_comite_usuarios gcu
       INNER JOIN usuarios u ON gcu.IDUSUARIO = u.IDUSUARIO
       WHERE gcu.IDGRUPO = ?`,
      [id]
    );
    
    // Obtener convocatorias del grupo
    const [convocatorias] = await pool.execute(
      `SELECT c.IDCONVOCATORIA, c.numeroCAS, c.puesto, c.area, 
              c.estado, gcc.fechaAsignacion
       FROM grupos_comite_convocatorias gcc
       INNER JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
       WHERE gcc.IDGRUPO = ?`,
      [id]
    );
    
    res.json({
      id: grupo.id,
      nombre: grupo.nombre ? String(grupo.nombre) : `Grupo ${grupo.id}`,
      descripcion: grupo.descripcion ? String(grupo.descripcion) : 'Sin descripción',
      fechaCreacion: grupo.fechaCreacion,
      usuarios: (usuarios || []).map(u => ({
        ...u,
        nombre: u.nombre ? String(u.nombre) : '',
        nombreCompleto: u.nombreCompleto ? String(u.nombreCompleto) : '',
        apellidoPaterno: u.apellidoPaterno ? String(u.apellidoPaterno) : '',
        apellidoMaterno: u.apellidoMaterno ? String(u.apellidoMaterno) : '',
        email: u.email ? String(u.email) : '',
        telefono: u.telefono ? String(u.telefono) : '',
        documento: u.documento ? String(u.documento) : ''
      })),
      convocatorias: (convocatorias || []).map(c => ({
        ...c,
        numeroCAS: c.numeroCAS ? String(c.numeroCAS) : '',
        puesto: c.puesto ? String(c.puesto) : '',
        area: c.area ? String(c.area) : '',
        estado: c.estado ? String(c.estado) : ''
      }))
    });
  } catch (error) {
    console.error('Error al obtener grupo de comité:', error);
    res.status(500).json({ error: 'Error al obtener grupo de comité', message: error.message });
  }
}

// Obtener el grupo al que pertenece un usuario
export async function obtenerGrupoPorUsuario(req, res) {
  try {
    await initializeTables();
    
    const { userId } = req.params;
    
    const [grupos] = await pool.execute(
      `SELECT gc.IDGRUPO as id, gc.IDGRUPO, gc.nombre, gc.descripcion, 
              gcu.fechaAsignacion
       FROM grupos_comite_usuarios gcu
       INNER JOIN grupos_comite gc ON gcu.IDGRUPO = gc.IDGRUPO
       WHERE gcu.IDUSUARIO = ?
       LIMIT 1`,
      [userId]
    );
    
    if (grupos.length === 0) {
      return res.status(404).json({ 
        error: 'Usuario no asignado a ningún grupo',
        message: 'El usuario no pertenece a ningún grupo de comité'
      });
    }
    
    const grupo = grupos[0];
    
    res.json({
      id: grupo.id,
      IDGRUPO: grupo.IDGRUPO,
      nombre: grupo.nombre ? String(grupo.nombre) : `Grupo ${grupo.id}`,
      descripcion: grupo.descripcion ? String(grupo.descripcion) : 'Sin descripción',
      fechaAsignacion: grupo.fechaAsignacion
    });
  } catch (error) {
    console.error('Error al obtener grupo del usuario:', error);
    res.status(500).json({ error: 'Error al obtener grupo del usuario', message: error.message });
  }
}

// Obtener usuarios de un grupo
export async function obtenerUsuariosGrupo(req, res) {
  try {
    await initializeTables();
    
    const { id } = req.params;
    
    const [usuarios] = await pool.execute(
      `SELECT u.IDUSUARIO as id, u.nombreCompleto as nombre, 
              u.nombreCompleto, u.apellidoPaterno, u.apellidoMaterno, 
              u.correo as email, u.telefono, u.documento, gcu.fechaAsignacion
       FROM grupos_comite_usuarios gcu
       INNER JOIN usuarios u ON gcu.IDUSUARIO = u.IDUSUARIO
       WHERE gcu.IDGRUPO = ?`,
      [id]
    );
    
    res.json((usuarios || []).map(u => ({
      ...u,
      nombre: u.nombre ? String(u.nombre) : '',
      nombreCompleto: u.nombreCompleto ? String(u.nombreCompleto) : '',
      apellidoPaterno: u.apellidoPaterno ? String(u.apellidoPaterno) : '',
      apellidoMaterno: u.apellidoMaterno ? String(u.apellidoMaterno) : '',
      email: u.email ? String(u.email) : '',
      telefono: u.telefono ? String(u.telefono) : '',
      documento: u.documento ? String(u.documento) : ''
    })));
  } catch (error) {
    console.error('Error al obtener usuarios del grupo:', error);
    res.status(500).json({ error: 'Error al obtener usuarios del grupo', message: error.message });
  }
}

// Asignar usuario a un grupo
export async function asignarUsuarioAGrupo(req, res) {
  try {
    // Verificar que el usuario sea Admin o RRHH
    if (!verificarRolAdminORRHH(req, res)) return;
    
    await initializeTables();
    
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'El ID del usuario es requerido' });
    }
    
    // Verificar que el grupo existe
    const [grupos] = await pool.execute(
      `SELECT IDGRUPO FROM grupos_comite WHERE IDGRUPO = ?`,
      [id]
    );
    
    if (grupos.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    
    // Verificar que el usuario existe y es del comité
    const [usuarios] = await pool.execute(
      `SELECT IDUSUARIO, rol FROM usuarios WHERE IDUSUARIO = ? AND rol = 'comite'`,
      [userId]
    );
    
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado o no es del comité' });
    }
    
    // Verificar si ya está asignado a este grupo
    const [existentes] = await pool.execute(
      `SELECT ID FROM grupos_comite_usuarios 
       WHERE IDGRUPO = ? AND IDUSUARIO = ?`,
      [id, userId]
    );
    
    if (existentes.length > 0) {
      return res.status(409).json({ error: 'El usuario ya está asignado a este grupo' });
    }
    
    // Verificar si el usuario ya está asignado a OTRO grupo
    const [asignadoEnOtroGrupo] = await pool.execute(
      `SELECT gcu.IDGRUPO, gc.nombre 
       FROM grupos_comite_usuarios gcu
       INNER JOIN grupos_comite gc ON gcu.IDGRUPO = gc.IDGRUPO
       WHERE gcu.IDUSUARIO = ? AND gcu.IDGRUPO != ?`,
      [userId, id]
    );
    
    if (asignadoEnOtroGrupo.length > 0) {
      const grupoActual = asignadoEnOtroGrupo[0];
      return res.status(409).json({ 
        error: `El usuario ya está asignado al grupo "${grupoActual.nombre}". Debe removerlo de ese grupo primero antes de asignarlo a otro.` 
      });
    }
    
    // Asignar usuario al grupo
    await pool.execute(
      `INSERT INTO grupos_comite_usuarios (IDGRUPO, IDUSUARIO) 
       VALUES (?, ?)`,
      [id, userId]
    );
    
    // Obtener el usuario asignado
    const [usuario] = await pool.execute(
      `SELECT u.IDUSUARIO as id, u.nombreCompleto as nombre, 
              u.nombreCompleto, u.apellidoPaterno, u.apellidoMaterno, 
              u.correo as email, u.telefono, u.documento
       FROM usuarios u
       WHERE u.IDUSUARIO = ?`,
      [userId]
    );
    
    res.status(201).json(usuario[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El usuario ya está asignado a este grupo' });
    }
    console.error('Error al asignar usuario al grupo:', error);
    res.status(500).json({ error: 'Error al asignar usuario al grupo', message: error.message });
  }
}

// Remover usuario de un grupo
export async function removerUsuarioDeGrupo(req, res) {
  try {
    // Verificar que el usuario sea Admin o RRHH
    if (!verificarRolAdminORRHH(req, res)) return;
    
    await initializeTables();
    
    const { id, userId } = req.params;
    
    const [result] = await pool.execute(
      `DELETE FROM grupos_comite_usuarios 
       WHERE IDGRUPO = ? AND IDUSUARIO = ?`,
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado en el grupo' });
    }
    
    res.json({ message: 'Usuario removido del grupo exitosamente' });
  } catch (error) {
    console.error('Error al remover usuario del grupo:', error);
    res.status(500).json({ error: 'Error al remover usuario del grupo', message: error.message });
  }
}

// Obtener convocatorias de un grupo
export async function obtenerConvocatoriasGrupo(req, res) {
  try {
    await initializeTables();
    
    const { id } = req.params;
    
    // Obtener todas las convocatorias asignadas al grupo
    // Incluir convocatorias con estado "Inactivo" porque son las que están asignadas a grupos
    // Excluir solo las que tienen estado "No Publicada" (desactivadas permanentemente)
    const [convocatorias] = await pool.execute(
      `SELECT c.IDCONVOCATORIA, c.numeroCAS, c.puesto, c.area, 
              c.estado, gcc.fechaAsignacion
       FROM grupos_comite_convocatorias gcc
       INNER JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
       WHERE gcc.IDGRUPO = ? 
       AND c.estado != 'No Publicada' AND c.estado != 'no publicada'`,
      [id]
    );
    
    // Si hay convocatorias con estado "No Publicada" (desactivadas), eliminarlas automáticamente
    const [convocatoriasDesactivadas] = await pool.execute(
      `SELECT gcc.IDCONVOCATORIA 
       FROM grupos_comite_convocatorias gcc
       INNER JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
       WHERE gcc.IDGRUPO = ? 
       AND (c.estado = 'No Publicada' OR c.estado = 'no publicada')`,
      [id]
    );
    
    if (convocatoriasDesactivadas.length > 0) {
      // Eliminar convocatorias desactivadas de este grupo
      for (const conv of convocatoriasDesactivadas) {
        await pool.execute(
          `DELETE FROM grupos_comite_convocatorias 
           WHERE IDGRUPO = ? AND IDCONVOCATORIA = ?`,
          [id, conv.IDCONVOCATORIA]
        );
      }
      console.log(`✅ ${convocatoriasDesactivadas.length} convocatoria(s) desactivada(s) removida(s) automáticamente del grupo ${id}`);
    }
    
    res.json((convocatorias || []).map(c => ({
      ...c,
      numeroCAS: c.numeroCAS ? String(c.numeroCAS) : '',
      puesto: c.puesto ? String(c.puesto) : '',
      area: c.area ? String(c.area) : '',
      estado: c.estado ? String(c.estado) : ''
    })));
  } catch (error) {
    console.error('Error al obtener convocatorias del grupo:', error);
    res.status(500).json({ error: 'Error al obtener convocatorias del grupo', message: error.message });
  }
}

// Asignar convocatoria a un grupo
export async function asignarConvocatoriaAGrupo(req, res) {
  try {
    // Verificar que el usuario sea Admin o RRHH
    if (!verificarRolAdminORRHH(req, res)) return;
    
    await initializeTables();
    
    const { id } = req.params;
    const { convocatoriaId } = req.body;
    
    if (!convocatoriaId) {
      return res.status(400).json({ error: 'El ID de la convocatoria es requerido' });
    }
    
    // Verificar que el grupo existe
    const [grupos] = await pool.execute(
      `SELECT IDGRUPO FROM grupos_comite WHERE IDGRUPO = ?`,
      [id]
    );
    
    if (grupos.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    
    // Verificar que la convocatoria existe
    const [convocatorias] = await pool.execute(
      `SELECT IDCONVOCATORIA FROM convocatorias WHERE IDCONVOCATORIA = ?`,
      [convocatoriaId]
    );
    
    if (convocatorias.length === 0) {
      return res.status(404).json({ error: 'Convocatoria no encontrada' });
    }
    
    // Verificar si ya está asignada
    const [existentes] = await pool.execute(
      `SELECT ID FROM grupos_comite_convocatorias 
       WHERE IDGRUPO = ? AND IDCONVOCATORIA = ?`,
      [id, convocatoriaId]
    );
    
    if (existentes.length > 0) {
      return res.status(409).json({ error: 'La convocatoria ya está asignada a este grupo' });
    }
    
    // Verificar el estado actual de la convocatoria
    const [convocatoriaActual] = await pool.execute(
      `SELECT estado FROM convocatorias WHERE IDCONVOCATORIA = ?`,
      [convocatoriaId]
    );
    
    const estadoActual = convocatoriaActual[0]?.estado || 'No Publicada';
    
    // Verificar que la convocatoria esté activa/publicada para poder asignarla
    const estadosPermitidos = ['Activo', 'activo', 'Publicada', 'publicada'];
    if (!estadosPermitidos.includes(estadoActual)) {
      return res.status(400).json({ 
        error: 'Solo se pueden asignar convocatorias que estén activas o publicadas' 
      });
    }
    
    // Asignar convocatoria al grupo
    await pool.execute(
      `INSERT INTO grupos_comite_convocatorias (IDGRUPO, IDCONVOCATORIA) 
       VALUES (?, ?)`,
      [id, convocatoriaId]
    );
    
    // Cambiar el estado de la convocatoria a "Inactivo" para que no aparezca como activa para postulantes
    // Esto es necesario para que solo esté disponible para el grupo de comité
    await pool.execute(
      `UPDATE convocatorias SET estado = 'Inactivo' WHERE IDCONVOCATORIA = ?`,
      [convocatoriaId]
    );
    console.log(`✅ Convocatoria ${convocatoriaId} asignada al grupo ${id} y estado cambiado a "Inactivo"`);
    
    // Obtener la convocatoria asignada (con el nuevo estado)
    const [convocatoria] = await pool.execute(
      `SELECT c.IDCONVOCATORIA, c.numeroCAS, c.puesto, c.area, 
              c.estado, gcc.fechaAsignacion
       FROM convocatorias c
       INNER JOIN grupos_comite_convocatorias gcc ON c.IDCONVOCATORIA = gcc.IDCONVOCATORIA
       WHERE c.IDCONVOCATORIA = ? AND gcc.IDGRUPO = ?`,
      [convocatoriaId, id]
    );
    
    if (convocatoria.length === 0) {
      return res.status(500).json({ error: 'Error al obtener la convocatoria asignada' });
    }
    
    res.status(201).json({
      ...convocatoria[0],
      numeroCAS: convocatoria[0].numeroCAS ? String(convocatoria[0].numeroCAS) : '',
      puesto: convocatoria[0].puesto ? String(convocatoria[0].puesto) : '',
      area: convocatoria[0].area ? String(convocatoria[0].area) : '',
      estado: convocatoria[0].estado ? String(convocatoria[0].estado) : ''
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'La convocatoria ya está asignada a este grupo' });
    }
    console.error('Error al asignar convocatoria al grupo:', error);
    res.status(500).json({ error: 'Error al asignar convocatoria al grupo', message: error.message });
  }
}

// Remover convocatoria de un grupo
export async function removerConvocatoriaDeGrupo(req, res) {
  try {
    // Verificar que el usuario sea Admin o RRHH
    if (!verificarRolAdminORRHH(req, res)) return;
    
    await initializeTables();
    
    const { id, convocatoriaId } = req.params;
    
    const [result] = await pool.execute(
      `DELETE FROM grupos_comite_convocatorias 
       WHERE IDGRUPO = ? AND IDCONVOCATORIA = ?`,
      [id, convocatoriaId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Convocatoria no encontrada en el grupo' });
    }
    
    // Verificar si la convocatoria todavía está asignada a algún otro grupo
    const [otrosGrupos] = await pool.execute(
      `SELECT COUNT(*) as count FROM grupos_comite_convocatorias 
       WHERE IDCONVOCATORIA = ?`,
      [convocatoriaId]
    );
    
    // Si la convocatoria no está en ningún otro grupo, restaurar su estado a "Publicada"
    if (otrosGrupos[0].count === 0) {
      // Verificar el estado actual antes de restaurar
      const [convocatoriaActual] = await pool.execute(
        `SELECT estado FROM convocatorias WHERE IDCONVOCATORIA = ?`,
        [convocatoriaId]
      );
      
      // Si el estado actual es "Inactivo" (probablemente porque estaba asignada), restaurarlo a "Publicada"
      if (convocatoriaActual[0]?.estado === 'Inactivo') {
        await pool.execute(
          `UPDATE convocatorias SET estado = 'Publicada' WHERE IDCONVOCATORIA = ?`,
          [convocatoriaId]
        );
        console.log(`✅ Estado de convocatoria ${convocatoriaId} restaurado a "Publicada" al removerla de todos los grupos`);
      }
    }
    
    res.json({ message: 'Convocatoria removida del grupo exitosamente' });
  } catch (error) {
    console.error('Error al remover convocatoria del grupo:', error);
    res.status(500).json({ error: 'Error al remover convocatoria del grupo', message: error.message });
  }
}



// ============================================================
// 🎯 FUNCIONES PARA INTEGRANTES POR CONVOCATORIA
// ============================================================

// Asegurar que la tabla convocatoria_integrantes existe
async function ensureConvocatoriaIntegrantesTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS convocatoria_integrantes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        IDCONVOCATORIA INT NOT NULL,
        IDUSUARIO INT NOT NULL,
        IDGRUPO INT NOT NULL,
        fechaAsignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT TRUE,
        INDEX idx_convocatoria (IDCONVOCATORIA),
        INDEX idx_usuario (IDUSUARIO),
        INDEX idx_grupo (IDGRUPO),
        INDEX idx_activo (activo),
        UNIQUE KEY uniq_convocatoria_usuario (IDCONVOCATORIA, IDUSUARIO)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla convocatoria_integrantes verificada/creada');
  } catch (error) {
    console.error('❌ Error al crear tabla convocatoria_integrantes:', error);
  }
}

// Obtener integrantes asignados a una convocatoria
export async function obtenerIntegrantesConvocatoria(req, res) {
  try {
    await ensureConvocatoriaIntegrantesTable();
    
    const { convocatoriaId } = req.params;
    
    const [integrantes] = await pool.execute(`
      SELECT 
        ci.id,
        ci.IDCONVOCATORIA,
        ci.IDUSUARIO,
        ci.IDGRUPO,
        ci.fechaAsignacion,
        ci.activo,
        u.nombreCompleto,
        u.correo as email,
        u.documento,
        g.nombre as nombreGrupo
      FROM convocatoria_integrantes ci
      INNER JOIN usuarios u ON ci.IDUSUARIO = u.IDUSUARIO
      INNER JOIN grupos_comite g ON ci.IDGRUPO = g.IDGRUPO
      WHERE ci.IDCONVOCATORIA = ? AND ci.activo = TRUE
      ORDER BY u.nombreCompleto
    `, [convocatoriaId]);
    
    res.json(integrantes);
  } catch (error) {
    console.error('Error al obtener integrantes de convocatoria:', error);
    res.status(500).json({ error: 'Error al obtener integrantes de convocatoria', message: error.message });
  }
}

// Asignar integrante a convocatoria
export async function asignarIntegranteConvocatoria(req, res) {
  try {
    // Verificar que el usuario sea Admin o RRHH
    if (!verificarRolAdminORRHH(req, res)) return;
    
    await ensureConvocatoriaIntegrantesTable();
    
    const { convocatoriaId } = req.params;
    const { userId, grupoId } = req.body;
    
    console.log('📝 Asignando integrante a convocatoria:', {
      convocatoriaId,
      userId,
      grupoId,
      body: req.body
    });
    
    if (!userId || !grupoId) {
      console.error('❌ Faltan parámetros requeridos:', { userId, grupoId });
      return res.status(400).json({ 
        error: 'userId y grupoId son requeridos',
        recibido: { userId, grupoId, body: req.body }
      });
    }
    
    // Verificar que el usuario pertenece al grupo
    const [usuarioEnGrupo] = await pool.execute(`
      SELECT * FROM grupos_comite_usuarios
      WHERE IDGRUPO = ? AND IDUSUARIO = ?
    `, [grupoId, userId]);
    
    // Si el usuario no está en el grupo, asignarlo automáticamente
    if (usuarioEnGrupo.length === 0) {
      console.log('⚠️ Usuario no está en el grupo, asignando automáticamente...');
      try {
        await pool.execute(`
          INSERT INTO grupos_comite_usuarios (IDGRUPO, IDUSUARIO, fechaAsignacion)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE IDGRUPO = IDGRUPO
        `, [grupoId, userId]);
        console.log('✅ Usuario asignado automáticamente al grupo');
      } catch (error) {
        console.error('❌ Error al asignar usuario al grupo:', error);
        return res.status(400).json({ 
          error: 'No se pudo asignar el usuario al grupo',
          details: error.message 
        });
      }
    }
    
    // Verificar que la convocatoria está asignada al grupo
    const [convocatoriaEnGrupo] = await pool.execute(`
      SELECT * FROM grupos_comite_convocatorias
      WHERE IDGRUPO = ? AND IDCONVOCATORIA = ?
    `, [grupoId, convocatoriaId]);
    
    // Si la convocatoria no está asignada al grupo, asignarla automáticamente
    if (convocatoriaEnGrupo.length === 0) {
      console.log('⚠️ Convocatoria no asignada al grupo, asignando automáticamente...');
      try {
        await pool.execute(`
          INSERT INTO grupos_comite_convocatorias (IDGRUPO, IDCONVOCATORIA)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE IDGRUPO = IDGRUPO
        `, [grupoId, convocatoriaId]);
        console.log('✅ Convocatoria asignada automáticamente al grupo');
      } catch (error) {
        console.error('❌ Error al asignar convocatoria al grupo:', error);
        return res.status(400).json({ 
          error: 'No se pudo asignar la convocatoria al grupo',
          details: error.message 
        });
      }
    }
    
    // Insertar o actualizar
    await pool.execute(`
      INSERT INTO convocatoria_integrantes (IDCONVOCATORIA, IDUSUARIO, IDGRUPO, activo)
      VALUES (?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE activo = TRUE, fechaAsignacion = CURRENT_TIMESTAMP
    `, [convocatoriaId, userId, grupoId]);
    
    // Obtener el integrante asignado con información del grupo
    const [integrante] = await pool.execute(`
      SELECT 
        ci.*,
        u.nombreCompleto,
        u.correo as email,
        u.documento,
        g.nombre as nombreGrupo
      FROM convocatoria_integrantes ci
      INNER JOIN usuarios u ON ci.IDUSUARIO = u.IDUSUARIO
      INNER JOIN grupos_comite g ON ci.IDGRUPO = g.IDGRUPO
      WHERE ci.IDCONVOCATORIA = ? AND ci.IDUSUARIO = ?
    `, [convocatoriaId, userId]);
    
    res.status(201).json(integrante[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El integrante ya está asignado a esta convocatoria' });
    }
    console.error('Error al asignar integrante a convocatoria:', error);
    res.status(500).json({ error: 'Error al asignar integrante a convocatoria', message: error.message });
  }
}

// Remover integrante de convocatoria
export async function removerIntegranteConvocatoria(req, res) {
  try {
    // Verificar que el usuario sea Admin o RRHH
    if (!verificarRolAdminORRHH(req, res)) return;
    
    await ensureConvocatoriaIntegrantesTable();
    
    const { convocatoriaId, userId } = req.params;
    
    const [result] = await pool.execute(`
      UPDATE convocatoria_integrantes
      SET activo = FALSE
      WHERE IDCONVOCATORIA = ? AND IDUSUARIO = ?
    `, [convocatoriaId, userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Integrante no encontrado en esta convocatoria' });
    }
    
    res.json({ message: 'Integrante removido de la convocatoria exitosamente' });
  } catch (error) {
    console.error('Error al remover integrante de convocatoria:', error);
    res.status(500).json({ error: 'Error al remover integrante de convocatoria', message: error.message });
  }
}

// Obtener convocatorias de un integrante
export async function obtenerConvocatoriasIntegrante(req, res) {
  try {
    await ensureConvocatoriaIntegrantesTable();
    
    const { userId } = req.params;
    
    const [convocatorias] = await pool.execute(`
      SELECT 
        ci.*,
        c.numeroCAS,
        c.puesto,
        c.area,
        c.estado,
        g.nombre as nombreGrupo
      FROM convocatoria_integrantes ci
      INNER JOIN convocatorias c ON ci.IDCONVOCATORIA = c.IDCONVOCATORIA
      INNER JOIN grupos_comite g ON ci.IDGRUPO = g.IDGRUPO
      WHERE ci.IDUSUARIO = ? AND ci.activo = TRUE
      ORDER BY c.numeroCAS
    `, [userId]);
    
    res.json(convocatorias);
  } catch (error) {
    console.error('Error al obtener convocatorias del integrante:', error);
    res.status(500).json({ error: 'Error al obtener convocatorias del integrante', message: error.message });
  }
}
