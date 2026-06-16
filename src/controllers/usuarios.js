import { pool } from '../database/conexion.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transporter } from '../mailer.js';

// Obtener __dirname en módulos ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

// ============================================================
// 🔧 FUNCIONES DEL CONTROLADOR DE USUARIOS
// ============================================================

// Función para verificar y crear la tabla USUARIOS si no existe
async function ensureUsuariosTable() {
  try {
    // Verificar si la tabla existe
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'`
    );
    
    if (tables.length === 0) {
      // Crear la tabla con las columnas requeridas
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS usuarios (
          IDUSUARIO INT AUTO_INCREMENT PRIMARY KEY,
          nombreCompleto VARCHAR(255) NOT NULL,
          apellidoPaterno VARCHAR(100) NOT NULL,
          apellidoMaterno VARCHAR(100) NOT NULL,
          correo VARCHAR(255) NOT NULL,
          tipoDocumento VARCHAR(50) NOT NULL,
          documento VARCHAR(50) NOT NULL UNIQUE,
          contrasena VARCHAR(255) NOT NULL,
          telefono VARCHAR(20) NOT NULL,
          rol ENUM('tramite', 'recursos humanos', 'comite', 'postulante', 'administrador') DEFAULT 'postulante',
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_documento (documento),
          INDEX idx_correo (correo),
          INDEX idx_nombreCompleto (nombreCompleto),
          INDEX idx_rol (rol)
        )
      `);
      console.log('✅ Tabla usuarios creada exitosamente');
    } else {
      // Si la tabla existe, verificar si tiene la columna rol y agregarla si no existe
      try {
        const [columns] = await pool.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'usuarios' 
           AND COLUMN_NAME = 'rol'`
        );
        
        if (columns.length === 0) {
          await pool.execute(`
            ALTER TABLE usuarios 
            ADD COLUMN rol ENUM('tramite', 'recursos humanos', 'comite', 'postulante', 'administrador') DEFAULT 'postulante' AFTER telefono,
            ADD INDEX idx_rol (rol)
          `);
          console.log('✅ Columna rol agregada a la tabla usuarios');
        }
        
        // Verificar y agregar columna profilePicture si no existe
        try {
          const [profilePicColumns] = await pool.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'usuarios' 
             AND COLUMN_NAME = 'profilePicture'`
          );
          
          if (profilePicColumns.length === 0) {
            await pool.execute(`
              ALTER TABLE usuarios 
              ADD COLUMN profilePicture VARCHAR(500) NULL AFTER telefono
            `);
            console.log('✅ Columna profilePicture agregada a la tabla usuarios');
          }
        } catch (error) {
          console.error('⚠️ Error al verificar/agregar columna profilePicture:', error.message);
        }
        
        // Verificar y agregar columnas faltantes si es necesario
        const [allColumns] = await pool.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'usuarios'`
        );
        const columnNames = allColumns.map(col => col.COLUMN_NAME);
        
        if (!columnNames.includes('apellidoPaterno')) {
          await pool.execute(`ALTER TABLE usuarios ADD COLUMN apellidoPaterno VARCHAR(100) NOT NULL DEFAULT '' AFTER nombreCompleto`);
        }
        if (!columnNames.includes('apellidoMaterno')) {
          await pool.execute(`ALTER TABLE usuarios ADD COLUMN apellidoMaterno VARCHAR(100) NOT NULL DEFAULT '' AFTER apellidoPaterno`);
        }
        if (!columnNames.includes('correo')) {
          await pool.execute(`ALTER TABLE usuarios ADD COLUMN correo VARCHAR(255) NOT NULL DEFAULT '' AFTER apellidoMaterno`);
          await pool.execute(`ALTER TABLE usuarios ADD INDEX idx_correo (correo)`);
        }
        // Migrar de dni a tipoDocumento y documento
        if (columnNames.includes('dni') && !columnNames.includes('documento')) {
          // Renombrar dni a documento y agregar tipoDocumento
          await pool.execute(`ALTER TABLE usuarios ADD COLUMN tipoDocumento VARCHAR(50) NOT NULL DEFAULT 'dni' AFTER correo`);
          await pool.execute(`ALTER TABLE usuarios ADD COLUMN documento VARCHAR(50) NOT NULL DEFAULT '' AFTER tipoDocumento`);
          // Copiar valores de dni a documento
          await pool.execute(`UPDATE usuarios SET documento = dni, tipoDocumento = 'dni' WHERE documento = ''`);
          // Eliminar la columna dni
          await pool.execute(`ALTER TABLE usuarios DROP INDEX idx_dni`);
          await pool.execute(`ALTER TABLE usuarios DROP COLUMN dni`);
          await pool.execute(`ALTER TABLE usuarios ADD UNIQUE INDEX idx_documento (documento)`);
        } else if (!columnNames.includes('tipoDocumento')) {
          await pool.execute(`ALTER TABLE usuarios ADD COLUMN tipoDocumento VARCHAR(50) NOT NULL DEFAULT 'dni' AFTER correo`);
        } else if (!columnNames.includes('documento')) {
          await pool.execute(`ALTER TABLE usuarios ADD COLUMN documento VARCHAR(50) NOT NULL DEFAULT '' AFTER tipoDocumento`);
          await pool.execute(`ALTER TABLE usuarios ADD UNIQUE INDEX idx_documento (documento)`);
        }
        // Asegurar que telefono sea NOT NULL si no lo es
        const [telefonoColumn] = await pool.execute(
          `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'usuarios' 
           AND COLUMN_NAME = 'telefono'`
        );
        if (telefonoColumn.length > 0 && telefonoColumn[0].IS_NULLABLE === 'YES') {
          await pool.execute(`ALTER TABLE usuarios MODIFY COLUMN telefono VARCHAR(20) NOT NULL`);
        }
      } catch (alterError) {
        console.error('⚠️ Error al agregar columnas a usuarios:', alterError.message);
      }
    }
    } catch (error) {
    console.error('❌ Error al verificar/crear tabla usuarios:', error.message);
  }
}

// Registrar nuevo usuario (por defecto será postulante)
const registrarUsuario = async (req, res) => {
  try {
    // Asegurar que la tabla existe
    await ensureUsuariosTable();
    
    const { 
      nombreCompleto, 
      apellidoPaterno, 
      apellidoMaterno, 
      correo,
      tipoDocumento,
      dni, // Mantener compatibilidad con el frontend que envía 'dni'
      numeroDocumento, // También aceptar 'numeroDocumento'
      contrasena, 
      telefono,
      rol // Opcional, si no se proporciona será 'postulante'
    } = req.body;

    // Obtener el número de documento (puede venir como 'dni', 'numeroDocumento' o 'documento')
    const documentoNumero = dni || numeroDocumento || req.body.documento;
    
    // Validar campos requeridos básicos
    if (!nombreCompleto || !correo || !contrasena) {
      return res.status(400).json({ 
        error: 'Los campos requeridos son: nombreCompleto, correo, contrasena' 
      });
    }

    // Validar formato de correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return res.status(400).json({ 
        error: 'El formato del correo electrónico no es válido' 
      });
    }

    // Validar rol si se proporciona
    const rolesPermitidos = ['tramite', 'recursos humanos', 'comite', 'postulante', 'administrador'];
    const rolUsuario = rol && rolesPermitidos.includes(rol.toLowerCase()) ? rol.toLowerCase() : 'postulante';

    // Validar que tipo de documento y número de documento sean proporcionados (obligatorio para todos los roles)
    if (!tipoDocumento || !documentoNumero) {
      return res.status(400).json({ 
        error: 'Tipo de documento y número de documento son requeridos.' 
      });
    }

    // Validar tipo de documento
    const tiposDocumentoPermitidos = ['dni', 'pasaporte', 'carnet_extranjeria'];
    const tipoDocNormalizado = tipoDocumento.toLowerCase();
    if (!tiposDocumentoPermitidos.includes(tipoDocNormalizado)) {
      return res.status(400).json({ 
        error: 'Tipo de documento no válido. Debe ser: dni, pasaporte o carnet_extranjeria' 
      });
    }

    const documentoNumeroFinal = documentoNumero.trim();
    
    // Validar que el número de documento no esté vacío después de trim
    if (!documentoNumeroFinal || documentoNumeroFinal === '') {
      return res.status(400).json({ 
        error: 'El número de documento no puede estar vacío.' 
      });
    }

    // Verificar si el correo ya existe
    const [existingEmail] = await pool.execute(
      'SELECT IDUSUARIO FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico.' });
    }

    // Verificar si el documento ya existe solo si se proporcionó
    if (documentoNumeroFinal) {
      const [existingUser] = await pool.execute(
        'SELECT IDUSUARIO FROM usuarios WHERE documento = ?',
        [documentoNumeroFinal]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Ya existe un usuario con este número de documento.' });
      }
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Insertar nuevo usuario (documento y tipoDocumento son obligatorios)
    const [result] = await pool.execute(
      `INSERT INTO usuarios (nombreCompleto, apellidoPaterno, apellidoMaterno, correo, tipoDocumento, documento, contrasena, telefono, rol) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombreCompleto, apellidoPaterno, apellidoMaterno, correo, tipoDocNormalizado, documentoNumeroFinal, hashedPassword, telefono, rolUsuario]
    );

    console.log('✅ Usuario registrado exitosamente:', documentoNumeroFinal || 'Sin documento', 'Tipo:', tipoDocNormalizado || 'Sin tipo', 'Rol:', rolUsuario);
    res.status(201).json({ 
      message: 'Usuario registrado exitosamente',
      usuarioId: result.insertId,
      rol: rolUsuario
    });
    } catch (error) {
    console.error('❌ Error al registrar usuario:', error);
    res.status(500).json({ 
      error: 'Error al registrar usuario',
      details: error.message 
    });
  }
};

// Login de usuario (con correo electrónico y contraseña)
const loginUsuario = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { correo, contrasena } = req.body;
    
    // Validar que se proporcionen correo y contraseña
    if (!correo || !contrasena) {
      return res.status(400).json({ message: 'Correo electrónico y contraseña son requeridos.' });
    }

    // Validar formato de correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return res.status(400).json({ 
        message: 'El formato del correo electrónico no es válido.' 
      });
    }

    // Buscar usuario por correo electrónico
        const [resultado] = await pool.execute(
      'SELECT IDUSUARIO, nombreCompleto, apellidoPaterno, apellidoMaterno, correo, tipoDocumento, documento, contrasena, rol, estado, profilePicture FROM usuarios WHERE correo = ?',
      [correo]
    );
    
    const usuario = resultado[0];

    if (!usuario) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }
    
    // Verificar si el usuario está activo
    if (usuario.estado && usuario.estado !== 'ACTIVO') {
      return res.status(403).json({ 
        message: 'Tu cuenta está desactivada. Contacta al administrador para reactivar tu acceso al sistema.' 
      });
    }
    
    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
    
    if (!contrasenaValida) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    // Si el usuario es del comité, obtener las convocatorias de su grupo
    let convocatoriasAsignadas = [];
    let grupoId = null;
    let grupoNombre = null;
    if (usuario.rol === 'comite') {
      try {
        // Buscar el grupo al que pertenece el usuario
        const [grupoUsuario] = await pool.execute(`
          SELECT gcu.IDGRUPO, gc.nombre as grupoNombre
          FROM grupos_comite_usuarios gcu
          INNER JOIN grupos_comite gc ON gcu.IDGRUPO = gc.IDGRUPO
          WHERE gcu.IDUSUARIO = ?
          LIMIT 1
        `, [usuario.IDUSUARIO]);
        
        if (grupoUsuario && grupoUsuario.length > 0) {
          grupoId = grupoUsuario[0].IDGRUPO;
          grupoNombre = grupoUsuario[0].grupoNombre ? String(grupoUsuario[0].grupoNombre) : null;
          
          // Obtener las convocatorias asignadas al grupo
          const [convocatorias] = await pool.execute(`
            SELECT c.IDCONVOCATORIA, c.area, c.puesto, c.numeroCAS, c.fechaInicio, c.fechaFin, c.estado
            FROM grupos_comite_convocatorias gcc
            INNER JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
            WHERE gcc.IDGRUPO = ?
            ORDER BY gcc.fechaAsignacion DESC
          `, [grupoId]);
          
          convocatoriasAsignadas = convocatorias || [];
          console.log(`✅ Usuario del comité pertenece al grupo "${grupoNombre}" (ID: ${grupoId}) con ${convocatoriasAsignadas.length} convocatoria(s) asignada(s)`);
        } else {
          console.log(`⚠️ Usuario del comité ${usuario.IDUSUARIO} no está asignado a ningún grupo`);
        }
      } catch (error) {
        // Si hay error (puede ser que las tablas no existan aún), continuar sin las convocatorias
        console.error('⚠️ Error al obtener convocatorias del grupo del comité en login:', error.message);
        // Continuar sin las convocatorias si hay error
      }
    }

    // Construir URL de la foto de perfil si existe
    let profilePictureUrl = null;
    if (usuario.profilePicture) {
      profilePictureUrl = `${req.protocol}://${req.get('host')}/uploads/profiles/${usuario.profilePicture}`;
    }
    
    const payload = { 
      id: usuario.IDUSUARIO, 
            nombreCompleto: usuario.nombreCompleto,
      apellidoPaterno: usuario.apellidoPaterno,
      apellidoMaterno: usuario.apellidoMaterno,
            correo: usuario.correo,
      tipoDocumento: usuario.tipoDocumento || 'dni',
      documento: usuario.documento,
      dni: usuario.documento, // Mantener 'dni' en el payload para compatibilidad con el frontend
      rol: usuario.rol || 'postulante',
      profilePicture: profilePictureUrl,
      convocatoriasAsignadas: usuario.rol === 'comite' ? convocatoriasAsignadas : undefined,
      grupoId: usuario.rol === 'comite' ? grupoId : undefined,
      grupoNombre: usuario.rol === 'comite' ? grupoNombre : undefined
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    console.log('✅ Login exitoso:', correo, 'Rol:', usuario.rol || 'postulante', usuario.rol === 'comite' ? `Convocatorias: ${convocatoriasAsignadas.length}` : '');
        res.status(200).json({
      message: 'Inicio de sesión exitoso', 
      token, 
      user: payload 
    });
    } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

// ============================================================
// 🔧 FUNCIONES DE GESTIÓN DE USUARIOS (CRUD)
// ============================================================

// Obtener todos los usuarios (con filtro opcional por roles)
const obtenerUsuarios = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { roles } = req.query; // Ejemplo: ?roles=rr.hh,comite,tramite
    
    let query = `
      SELECT 
        IDUSUARIO,
        nombreCompleto,
        apellidoPaterno,
        apellidoMaterno,
        correo,
        tipoDocumento,
        documento,
        telefono,
        rol,
        fechaCreacion,
        estado
      FROM usuarios
    `;
    
    const params = [];
    
    // Si hay filtro de roles, agregarlo a la consulta
    if (roles) {
      const rolesArray = roles.split(',').map(r => r.trim().toLowerCase());
      const placeholders = rolesArray.map(() => '?').join(',');
      query += ` WHERE LOWER(rol) IN (${placeholders})`;
      params.push(...rolesArray);
    }
    
    query += ' ORDER BY fechaCreacion DESC';
    
    const [usuarios] = await pool.execute(query, params);
    
    res.status(200).json(usuarios);
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    res.status(500).json({ 
      error: 'Error al obtener usuarios',
      details: error.message 
    });
  }
};

// Obtener un usuario por ID
const obtenerUsuarioPorId = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { id } = req.params;
    
    const [usuarios] = await pool.execute(
      `SELECT 
        IDUSUARIO,
        nombreCompleto,
        apellidoPaterno,
        apellidoMaterno,
        correo,
        tipoDocumento,
        documento,
        telefono,
        rol,
        fechaCreacion,
        estado
      FROM usuarios 
      WHERE IDUSUARIO = ?`,
      [id]
    );
    
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Deshabilitar caché para asegurar datos frescos
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.status(200).json(usuarios[0]);
  } catch (error) {
    console.error('❌ Error al obtener usuario:', error);
    res.status(500).json({ 
      error: 'Error al obtener usuario',
      details: error.message 
    });
  }
};

// Crear usuario (para administradores)
const crearUsuario = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { 
      nombreCompleto, 
      apellidoPaterno, 
      apellidoMaterno, 
      correo,
      tipoDocumento,
      documento,
      dni,
      numeroDocumento,
      contrasena, 
      telefono,
      rol,
      estado
    } = req.body;

    // Obtener el número de documento
    const documentoNumero = documento || dni || numeroDocumento;
    
    // Validar campos requeridos
    if (!nombreCompleto || !correo || !contrasena) {
      return res.status(400).json({ 
        error: 'Los campos nombreCompleto, correo y contrasena son requeridos' 
      });
    }

    // Validar formato de correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return res.status(400).json({ 
        error: 'El formato del correo electrónico no es válido' 
      });
    }

    // Verificar si el correo ya existe
    const [existingEmail] = await pool.execute(
      'SELECT IDUSUARIO FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico.' });
    }

    // Validar rol si se proporciona
    const rolesPermitidos = ['tramite', 'recursos humanos', 'comite', 'postulante', 'administrador'];
    const rolUsuario = rol && rolesPermitidos.includes(rol.toLowerCase()) ? rol.toLowerCase() : 'postulante';
    
    // Si se proporciona documento, validarlo
    if (documentoNumero) {
      // Validar tipo de documento si se proporciona
      if (tipoDocumento) {
        const tiposDocumentoPermitidos = ['dni', 'pasaporte', 'carnet_extranjeria'];
        const tipoDocNormalizado = tipoDocumento.toLowerCase();
        if (!tiposDocumentoPermitidos.includes(tipoDocNormalizado)) {
          return res.status(400).json({ 
            error: 'Tipo de documento no válido. Debe ser: dni, pasaporte o carnet_extranjeria' 
          });
        }
      }

      // Verificar si el documento ya existe
      const [existingUser] = await pool.execute(
        'SELECT IDUSUARIO FROM usuarios WHERE documento = ?',
        [documentoNumero]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Ya existe un usuario con este número de documento.' });
      }
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Valores por defecto
    const apellidoP = apellidoPaterno || '';
    const apellidoM = apellidoMaterno || '';
    const tipoDoc = tipoDocumento || 'dni';
    const docNum = documentoNumero || '';
    const tel = telefono || '';
    const estadoFinal = estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';

    // Insertar nuevo usuario
    const [result] = await pool.execute(
      `INSERT INTO usuarios (nombreCompleto, apellidoPaterno, apellidoMaterno, correo, tipoDocumento, documento, contrasena, telefono, rol, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombreCompleto, apellidoP, apellidoM, correo, tipoDoc, docNum, hashedPassword, tel, rolUsuario, estadoFinal]
    );

    console.log('✅ Usuario creado exitosamente:', result.insertId, 'Rol:', rolUsuario);
    res.status(201).json({ 
      message: 'Usuario creado exitosamente',
      usuarioId: result.insertId,
      rol: rolUsuario
    });
  } catch (error) {
    console.error('❌ Error al crear usuario:', error);
    res.status(500).json({ 
      error: 'Error al crear usuario',
      details: error.message 
    });
  }
};

// Actualizar usuario
const actualizarUsuario = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { id } = req.params;
    const { 
      nombreCompleto, 
      apellidoPaterno, 
      apellidoMaterno, 
      correo,
      tipoDocumento,
      documento,
      telefono,
      rol,
      estado
    } = req.body;

    // Verificar que el usuario existe y obtener su rol actual
    const [usuarios] = await pool.execute(
      'SELECT IDUSUARIO, correo, documento, rol FROM usuarios WHERE IDUSUARIO = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioActual = usuarios[0];
    const rolAnterior = usuarioActual.rol ? usuarioActual.rol.toLowerCase() : '';

    // Si se está actualizando el correo, verificar que no exista en otro usuario
    if (correo && correo !== usuarioActual.correo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        return res.status(400).json({ 
          error: 'El formato del correo electrónico no es válido' 
        });
      }

      const [existingEmail] = await pool.execute(
        'SELECT IDUSUARIO FROM usuarios WHERE correo = ? AND IDUSUARIO != ?',
        [correo, id]
      );

      if (existingEmail.length > 0) {
        return res.status(400).json({ error: 'Ya existe otro usuario con este correo electrónico.' });
      }
    }

    // Si se está actualizando el documento, verificar que no exista en otro usuario
    // Solo verificar si el documento no está vacío y es diferente al actual
    const documentoTrimmed = documento && typeof documento === 'string' ? documento.trim() : documento;
    if (documentoTrimmed && documentoTrimmed !== '' && documentoTrimmed !== usuarioActual.documento) {
      const [existingDoc] = await pool.execute(
        'SELECT IDUSUARIO FROM usuarios WHERE documento = ? AND IDUSUARIO != ?',
        [documentoTrimmed, id]
      );

      if (existingDoc.length > 0) {
        return res.status(400).json({ error: 'Ya existe otro usuario con este número de documento.' });
      }
    }

    // Construir la consulta de actualización dinámicamente
    const campos = [];
    const valores = [];

    if (nombreCompleto !== undefined) {
      campos.push('nombreCompleto = ?');
      valores.push(nombreCompleto);
    }
    if (apellidoPaterno !== undefined) {
      campos.push('apellidoPaterno = ?');
      valores.push(apellidoPaterno);
    }
    if (apellidoMaterno !== undefined) {
      campos.push('apellidoMaterno = ?');
      valores.push(apellidoMaterno);
    }
    if (correo !== undefined) {
      campos.push('correo = ?');
      valores.push(correo);
    }
    // Validar que tipoDocumento y documento siempre se proporcionen (obligatorios para todos los roles)
    if (tipoDocumento === undefined || documento === undefined) {
      return res.status(400).json({ 
        error: 'Tipo de documento y número de documento son requeridos para actualizar el usuario.' 
      });
    }
    
    // Validar tipo de documento
    const tiposDocumentoPermitidos = ['dni', 'pasaporte', 'carnet_extranjeria'];
    if (!tipoDocumento || typeof tipoDocumento !== 'string' || tipoDocumento.trim() === '') {
      return res.status(400).json({ 
        error: 'Tipo de documento es requerido y no puede estar vacío.' 
      });
    }
    
    const tipoDocValue = tipoDocumento.trim().toLowerCase();
    if (!tiposDocumentoPermitidos.includes(tipoDocValue)) {
      return res.status(400).json({ 
        error: 'Tipo de documento no válido. Debe ser: dni, pasaporte o carnet_extranjeria' 
      });
    }
    
    // Validar que el documento no esté vacío
    if (!documento || typeof documento !== 'string' || documento.trim() === '') {
      return res.status(400).json({ 
        error: 'Número de documento es requerido y no puede estar vacío.' 
      });
    }
    
    const docValue = documento.trim();
    
    // Agregar tipoDocumento y documento a los campos a actualizar (siempre obligatorios)
    campos.push('tipoDocumento = ?');
    valores.push(tipoDocValue);
    campos.push('documento = ?');
    valores.push(docValue);
    if (telefono !== undefined) {
      campos.push('telefono = ?');
      valores.push(telefono);
    }
    if (rol !== undefined) {
      const rolesPermitidos = ['tramite', 'recursos humanos', 'comite', 'postulante', 'administrador'];
      if (rolesPermitidos.includes(rol.toLowerCase())) {
        campos.push('rol = ?');
        valores.push(rol.toLowerCase());
      }
    }
    if (estado !== undefined) {
      campos.push('estado = ?');
      valores.push(estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO');
    }

    if (campos.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    valores.push(id);

    // Verificar si el rol está cambiando de "comite" a otro
    let rolNuevo = null;
    if (rol !== undefined) {
      const rolesPermitidos = ['tramite', 'recursos humanos', 'comite', 'postulante', 'administrador'];
      if (rolesPermitidos.includes(rol.toLowerCase())) {
        rolNuevo = rol.toLowerCase();
      }
    }

    // Actualizar el usuario primero
    console.log('📝 Actualizando usuario ID:', id);
    console.log('📝 Campos a actualizar:', campos);
    console.log('📝 Valores:', valores.slice(0, -1).map((v, i) => `${campos[i]} = ${v === null ? 'NULL' : (typeof v === 'string' ? `'${v}'` : v)}`));
    
    await pool.execute(
      `UPDATE usuarios SET ${campos.join(', ')} WHERE IDUSUARIO = ?`,
      valores
    );
    
    console.log('✅ UPDATE ejecutado correctamente');

    // Si el usuario cambió de rol "comite" a otro, removerlo de todos los grupos DESPUÉS de actualizar
    if (rolAnterior === 'comite' && rolNuevo && rolNuevo !== 'comite') {
      try {
        // Verificar que la tabla existe antes de intentar eliminar
        const [tables] = await pool.execute(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grupos_comite_usuarios'`
        );
        
        if (tables.length > 0) {
          // Remover el usuario de todos los grupos de comité
          await pool.execute(
            'DELETE FROM grupos_comite_usuarios WHERE IDUSUARIO = ?',
            [id]
          );
          console.log(`✅ Usuario ${id} removido de todos los grupos de comité por cambio de rol (${rolAnterior} -> ${rolNuevo})`);
        }
      } catch (error) {
        console.error('⚠️ Error al remover usuario de los grupos de comité:', error);
        // Continuar aunque falle la remoción (ya se actualizó el usuario)
      }
    }

    // Obtener el usuario actualizado para devolverlo en la respuesta
    const [usuariosActualizados] = await pool.execute(
      'SELECT IDUSUARIO, nombreCompleto, apellidoPaterno, apellidoMaterno, correo, tipoDocumento, documento, telefono, rol, estado FROM usuarios WHERE IDUSUARIO = ?',
      [id]
    );
    
    const usuarioActualizado = usuariosActualizados[0];
    
    console.log('✅ Usuario actualizado exitosamente:', id);
    console.log('📄 Documento después de actualizar:', usuarioActualizado?.documento !== null && usuarioActualizado?.documento !== undefined ? usuarioActualizado.documento : 'NULL');
    console.log('📄 Tipo documento después de actualizar:', usuarioActualizado?.tipoDocumento !== null && usuarioActualizado?.tipoDocumento !== undefined ? usuarioActualizado.tipoDocumento : 'NULL');
    
    res.status(200).json({ 
      message: 'Usuario actualizado exitosamente',
      usuarioId: id,
      rolCambiado: rolAnterior === 'comite' && rolNuevo && rolNuevo !== 'comite' ? true : false,
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error);
    res.status(500).json({ 
      error: 'Error al actualizar usuario',
      details: error.message 
    });
  }
};

// Actualizar contraseña de usuario
const actualizarContrasena = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { id } = req.params;
    const { contrasena } = req.body;

    if (!contrasena) {
      return res.status(400).json({ 
        error: 'La nueva contraseña es requerida' 
      });
    }

    if (contrasena.length < 4) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 4 caracteres' 
      });
    }

    // Verificar que el usuario existe
    const [usuarios] = await pool.execute(
      'SELECT IDUSUARIO FROM usuarios WHERE IDUSUARIO = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    await pool.execute(
      'UPDATE usuarios SET contrasena = ? WHERE IDUSUARIO = ?',
      [hashedPassword, id]
    );

    console.log('✅ Contraseña actualizada exitosamente para usuario:', id);
    res.status(200).json({ 
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al actualizar contraseña:', error);
    res.status(500).json({ 
      error: 'Error al actualizar contraseña',
      details: error.message 
    });
  }
};

// Cambiar contraseña (con validación de contraseña actual)
const cambiarContrasena = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { id } = req.params;
    const { contrasenaActual, nuevaContrasena } = req.body;

    if (!contrasenaActual || !nuevaContrasena) {
      return res.status(400).json({ 
        error: 'La contraseña actual y la nueva contraseña son requeridas' 
      });
    }

    if (nuevaContrasena.length < 4) {
      return res.status(400).json({ 
        error: 'La nueva contraseña debe tener al menos 4 caracteres' 
      });
    }

    // Verificar que el usuario existe
    const [usuarios] = await pool.execute(
      'SELECT IDUSUARIO, contrasena FROM usuarios WHERE IDUSUARIO = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];

    // Verificar contraseña actual
    const contrasenaValida = await bcrypt.compare(contrasenaActual, usuario.contrasena);
    
    if (!contrasenaValida) {
      return res.status(401).json({ 
        error: 'La contraseña actual es incorrecta' 
      });
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

    await pool.execute(
      'UPDATE usuarios SET contrasena = ? WHERE IDUSUARIO = ?',
      [hashedPassword, id]
    );

    console.log('✅ Contraseña cambiada exitosamente para usuario:', id);
    res.status(200).json({ 
      message: 'Contraseña cambiada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al cambiar contraseña:', error);
    res.status(500).json({ 
      error: 'Error al cambiar contraseña',
      details: error.message 
    });
  }
};

// Cambiar estado de usuario (ACTIVO/INACTIVO)
const cambiarEstado = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado || (estado !== 'ACTIVO' && estado !== 'INACTIVO')) {
      return res.status(400).json({ 
        error: 'El estado debe ser ACTIVO o INACTIVO' 
      });
    }

    // Verificar que el usuario existe
    const [usuarios] = await pool.execute(
      'SELECT IDUSUARIO FROM usuarios WHERE IDUSUARIO = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await pool.execute(
      'UPDATE usuarios SET estado = ? WHERE IDUSUARIO = ?',
      [estado, id]
    );

    console.log('✅ Estado actualizado exitosamente para usuario:', id, 'Estado:', estado);
    res.status(200).json({ 
      message: 'Estado actualizado exitosamente',
      estado: estado
    });
  } catch (error) {
    console.error('❌ Error al cambiar estado:', error);
    res.status(500).json({ 
      error: 'Error al cambiar estado',
      details: error.message 
    });
  }
};

// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { id } = req.params;

    // Verificar que el usuario existe
    const [usuarios] = await pool.execute(
      'SELECT IDUSUARIO FROM usuarios WHERE IDUSUARIO = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await pool.execute(
      'DELETE FROM usuarios WHERE IDUSUARIO = ?',
      [id]
    );

    console.log('✅ Usuario eliminado exitosamente:', id);
    res.status(200).json({ 
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error);
    res.status(500).json({ 
      error: 'Error al eliminar usuario',
      details: error.message 
    });
  }
};

// Verificar y agregar columna estado si no existe
async function ensureEstadoColumn() {
  try {
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'usuarios' 
       AND COLUMN_NAME = 'estado'`
    );
    
    if (columns.length === 0) {
      await pool.execute(`ALTER TABLE usuarios ADD COLUMN estado ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO' AFTER rol`);
      console.log('✅ Columna estado agregada a la tabla usuarios');
    }
  } catch (error) {
    console.error('⚠️ Error al verificar columna estado:', error.message);
  }
}

// Función para verificar y crear la tabla comite_convocatorias si no existe
async function ensureComiteConvocatoriasTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comite_convocatorias'`
    );
    
    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS comite_convocatorias (
          ID INT AUTO_INCREMENT PRIMARY KEY,
          IDUSUARIO INT NOT NULL,
          IDCONVOCATORIA INT NOT NULL,
          fechaAsignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (IDUSUARIO) REFERENCES usuarios(IDUSUARIO) ON DELETE CASCADE,
          FOREIGN KEY (IDCONVOCATORIA) REFERENCES convocatorias(IDCONVOCATORIA) ON DELETE CASCADE,
          UNIQUE KEY unique_usuario_convocatoria (IDUSUARIO, IDCONVOCATORIA),
          INDEX idx_usuario (IDUSUARIO),
          INDEX idx_convocatoria (IDCONVOCATORIA)
        )
      `);
      console.log('✅ Tabla comite_convocatorias creada exitosamente');
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla comite_convocatorias:', error.message);
    // Si falla por referencia de clave foránea, intentar crear sin ellas
    try {
      const [tables] = await pool.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comite_convocatorias'`
      );
      if (tables.length === 0) {
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS comite_convocatorias (
            ID INT AUTO_INCREMENT PRIMARY KEY,
            IDUSUARIO INT NOT NULL,
            IDCONVOCATORIA INT NOT NULL,
            fechaAsignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_usuario_convocatoria (IDUSUARIO, IDCONVOCATORIA),
            INDEX idx_usuario (IDUSUARIO),
            INDEX idx_convocatoria (IDCONVOCATORIA)
          )
        `);
        console.log('✅ Tabla comite_convocatorias creada exitosamente (sin foreign keys)');
      }
    } catch (e2) {
      console.error('⚠️ Error al crear tabla comite_convocatorias (intento alternativo):', e2.message);
    }
  }
}

// Obtener convocatorias asignadas a un usuario del comité
const obtenerConvocatoriasComite = async (req, res) => {
  try {
    await ensureComiteConvocatoriasTable();
    
    const { id } = req.params;
    
    // Verificar que el usuario existe
    const [usuarios] = await pool.execute(
      'SELECT IDUSUARIO, rol FROM usuarios WHERE IDUSUARIO = ?',
      [id]
    );
    
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const rolUsuario = (usuarios[0].rol || '').toLowerCase();
    
    // Verificar si el usuario es del comité (rol contiene 'comite')
    const esComite = rolUsuario.includes('comite');
    
    if (!esComite) {
      // Si no es del comité, devolver array vacío en lugar de error
      console.log(`⚠️ Usuario ${id} con rol '${usuarios[0].rol}' no es del comité, devolviendo array vacío`);
      return res.status(200).json([]);
    }
    
    // Obtener convocatorias asignadas
    const [convocatorias] = await pool.execute(`
      SELECT c.*, cc.fechaAsignacion
      FROM comite_convocatorias cc
      INNER JOIN convocatorias c ON cc.IDCONVOCATORIA = c.IDCONVOCATORIA
      WHERE cc.IDUSUARIO = ?
      ORDER BY cc.fechaAsignacion DESC
    `, [id]);
    
    res.status(200).json(convocatorias);
  } catch (error) {
    console.error('❌ Error al obtener convocatorias del comité:', error);
    res.status(500).json({ 
      error: 'Error al obtener convocatorias del comité',
      details: error.message 
    });
  }
};

// Asignar convocatoria a usuario del comité
const asignarConvocatoriaComite = async (req, res) => {
  try {
    await ensureComiteConvocatoriasTable();
    
    const { id } = req.params; // ID del usuario
    const { convocatoriaId } = req.body;
    
    if (!convocatoriaId) {
      return res.status(400).json({ error: 'Se requiere el ID de la convocatoria' });
    }
    
    // Verificar que el usuario existe y es del comité
    const [usuarios] = await pool.execute(
      'SELECT IDUSUARIO, rol FROM usuarios WHERE IDUSUARIO = ?',
      [id]
    );
    
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    if (usuarios[0].rol !== 'comite') {
      return res.status(400).json({ error: 'Este usuario no pertenece al comité' });
    }
    
    // Verificar que la convocatoria existe
    const [convocatorias] = await pool.execute(
      'SELECT IDCONVOCATORIA FROM convocatorias WHERE IDCONVOCATORIA = ?',
      [convocatoriaId]
    );
    
    if (convocatorias.length === 0) {
      return res.status(404).json({ error: 'Convocatoria no encontrada' });
    }
    
    // Verificar si ya está asignada
    const [existentes] = await pool.execute(
      'SELECT ID FROM comite_convocatorias WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?',
      [id, convocatoriaId]
    );
    
    if (existentes.length > 0) {
      return res.status(400).json({ error: 'Esta convocatoria ya está asignada a este usuario' });
    }
    
    // Asignar convocatoria
    await pool.execute(
      'INSERT INTO comite_convocatorias (IDUSUARIO, IDCONVOCATORIA) VALUES (?, ?)',
      [id, convocatoriaId]
    );
    
    console.log(`✅ Convocatoria ${convocatoriaId} asignada a usuario ${id}`);
    res.status(201).json({ 
      message: 'Convocatoria asignada exitosamente',
      usuarioId: id,
      convocatoriaId: convocatoriaId
    });
  } catch (error) {
    console.error('❌ Error al asignar convocatoria:', error);
    res.status(500).json({ 
      error: 'Error al asignar convocatoria',
      details: error.message 
    });
  }
};

// Remover convocatoria asignada a usuario del comité
const removerConvocatoriaComite = async (req, res) => {
  try {
    await ensureComiteConvocatoriasTable();
    
    const { id, convocatoriaId } = req.params; // ID del usuario e ID de la convocatoria
    
    // Verificar que existe la asignación
    const [existentes] = await pool.execute(
      'SELECT ID FROM comite_convocatorias WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?',
      [id, convocatoriaId]
    );
    
    if (existentes.length === 0) {
      return res.status(404).json({ error: 'Esta convocatoria no está asignada a este usuario' });
    }
    
    // Remover asignación
    await pool.execute(
      'DELETE FROM comite_convocatorias WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?',
      [id, convocatoriaId]
    );
    
    console.log(`✅ Convocatoria ${convocatoriaId} removida del usuario ${id}`);
    res.status(200).json({ 
      message: 'Convocatoria removida exitosamente',
      usuarioId: id,
      convocatoriaId: convocatoriaId
    });
  } catch (error) {
    console.error('❌ Error al remover convocatoria:', error);
    res.status(500).json({
      error: 'Error al remover convocatoria',
      details: error.message
    });
  }
};

// ============================================================
// 📊 ESTADÍSTICAS
// ============================================================

// Obtener estadísticas de postulantes
export const obtenerEstadisticas = async (req, res) => {
  try {
    await ensureUsuariosTable();

    // 1. Total de postulantes registrados en el sistema (usuarios con rol 'postulante')
    const [totalPostulantes] = await pool.execute(
      `SELECT COUNT(*) as total FROM usuarios WHERE rol = 'postulante'`
    );
    const totalRegistrados = totalPostulantes[0]?.total || 0;

    // 2. Postulantes registrados hoy (del sistema)
    const [postulantesHoy] = await pool.execute(
      `SELECT COUNT(*) as total FROM usuarios 
       WHERE rol = 'postulante' 
       AND DATE(fechaCreacion) = CURDATE()`
    );
    const registradosHoy = postulantesHoy[0]?.total || 0;

    // 3. Postulantes verificados desde la app (aquellos que tienen anexos subidos)
    // Un postulante verificado es aquel que tiene al menos un anexo
    const [verificadosTotal] = await pool.execute(
      `SELECT COUNT(DISTINCT u.IDUSUARIO) as total 
       FROM usuarios u
       INNER JOIN anexos a ON u.IDUSUARIO = a.IDUSUARIO
       WHERE u.rol = 'postulante'`
    );
    const totalVerificaciones = verificadosTotal[0]?.total || 0;

    // 4. Verificaciones de hoy (anexos subidos hoy)
    const [verificacionesHoy] = await pool.execute(
      `SELECT COUNT(DISTINCT u.IDUSUARIO) as total 
       FROM usuarios u
       INNER JOIN anexos a ON u.IDUSUARIO = a.IDUSUARIO
       WHERE u.rol = 'postulante' 
       AND DATE(a.fechaCreacion) = CURDATE()`
    );
    const hoyVerificaciones = verificacionesHoy[0]?.total || 0;

    // 5. Postulantes registrados desde la app (verificaciones de QR)
    let totalRegistradosApp = 0;
    let registradosAppHoy = 0;
    
    try {
      // Verificar si la tabla existe
      const [tablaExiste] = await pool.execute(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() 
         AND table_name = 'verificaciones_qr'`
      );
      
      if (tablaExiste[0]?.count > 0) {
        // Total de postulantes registrados desde la app
        const [totalApp] = await pool.execute(
          `SELECT COUNT(*) as total FROM verificaciones_qr`
        );
        totalRegistradosApp = totalApp[0]?.total || 0;

        // Postulantes registrados desde la app hoy
        const [appHoy] = await pool.execute(
          `SELECT COUNT(*) as total FROM verificaciones_qr 
           WHERE DATE(fechaRegistro) = CURDATE()`
        );
        registradosAppHoy = appHoy[0]?.total || 0;
      }
    } catch (error) {
      console.warn('⚠️ Tabla verificaciones_qr no existe aún:', error.message);
    }

    console.log('📊 Estadísticas obtenidas:', {
      totalRegistrados,
      registradosHoy,
      totalVerificaciones,
      hoyVerificaciones,
      totalRegistradosApp,
      registradosAppHoy
    });

    res.status(200).json({
      success: true,
      data: {
        hoy: registradosHoy,
        total: totalRegistrados,
        hoyVerificaciones: hoyVerificaciones,
        totalVerificaciones: totalVerificaciones,
        totalRegistradosApp: totalRegistradosApp,
        registradosAppHoy: registradosAppHoy
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

// Llamar a ensureEstadoColumn cuando se cargue el módulo
ensureUsuariosTable().then(() => {
  ensureEstadoColumn();
  ensureComiteConvocatoriasTable();
});

// ============================================================
// 🔐 RECUPERACIÓN DE CONTRASEÑA
// ============================================================

// Verificar rol del usuario (para forgot-password)
export const checkUserRole = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Correo electrónico es requerido' });
    }

    // Buscar usuario por correo
    const [usuarios] = await pool.execute(
      'SELECT IDUSUARIO, correo, rol FROM usuarios WHERE correo = ?',
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ message: 'No se encontró un usuario con este correo electrónico.' });
    }

    const usuario = usuarios[0];
    res.status(200).json({ 
      rol: usuario.rol,
      email: usuario.correo
    });
  } catch (error) {
    console.error('❌ Error al verificar usuario:', error);
    res.status(500).json({ 
      message: 'Error al verificar el usuario',
      details: error.message 
    });
  }
};

// Solicitar restablecimiento de contraseña
export const forgotPassword = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { email, role } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Correo electrónico es requerido' });
    }

    // Buscar usuario por correo
    const [usuarios] = await pool.execute(
      'SELECT IDUSUARIO, correo, rol, nombreCompleto FROM usuarios WHERE correo = ?',
      [email]
    );

    if (usuarios.length === 0) {
      // Por seguridad, no revelar si el email existe o no
      return res.status(200).json({ 
        message: 'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación.' 
      });
    }

    const usuario = usuarios[0];

    // Verificar rol si se proporciona
    if (role && usuario.rol !== role.toLowerCase()) {
      return res.status(403).json({ 
        message: `Solo los usuarios con rol '${role}' pueden recuperar su contraseña.` 
      });
    }

    // Generar token de restablecimiento
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setMinutes(resetTokenExpiry.getMinutes() + 15); // Válido por 15 minutos

    // Guardar token en la base de datos (crear tabla si no existe)
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          ID INT AUTO_INCREMENT PRIMARY KEY,
          IDUSUARIO INT NOT NULL,
          token VARCHAR(255) NOT NULL,
          expiresAt DATETIME NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_token (token),
          INDEX idx_usuario (IDUSUARIO),
          FOREIGN KEY (IDUSUARIO) REFERENCES usuarios(IDUSUARIO) ON DELETE CASCADE
        )
      `);
    } catch (error) {
      // Si falla por foreign key, crear sin ella
      try {
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            ID INT AUTO_INCREMENT PRIMARY KEY,
            IDUSUARIO INT NOT NULL,
            token VARCHAR(255) NOT NULL,
            expiresAt DATETIME NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_token (token),
            INDEX idx_usuario (IDUSUARIO)
          )
        `);
      } catch (e2) {
        console.error('Error al crear tabla password_reset_tokens:', e2);
      }
    }

    // Eliminar tokens anteriores del usuario
    await pool.execute(
      'DELETE FROM password_reset_tokens WHERE IDUSUARIO = ?',
      [usuario.IDUSUARIO]
    );

    // Guardar nuevo token
    await pool.execute(
      'INSERT INTO password_reset_tokens (IDUSUARIO, token, expiresAt) VALUES (?, ?, ?)',
      [usuario.IDUSUARIO, resetToken, resetTokenExpiry]
    );

    // Construir URL de restablecimiento
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    // Enviar email con diseño blanco y azul
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Restablecimiento de Contraseña - UGEL Talara',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%);
              min-height: 100vh;
            }
            .email-container {
              max-width: 600px;
              margin: 40px auto;
              background: #ffffff;
              border-radius: 24px;
              overflow: hidden;
              border: 1px solid #e0e7ff;
              box-shadow: 0 20px 60px rgba(59, 130, 246, 0.15);
            }
            .header {
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              letter-spacing: -0.5px;
            }
            .header p {
              color: rgba(255, 255, 255, 0.95);
              margin: 8px 0 0 0;
              font-size: 14px;
              font-weight: 500;
            }
            .content {
              padding: 40px 30px;
              background: #ffffff;
            }
            .greeting {
              color: #1e40af;
              font-size: 18px;
              font-weight: 600;
              margin: 0 0 20px 0;
            }
            .message {
              color: #475569;
              font-size: 15px;
              line-height: 1.7;
              margin: 0 0 30px 0;
            }
            .button-container {
              text-align: center;
              margin: 35px 0;
            }
            .reset-button {
              display: inline-block;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              padding: 16px 40px;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
              transition: all 0.3s ease;
            }
            .reset-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
            }
            .link-box {
              background: #eff6ff;
              border: 1px solid #dbeafe;
              border-radius: 12px;
              padding: 15px;
              margin: 25px 0;
            }
            .link-label {
              color: #64748b;
              font-size: 13px;
              margin: 0 0 8px 0;
              font-weight: 500;
            }
            .link-text {
              color: #2563eb;
              word-break: break-all;
              font-size: 12px;
              font-family: 'Courier New', monospace;
              margin: 0;
            }
            .warning-box {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              border-radius: 8px;
              padding: 15px;
              margin: 30px 0;
            }
            .warning-title {
              color: #d97706;
              font-weight: 600;
              font-size: 14px;
              margin: 0 0 8px 0;
            }
            .warning-text {
              color: #78350f;
              font-size: 13px;
              line-height: 1.6;
              margin: 0;
            }
            .footer {
              background: #f8fafc;
              padding: 25px 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer-text {
              color: #64748b;
              font-size: 12px;
              margin: 0;
              line-height: 1.6;
            }
            .icon-container {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 25px;
              box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
            }
            .icon {
              width: 40px;
              height: 40px;
              color: white;
            }
            .title {
              color: #1e40af;
              font-size: 24px;
              font-weight: 700;
              margin: 0 0 20px 0;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>🔐 UGEL Talara</h1>
              <p>Sistema CAS 2025</p>
            </div>
            
            <div class="content">
              <div class="icon-container">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              
              <h2 class="title">
                Restablece tu Contraseña
              </h2>
              
              <p class="greeting">
                Hola ${usuario.nombreCompleto || 'Usuario'},
              </p>
              
              <p class="message">
                Recibimos una solicitud para restablecer tu contraseña en tu cuenta del Sistema CAS 2025 de UGEL Talara.
              </p>
              
              <p class="message">
                Si no realizaste esta solicitud, puedes ignorar este correo de forma segura. Tu cuenta permanecerá protegida.
              </p>
              
              <div class="button-container">
                <a href="${resetUrl}" class="reset-button">
                  🔒 Restablecer Contraseña
                </a>
              </div>
              
              <div class="link-box">
                <p class="link-label">O copia y pega este enlace en tu navegador:</p>
                <p class="link-text">${resetUrl}</p>
              </div>
              
              <div class="warning-box">
                <p class="warning-title">⏰ Importante</p>
                <p class="warning-text">
                  Este enlace de restablecimiento expirará en <strong>15 minutos</strong> por seguridad. 
                  Por favor, no compartas este enlace con nadie.
                </p>
              </div>
              
              <p class="message" style="font-size: 13px; color: #64748b; margin-top: 30px;">
                Si tienes problemas para restablecer tu contraseña, contacta al soporte técnico de UGEL Talara.
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                Este es un correo automático del sistema. Por favor, no respondas a este mensaje.<br>
                © ${new Date().getFullYear()} UGEL Talara - Sistema CAS 2025
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de restablecimiento enviado a: ${email}`);

    // Por seguridad, no revelar si el email existe
    res.status(200).json({ 
      message: 'Si el correo existe en nuestro sistema, recibirás un enlace de recuperación.' 
    });
  } catch (error) {
    console.error('❌ Error en forgot-password:', error);
    res.status(500).json({ 
      message: 'Error al procesar la solicitud de restablecimiento',
      details: error.message 
    });
  }
};

// Restablecer contraseña con token
export const resetPassword = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const { token } = req.params;
    const { password } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token de restablecimiento es requerido' });
    }

    if (!password) {
      return res.status(400).json({ message: 'La nueva contraseña es requerida' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // Buscar token válido
    const [tokens] = await pool.execute(
      `SELECT prt.IDUSUARIO, prt.expiresAt, u.IDUSUARIO as usuario_id
       FROM password_reset_tokens prt
       INNER JOIN usuarios u ON prt.IDUSUARIO = u.IDUSUARIO
       WHERE prt.token = ? AND prt.expiresAt > NOW()`,
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ message: 'El token es inválido o ha expirado.' });
    }

    const tokenData = tokens[0];
    const userId = tokenData.IDUSUARIO;

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar contraseña
    await pool.execute(
      'UPDATE usuarios SET contrasena = ? WHERE IDUSUARIO = ?',
      [hashedPassword, userId]
    );

    // Eliminar token usado
    await pool.execute(
      'DELETE FROM password_reset_tokens WHERE token = ?',
      [token]
    );

    console.log(`✅ Contraseña restablecida exitosamente para usuario: ${userId}`);
    res.status(200).json({ 
      message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.' 
    });
  } catch (error) {
    console.error('❌ Error en reset-password:', error);
    res.status(500).json({ 
      message: 'Error al restablecer la contraseña',
      details: error.message 
    });
  }
};

// Subir foto de perfil del usuario
const subirFotoPerfil = async (req, res) => {
  try {
    await ensureUsuariosTable();
    
    const userId = req.params.id;
    
    // Verificar que el usuario existe
    const [usuarios] = await pool.execute(
      'SELECT IDUSUARIO FROM usuarios WHERE IDUSUARIO = ?',
      [userId]
    );
    
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar que se subió un archivo
    // Aceptar tanto 'foto' como 'profilePicture' como nombre del campo
    const foto = req.files?.foto || req.files?.profilePicture;
    if (!foto) {
      return res.status(400).json({ error: 'No se proporcionó archivo de foto' });
    }
    
    // Validar que es una imagen
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedMimes.includes(foto.mimetype)) {
      return res.status(400).json({ error: 'El archivo debe ser una imagen (JPEG, PNG o GIF)' });
    }
    
    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (foto.size > maxSize) {
      return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 5MB' });
    }
    
    // Crear directorio de perfiles si no existe
    const profilesDir = path.join(__dirname, '..', '..', 'uploads', 'profiles');
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }
    
    // Generar nombre único para el archivo
    const fileExtension = path.extname(foto.name) || '.jpg';
    const fileName = `profile_${userId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(profilesDir, fileName);
    
    // Guardar el archivo
    await foto.mv(filePath);
    
    // Obtener foto anterior si existe
    const [usuarioActual] = await pool.execute(
      'SELECT profilePicture FROM usuarios WHERE IDUSUARIO = ?',
      [userId]
    );
    
    const fotoAnterior = usuarioActual[0]?.profilePicture;
    
    // Actualizar la base de datos
    await pool.execute(
      'UPDATE usuarios SET profilePicture = ? WHERE IDUSUARIO = ?',
      [fileName, userId]
    );
    
    // Eliminar foto anterior si existe
    if (fotoAnterior) {
      const oldFilePath = path.join(profilesDir, fotoAnterior);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (error) {
          console.error('⚠️ Error al eliminar foto anterior:', error);
        }
      }
    }
    
    // Verificar que el archivo realmente existe después de guardarlo
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Error: El archivo no existe después de guardarlo en ${filePath}`);
      return res.status(500).json({ 
        error: 'Error al guardar el archivo',
        details: 'El archivo no se pudo guardar correctamente'
      });
    }
    
    // Construir URL de la foto usando el host de la petición
    // Si viene a través de ngrok, usar el host de ngrok
    const host = req.get('host');
    const protocol = req.protocol || (req.headers['x-forwarded-proto'] || 'https');
    
    // Usar la ruta de la API en lugar de express.static para mejor compatibilidad con ngrok
    const profilePictureUrl = `${protocol}://${host}/ugel-talara/uploads/profiles/${fileName}`;
    
    console.log(`✅ Foto de perfil actualizada para usuario: ${userId}`);
    console.log(`📁 Archivo guardado en: ${filePath}`);
    console.log(`📁 Archivo existe: ${fs.existsSync(filePath)}`);
    console.log(`🌐 URL de acceso: ${profilePictureUrl}`);
    console.log(`🌐 Host: ${host}, Protocol: ${protocol}`);
    
    res.status(200).json({
      success: true,
      message: 'Foto de perfil actualizada exitosamente',
      user: {
        fotoperfil: profilePictureUrl,
        profilePicture: profilePictureUrl
      },
      profilePicture: profilePictureUrl,
      fotoUrl: profilePictureUrl,
      url: profilePictureUrl,
      fileName: fileName // Incluir el nombre del archivo para debugging
    });
  } catch (error) {
    console.error('❌ Error al subir foto de perfil:', error);
    res.status(500).json({
      error: 'Error al subir foto de perfil',
      details: error.message
    });
  }
};

// Servir imagen de perfil
const servirFotoPerfil = async (req, res) => {
  try {
    const fileName = req.params.filename;
    
    console.log(`📷 Solicitud para servir imagen: ${fileName}`);
    
    // Validar que el nombre del archivo sea seguro (sin path traversal)
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      console.error(`❌ Nombre de archivo inválido: ${fileName}`);
      return res.status(400).json({ error: 'Nombre de archivo inválido' });
    }
    
    const profilesDir = path.join(__dirname, '..', '..', 'uploads', 'profiles');
    const filePath = path.resolve(profilesDir, fileName);
    
    console.log(`📁 Ruta del archivo: ${filePath}`);
    console.log(`📁 Directorio existe: ${fs.existsSync(profilesDir)}`);
    console.log(`📁 Archivo existe: ${fs.existsSync(filePath)}`);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Archivo no encontrado: ${filePath}`);
      // Listar archivos disponibles para debugging
      if (fs.existsSync(profilesDir)) {
        const files = fs.readdirSync(profilesDir);
        console.log(`📂 Archivos disponibles en el directorio: ${files.slice(0, 5).join(', ')}`);
      }
      return res.status(404).json({ error: 'Imagen no encontrada', filePath });
    }
    
    // Determinar el tipo de contenido basado en la extensión
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    
    // Configurar headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Leer y enviar el archivo
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✅ Imagen servida exitosamente: ${fileName} (${fileBuffer.length} bytes)`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('❌ Error al servir foto de perfil:', error);
    res.status(500).json({ error: 'Error al servir la imagen', details: error.message });
  }
};

// Exportar funciones del controlador
export { 
  ensureUsuariosTable, 
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
  subirFotoPerfil,
  servirFotoPerfil
};
