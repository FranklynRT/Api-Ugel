import { pool, retryDatabaseOperation } from '../database/conexion.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { asegurarTablaPostulantesRegistrados } from './verificaciones.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para verificar y crear la tabla ANEXOS si no existe
async function ensureAnexosTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anexos (
          IDANEXO INT AUTO_INCREMENT PRIMARY KEY,
          IDUSUARIO INT NOT NULL,
          IDCONVOCATORIA INT,
          formDataJson LONGTEXT NOT NULL,
          pdfFile LONGBLOB,
          nombreArchivo VARCHAR(255),
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_usuario (IDUSUARIO),
          INDEX idx_convocatoria (IDCONVOCATORIA),
          INDEX idx_fechaCreacion (fechaCreacion)
        )
      `);
      console.log('✅ Tabla anexos creada exitosamente');
    } else {
      // Verificar si existe la columna pdfFile, si no, agregarla y migrar datos
      const [columns] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'anexos' 
         AND COLUMN_NAME = 'pdfFile'`
      );

      if (columns.length === 0) {
        // Agregar columna pdfFile
        await pool.execute(`
          ALTER TABLE anexos 
          ADD COLUMN pdfFile LONGBLOB AFTER formDataJson
        `);
        console.log('✅ Columna pdfFile agregada a la tabla anexos');
      }
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos:', error.message);
  }
}

// ============================================================
// FUNCIONES PARA CREAR TABLAS INDIVIDUALES DE ANEXOS
// ============================================================

// Función para crear tabla de datos personales
async function ensureAnexosPersonalDataTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos_personal_data'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anexos_personal_data (
          IDPERSONAL INT AUTO_INCREMENT PRIMARY KEY,
          IDANEXO INT NOT NULL,
          codigo VARCHAR(50),
          nombrePuesto VARCHAR(255),
          tipoDocumento ENUM('DNI', 'CARNET DE EXTRANJERÍA') DEFAULT 'DNI',
          dni VARCHAR(20),
          carnetExtranjeria VARCHAR(20),
          apellidoPaterno VARCHAR(100),
          apellidoMaterno VARCHAR(100),
          nombres VARCHAR(255),
          genero ENUM('M', 'F') DEFAULT 'M',
          direccion TEXT,
          provincia VARCHAR(100),
          departamento VARCHAR(100),
          distrito VARCHAR(100),
          departamentoId VARCHAR(50),
          provinciaId VARCHAR(50),
          distritoId VARCHAR(50),
          referenciaDireccion TEXT,
          fechaNacimiento DATE,
          lugarNacimiento TEXT,
          lugarNacimientoDepartamentoId VARCHAR(50),
          lugarNacimientoProvinciaId VARCHAR(50),
          lugarNacimientoDistritoId VARCHAR(50),
          lugarNacimientoDepartamento VARCHAR(100),
          lugarNacimientoProvincia VARCHAR(100),
          lugarNacimientoDistrito VARCHAR(100),
          correoElectronico VARCHAR(255),
          telefonoDomicilio VARCHAR(20),
          telefonoCelular1 VARCHAR(20),
          telefonoCelular2 VARCHAR(20),
          correoElectronicoAlterno VARCHAR(255),
          conadis ENUM('SI', 'NO') DEFAULT 'NO',
          nCarnetConadis VARCHAR(50),
          codigoConadis VARCHAR(50),
          fuerzasArmadas ENUM('SI', 'NO') DEFAULT 'NO',
          nCarnetFuerzasArmadas VARCHAR(50),
          codigoFuerzasArmadas VARCHAR(50),
          asistenciaEspecial TEXT,
          tiempoSectorPublico DATE,
          tiempoSectorPrivado DATE,
          colegioProfesional VARCHAR(255),
          colegioProfesionalHabilitado ENUM('SI', 'NO') DEFAULT 'NO',
          nColegiatura VARCHAR(50),
          fechaVencimientoColegiatura DATE,
          numeroCas VARCHAR(50),
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (IDANEXO) REFERENCES anexos(IDANEXO) ON DELETE CASCADE,
          INDEX idx_anexo (IDANEXO),
          INDEX idx_usuario (codigo)
        )
      `);
      console.log('✅ Tabla anexos_personal_data creada exitosamente');
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos_personal_data:', error.message);
  }
}

// Función para crear tabla de formación académica
async function ensureAnexosAcademicFormationTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos_academic_formation'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anexos_academic_formation (
          IDACADEMIC INT AUTO_INCREMENT PRIMARY KEY,
          IDANEXO INT NOT NULL,
          nivelEducativo VARCHAR(100),
          gradoAcademico VARCHAR(255),
          nombreCarrera VARCHAR(255),
          institucion VARCHAR(255),
          anoDesde VARCHAR(10),
          anoHasta VARCHAR(10),
          otrosNivelEspecificar VARCHAR(255),
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (IDANEXO) REFERENCES anexos(IDANEXO) ON DELETE CASCADE,
          INDEX idx_anexo (IDANEXO)
        )
      `);
      console.log('✅ Tabla anexos_academic_formation creada exitosamente');
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos_academic_formation:', error.message);
  }
}

// Función para crear tabla de idiomas
async function ensureAnexosLanguageSkillsTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos_language_skills'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anexos_language_skills (
          IDLANGUAGE INT AUTO_INCREMENT PRIMARY KEY,
          IDANEXO INT NOT NULL,
          idiomaDialecto VARCHAR(255),
          nivel ENUM('Básico', 'Intermedio', 'Avanzado'),
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (IDANEXO) REFERENCES anexos(IDANEXO) ON DELETE CASCADE,
          INDEX idx_anexo (IDANEXO)
        )
      `);
      console.log('✅ Tabla anexos_language_skills creada exitosamente');
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos_language_skills:', error.message);
  }
}

// Función para crear tabla de ofimática
async function ensureAnexosOfficeSkillsTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos_office_skills'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anexos_office_skills (
          IDOFFICE INT AUTO_INCREMENT PRIMARY KEY,
          IDANEXO INT NOT NULL,
          materia VARCHAR(255),
          nivel ENUM('Básico', 'Intermedio', 'Avanzado'),
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (IDANEXO) REFERENCES anexos(IDANEXO) ON DELETE CASCADE,
          INDEX idx_anexo (IDANEXO)
        )
      `);
      console.log('✅ Tabla anexos_office_skills creada exitosamente');
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos_office_skills:', error.message);
  }
}

// Función para crear tabla de especialización
async function ensureAnexosSpecializationStudiesTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos_specialization_studies'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anexos_specialization_studies (
          IDSPECIALIZATION INT AUTO_INCREMENT PRIMARY KEY,
          IDANEXO INT NOT NULL,
          tipoEstudio VARCHAR(100),
          nombreEstudio VARCHAR(255),
          periodoInicio VARCHAR(10),
          periodoFin VARCHAR(10),
          horas VARCHAR(50),
          centroEstudio VARCHAR(255),
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (IDANEXO) REFERENCES anexos(IDANEXO) ON DELETE CASCADE,
          INDEX idx_anexo (IDANEXO)
        )
      `);
      console.log('✅ Tabla anexos_specialization_studies creada exitosamente');
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos_specialization_studies:', error.message);
  }
}

// Función para crear tabla de experiencia laboral
async function ensureAnexosWorkExperienceTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos_work_experience'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anexos_work_experience (
          IDEXPERIENCE INT AUTO_INCREMENT PRIMARY KEY,
          IDANEXO INT NOT NULL,
          empresaInstitucion VARCHAR(255),
          sectorGiroNegocio VARCHAR(255),
          puestoCargo VARCHAR(255),
          periodoDesde VARCHAR(20),
          periodoHasta VARCHAR(20),
          funcionPrincipal1 TEXT,
          funcionPrincipal2 TEXT,
          funcionPrincipal3 TEXT,
          funcionPrincipal4 TEXT,
          funcionPrincipal5 TEXT,
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (IDANEXO) REFERENCES anexos(IDANEXO) ON DELETE CASCADE,
          INDEX idx_anexo (IDANEXO)
        )
      `);
      console.log('✅ Tabla anexos_work_experience creada exitosamente');
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos_work_experience:', error.message);
  }
}

// Función para crear tabla de referencias laborales
async function ensureAnexosLaborReferencesTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos_labor_references'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anexos_labor_references (
          IDREFERENCE INT AUTO_INCREMENT PRIMARY KEY,
          IDANEXO INT NOT NULL,
          empresaEntidad VARCHAR(255),
          direccion TEXT,
          cargoPostulante VARCHAR(255),
          nombreCargoJefe VARCHAR(255),
          telefonos VARCHAR(50),
          correoElectronico VARCHAR(255),
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (IDANEXO) REFERENCES anexos(IDANEXO) ON DELETE CASCADE,
          INDEX idx_anexo (IDANEXO)
        )
      `);
      console.log('✅ Tabla anexos_labor_references creada exitosamente');
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos_labor_references:', error.message);
  }
}

// Función para crear tabla de parientes
async function ensureAnexosRelativesTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos_relatives'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anexos_relatives (
          IDRELATIVE INT AUTO_INCREMENT PRIMARY KEY,
          IDANEXO INT NOT NULL,
          gradoParentesco VARCHAR(100),
          areaTrabajo VARCHAR(255),
          apellidos VARCHAR(255),
          nombres VARCHAR(255),
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (IDANEXO) REFERENCES anexos(IDANEXO) ON DELETE CASCADE,
          INDEX idx_anexo (IDANEXO)
        )
      `);
      console.log('✅ Tabla anexos_relatives creada exitosamente');
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos_relatives:', error.message);
  }
}

// Función para crear tabla de declaraciones
async function ensureAnexosDeclarationsTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos_declarations'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anexos_declarations (
          IDDECLARATION INT AUTO_INCREMENT PRIMARY KEY,
          IDANEXO INT NOT NULL,
          infoVerdadera BOOLEAN DEFAULT FALSE,
          fechaDeclaracion DATE,
          leyProteccionDatos BOOLEAN DEFAULT FALSE,
          datosConsignadosVerdaderos BOOLEAN DEFAULT FALSE,
          plenosDerechosCiviles BOOLEAN DEFAULT FALSE,
          cumploRequisitosMinimos BOOLEAN DEFAULT FALSE,
          noCondenaDolosa BOOLEAN DEFAULT FALSE,
          noInhabilitacion BOOLEAN DEFAULT FALSE,
          noSentenciaCondenatoria BOOLEAN DEFAULT FALSE,
          noAntecedentesPenales BOOLEAN DEFAULT FALSE,
          noAntecedentesPoliciales BOOLEAN DEFAULT FALSE,
          noAntecedentesJudiciales BOOLEAN DEFAULT FALSE,
          noParientesUGEL BOOLEAN DEFAULT FALSE,
          tieneParientesUGEL ENUM('SI', 'NO') DEFAULT 'NO',
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (IDANEXO) REFERENCES anexos(IDANEXO) ON DELETE CASCADE,
          UNIQUE KEY unique_anexo (IDANEXO)
        )
      `);
      console.log('✅ Tabla anexos_declarations creada exitosamente');
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos_declarations:', error.message);
  }
}

// Función para crear tabla consolidada de anexos completos
async function ensureAnexosCompletosTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos_completos'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS anexos_completos (
          IDANEXO_COMPLETO INT AUTO_INCREMENT PRIMARY KEY,
          IDANEXO INT NOT NULL,
          IDUSUARIO INT NOT NULL,
          IDCONVOCATORIA INT,
          
          -- DATOS PERSONALES
          tipoDocumento ENUM('DNI', 'CARNET DE EXTRANJERÍA') DEFAULT 'DNI',
          dni VARCHAR(20),
          carnetExtranjeria VARCHAR(20),
          apellidoPaterno VARCHAR(100),
          apellidoMaterno VARCHAR(100),
          nombres VARCHAR(255),
          genero ENUM('M', 'F') DEFAULT 'M',
          fechaNacimiento DATE,
          lugarNacimientoDepartamentoId VARCHAR(50),
          lugarNacimientoProvinciaId VARCHAR(50),
          lugarNacimientoDistritoId VARCHAR(50),
          lugarNacimientoDepartamento VARCHAR(100),
          lugarNacimientoProvincia VARCHAR(100),
          lugarNacimientoDistrito VARCHAR(100),
          direccion TEXT,
          referenciaDireccion TEXT,
          correoElectronico VARCHAR(255),
          telefonoDomicilio VARCHAR(20),
          telefonoCelular1 VARCHAR(20),
          telefonoCelular2 VARCHAR(20),
          correoElectronicoAlterno VARCHAR(255),
          conadis ENUM('SI', 'NO') DEFAULT 'NO',
          nCarnetConadis VARCHAR(50),
          codigoConadis VARCHAR(50),
          fuerzasArmadas ENUM('SI', 'NO') DEFAULT 'NO',
          nCarnetFuerzasArmadas VARCHAR(50),
          codigoFuerzasArmadas VARCHAR(50),
          asistenciaEspecial TEXT,
          tiempoSectorPublico DATE,
          tiempoSectorPrivado DATE,
          
          -- COLEGIO PROFESIONAL
          colegioProfesional VARCHAR(255),
          colegioProfesionalHabilitado ENUM('SI', 'NO') DEFAULT 'NO',
          nColegiatura VARCHAR(50),
          fechaVencimientoColegiatura DATE,
          
          -- FORMACIÓN ACADÉMICA (JSON array)
          formacionAcademica JSON,
          
          -- IDIOMAS (JSON array)
          idiomas JSON,
          
          -- OFIMÁTICA (JSON array)
          ofimatica JSON,
          
          -- ESPECIALIZACIÓN (JSON array)
          especializacion JSON,
          
          -- EXPERIENCIA LABORAL (JSON array)
          experienciaLaboral JSON,
          
          -- REFERENCIAS LABORALES (JSON array)
          referenciasLaborales JSON,
          
          -- PARIENTES EN UGEL (JSON array)
          parientesUGEL JSON,
          
          -- DECLARACIONES JURADAS
          veracidadDatos BOOLEAN DEFAULT FALSE,
          leyProteccionDatos BOOLEAN DEFAULT FALSE,
          datosConsignadosVerdaderos BOOLEAN DEFAULT FALSE,
          plenosDerechosCiviles BOOLEAN DEFAULT FALSE,
          cumplirRequisitos BOOLEAN DEFAULT FALSE,
          noCondenaDolosa BOOLEAN DEFAULT FALSE,
          noEstarInhabilitado BOOLEAN DEFAULT FALSE,
          noSentenciaCondenatoria BOOLEAN DEFAULT FALSE,
          noAntecedentesPenales BOOLEAN DEFAULT FALSE,
          noAntecedentesPoliciales BOOLEAN DEFAULT FALSE,
          noAntecedentesJudiciales BOOLEAN DEFAULT FALSE,
          noParientesUGEL BOOLEAN DEFAULT FALSE,
          tieneParientesUGEL ENUM('SI', 'NO') DEFAULT 'NO',
          
          -- METADATOS
          codigo VARCHAR(50),
          nombrePuesto VARCHAR(255),
          numeroCas VARCHAR(50),
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (IDANEXO) REFERENCES anexos(IDANEXO) ON DELETE CASCADE,
          INDEX idx_usuario (IDUSUARIO),
          INDEX idx_convocatoria (IDCONVOCATORIA),
          INDEX idx_anexo (IDANEXO),
          INDEX idx_fechaCreacion (fechaCreacion)
        )
      `);
      console.log('✅ Tabla anexos_completos creada exitosamente');
    } else {
      // Verificar si existen todas las columnas necesarias
      const [columns] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'anexos_completos'`
      );
      const columnNames = columns.map(col => col.COLUMN_NAME);

      // Agregar columnas faltantes si es necesario
      const requiredColumns = [
        'veracidadDatos', 'leyProteccionDatos', 'datosConsignadosVerdaderos',
        'plenosDerechosCiviles', 'cumplirRequisitos', 'noCondenaDolosa',
        'noEstarInhabilitado', 'noSentenciaCondenatoria', 'noAntecedentesPenales',
        'noAntecedentesPoliciales', 'noAntecedentesJudiciales', 'noParientesUGEL',
        'tieneParientesUGEL'
      ];

      for (const col of requiredColumns) {
        if (!columnNames.includes(col)) {
          if (col.includes('BOOLEAN')) {
            await pool.execute(`ALTER TABLE anexos_completos ADD COLUMN ${col} BOOLEAN DEFAULT FALSE`);
          } else if (col === 'tieneParientesUGEL') {
            await pool.execute(`ALTER TABLE anexos_completos ADD COLUMN ${col} ENUM('SI', 'NO') DEFAULT 'NO'`);
          }
          console.log(`✅ Columna ${col} agregada a anexos_completos`);
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos_completos:', error.message);
  }
}

// Función para crear todas las tablas de anexos
async function ensureAllAnexosTables() {
  await ensureAnexosTable();
  await ensureAnexosPersonalDataTable();
  await ensureAnexosAcademicFormationTable();
  await ensureAnexosLanguageSkillsTable();
  await ensureAnexosOfficeSkillsTable();
  await ensureAnexosSpecializationStudiesTable();
  await ensureAnexosWorkExperienceTable();
  await ensureAnexosLaborReferencesTable();
  await ensureAnexosRelativesTable();
  await ensureAnexosDeclarationsTable();
  await ensureAnexosCompletosTable(); // Nueva tabla consolidada
}

// Función para generar PDF bonito del anexo
function generateAnexoPDF(formData, userData, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Anexo 01 - Ficha de Datos Personales',
          Author: 'UGEL Talara',
          Subject: 'Datos del Postulante'
        }
      });

      // Crear directorio si no existe
      const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'anexos');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const { personalData, academicFormation, languageSkills, officeSkills,
        specializationStudies, workExperience, laborReferences, declarations } = formData;

      // Colores
      const primaryColor = '#667eea';
      const secondaryColor = '#4f46e5';
      const textColor = '#2c3e50';
      const lightGray = '#f8f9fa';

      // HEADER
      doc.rect(0, 0, 595.28, 100)
        .fill(primaryColor);

      doc.fillColor('#ffffff')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('FORMATO DE DATOS PERSONALES', 50, 25, { align: 'center', width: 495 });

      doc.fontSize(12)
        .font('Helvetica')
        .text('Anexo - Información del Postulante', 50, 55, { align: 'center', width: 495 });

      // Información de identificación en el header
      doc.fillColor('#ffffff')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`ID Usuario: ${userData.IDUSUARIO || userData.id}`, 50, 75, { align: 'center', width: 495 });

      if (personalData.numeroCas) {
        doc.fontSize(10)
          .text(`N° CAS: ${personalData.numeroCas}`, 50, 90, { align: 'center', width: 495 });
      }

      let yPosition = 130;

      // CUADRO DESTACADO CON INFORMACIÓN PRINCIPAL DEL USUARIO
      // Borde exterior
      doc.rect(48, yPosition - 2, 499, 115)
        .fill('#ffffff')
        .stroke(primaryColor)
        .lineWidth(3);

      // Header del cuadro con fondo de color
      doc.rect(50, yPosition, 495, 28)
        .fill(primaryColor);

      // Título del cuadro
      doc.fillColor('#ffffff')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text('INFORMACIÓN DE IDENTIFICACIÓN', 55, yPosition + 8);

      yPosition += 35;

      // Información del usuario en formato destacado
      const nombreCompleto = personalData.nombres || userData.nombreCompleto || 'N/A';
      const dni = personalData.dni || userData.documento || 'N/A';
      const telefono = personalData.telefonoCelular1 || userData.telefono || 'N/A';
      const correo = personalData.correoElectronico || userData.correo || 'N/A';

      // Fondo alternado para mejor legibilidad
      doc.rect(52, yPosition - 3, 491, 20)
        .fill('#f0f7ff');

      doc.fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Nombre Completo:', 55, yPosition + 3);

      doc.fillColor('#1a1a1a')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(nombreCompleto, 165, yPosition + 3, { width: 380 });

      yPosition += 22;

      // Fondo alternado
      doc.rect(52, yPosition - 3, 491, 20)
        .fill('#ffffff');

      // DNI y Teléfono lado a lado
      doc.fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('DNI:', 55, yPosition + 3);

      doc.fillColor(textColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(dni, 95, yPosition + 3, { width: 140 });

      doc.fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Teléfono:', 270, yPosition + 3);

      doc.fillColor(textColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(telefono, 350, yPosition + 3, { width: 195 });

      yPosition += 22;

      // Fondo alternado
      doc.rect(52, yPosition - 3, 491, 20)
        .fill('#f0f7ff');

      // Correo
      doc.fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Correo Electrónico:', 55, yPosition + 3);

      doc.fillColor(textColor)
        .fontSize(10)
        .font('Helvetica')
        .text(correo, 195, yPosition + 3, { width: 350 });

      yPosition += 30;

      // DATOS PERSONALES
      doc.rect(50, yPosition - 5, 495, 25)
        .fill(primaryColor);

      doc.fillColor('#ffffff')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text('I. DATOS PERSONALES', 55, yPosition + 3);

      yPosition += 35;

      // Crear una tabla organizada para los datos personales
      const datosPersonalesItems = [];

      if (personalData.nombrePuesto) {
        datosPersonalesItems.push({ label: 'Puesto al que Postula', value: personalData.nombrePuesto });
      }
      if (personalData.area) {
        datosPersonalesItems.push({ label: 'Área', value: personalData.area });
      }
      if (personalData.tipoDocumento) {
        datosPersonalesItems.push({ label: 'Tipo de Documento', value: personalData.tipoDocumento });
      }
      if (personalData.apellidoPaterno) {
        datosPersonalesItems.push({ label: 'Apellido Paterno', value: personalData.apellidoPaterno });
      }
      if (personalData.apellidoMaterno) {
        datosPersonalesItems.push({ label: 'Apellido Materno', value: personalData.apellidoMaterno });
      }
      if (personalData.nombres) {
        datosPersonalesItems.push({ label: 'Nombres', value: personalData.nombres });
      }
      if (personalData.genero) {
        datosPersonalesItems.push({ label: 'Género', value: personalData.genero === 'M' ? 'Masculino' : personalData.genero === 'F' ? 'Femenino' : personalData.genero });
      }
      if (personalData.fechaNacimiento) {
        datosPersonalesItems.push({ label: 'Fecha de Nacimiento', value: personalData.fechaNacimiento });
      }
      // Función auxiliar para convertir Buffer a string
      const bufferToString = (value) => {
        if (!value) return '';
        if (Buffer.isBuffer(value)) {
          return value.toString('utf8');
        }
        if (typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
          return Buffer.from(value.data).toString('utf8');
        }
        return String(value);
      };

      if (personalData.lugarNacimiento) {
        datosPersonalesItems.push({ label: 'Lugar de Nacimiento', value: bufferToString(personalData.lugarNacimiento) });
      }
      if (personalData.direccion) {
        datosPersonalesItems.push({ label: 'Dirección', value: bufferToString(personalData.direccion) });
      }

      // Mostrar datos en dos columnas para mejor organización
      let dataY = yPosition;
      const itemsPerColumn = Math.ceil(datosPersonalesItems.length / 2);
      const col1Width = 240;
      const col2Width = 245;
      const labelWidth = 125;
      const valueWidth1 = col1Width - labelWidth - 10;
      const valueWidth2 = col2Width - labelWidth - 10;

      // Procesar datos en dos columnas
      for (let i = 0; i < Math.max(itemsPerColumn, datosPersonalesItems.length); i++) {
        if (dataY + 25 > doc.page.height - 100) {
          doc.addPage();
          dataY = 50;
        }

        // Columna 1 (izquierda)
        if (i < datosPersonalesItems.length) {
          const item1 = datosPersonalesItems[i];

          // Fondo alternado
          if (i % 2 === 0) {
            doc.rect(50, dataY, col1Width, 22)
              .fill('#f8f9fa');
          }

          doc.fillColor(primaryColor)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(`${item1.label}:`, 55, dataY + 6);

          doc.fillColor(textColor)
            .fontSize(9)
            .font('Helvetica')
            .text(item1.value || 'N/A', 185, dataY + 6, { width: valueWidth1 });
        }

        // Columna 2 (derecha)
        const index2 = i + itemsPerColumn;
        if (index2 < datosPersonalesItems.length) {
          const item2 = datosPersonalesItems[index2];

          // Fondo alternado
          if (i % 2 === 0) {
            doc.rect(305, dataY, col2Width, 22)
              .fill('#f8f9fa');
          }

          doc.fillColor(primaryColor)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(`${item2.label}:`, 310, dataY + 6);

          doc.fillColor(textColor)
            .fontSize(9)
            .font('Helvetica')
            .text(item2.value || 'N/A', 440, dataY + 6, { width: valueWidth2 });
        }

        dataY += 22;
      }

      yPosition = dataY + 20;

      // FORMACIÓN ACADÉMICA
      if (academicFormation && academicFormation.length > 0) {
        yPosition = addSectionWithTable(doc, yPosition, 'II. FORMACIÓN ACADÉMICA', primaryColor, textColor, [
          ['Nivel', 'Grado Académico', 'Carrera', 'Institución', 'Años']
        ], academicFormation.map(item => [
          item.nivelEducativo === 'OTROS (ESPECIFICAR)' && item.otrosNivelEspecificar
            ? `${item.nivelEducativo}: ${item.otrosNivelEspecificar}`
            : item.nivelEducativo || 'N/A',
          item.gradoAcademico || 'N/A',
          item.nombreCarrera || 'N/A',
          item.institucion || 'N/A',
          `${item.anoDesde || ''} - ${item.anoHasta || ''}`
        ]));
      }

      // IDIOMAS
      if (languageSkills && languageSkills.length > 0) {
        yPosition = addSectionWithTable(doc, yPosition, 'III. CONOCIMIENTO DE IDIOMAS', primaryColor, textColor, [
          ['Idioma/Dialecto', 'Nivel']
        ], languageSkills.map(item => [
          item.idiomaDialecto || 'N/A',
          item.nivel || 'N/A'
        ]));
      }

      // OFIMÁTICA
      if (officeSkills && officeSkills.length > 0) {
        yPosition = addSectionWithTable(doc, yPosition, 'IV. CONOCIMIENTOS DE OFIMÁTICA', primaryColor, textColor, [
          ['Materia', 'Nivel']
        ], officeSkills.map(item => [
          item.materia || 'N/A',
          item.nivel || 'N/A'
        ]));
      }

      // ESTUDIOS DE ESPECIALIZACIÓN
      if (specializationStudies && specializationStudies.length > 0) {
        yPosition = addSectionWithTable(doc, yPosition, 'V. ESTUDIOS DE ESPECIALIZACIÓN', primaryColor, textColor, [
          ['Tipo', 'Nombre', 'Centro', 'Periodo', 'Horas']
        ], specializationStudies.map(item => [
          item.tipoEstudio || 'N/A',
          item.nombreEstudio || 'N/A',
          item.centroEstudio || 'N/A',
          `${item.periodoInicio || ''} - ${item.periodoFin || ''}`,
          `${item.horas || ''}h`
        ]));
      }

      // EXPERIENCIA LABORAL
      if (workExperience && workExperience.length > 0) {
        yPosition = addWorkExperienceSection(doc, yPosition, workExperience, primaryColor, textColor);
      }

      // REFERENCIAS LABORALES
      if (laborReferences && laborReferences.length > 0) {
        yPosition = addSectionWithTable(doc, yPosition, 'VII. REFERENCIAS LABORALES', primaryColor, textColor, [
          ['Empresa', 'Cargo Postulante', 'Jefe', 'Teléfonos', 'Correo']
        ], laborReferences.map(item => [
          item.empresaEntidad || 'N/A',
          item.cargoPostulante || 'N/A',
          item.nombreCargoJefe || 'N/A',
          item.telefonos || 'N/A',
          item.correoElectronico || 'N/A'
        ]));
      }

      // DECLARACIONES
      if (declarations) {
        yPosition = addDeclarationsSection(doc, yPosition, declarations, primaryColor, textColor);
      }

      // FOOTER
      doc.fontSize(8)
        .fillColor('#6c757d')
        .text(`Documento generado el ${new Date().toLocaleDateString('es-PE')} - UGEL Talara`,
          50, doc.page.height - 50, { align: 'center', width: 495 });

      doc.end();

      stream.on('finish', () => {
        console.log('✅ PDF generado exitosamente:', outputPath);
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        console.error('❌ Error al generar PDF:', error);
        reject(error);
      });

    } catch (error) {
      console.error('❌ Error en generateAnexoPDF:', error);
      reject(error);
    }
  });
}

// Función auxiliar para agregar sección con tabla
function addSectionWithTable(doc, yPosition, title, primaryColor, textColor, headers, rows) {
  // Verificar si hay espacio en la página actual
  const estimatedHeight = 40 + (rows.length * 22) + 30; // Título + filas + margen
  if (yPosition + estimatedHeight > doc.page.height - 100) {
    doc.addPage();
    yPosition = 50;
  }

  // Título de sección con fondo destacado
  doc.rect(50, yPosition - 5, 495, 25)
    .fill(primaryColor);

  doc.fillColor('#ffffff')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(title, 55, yPosition + 3);

  yPosition += 35;

  if (rows.length === 0) {
    doc.fillColor(textColor)
      .fontSize(9)
      .font('Helvetica')
      .text('No hay datos registrados.', 55, yPosition);
    return yPosition + 25;
  }

  // Crear tabla
  const tableTop = yPosition;
  const headerHeight = 28;
  const rowHeight = 20;

  // Header de tabla
  doc.rect(50, tableTop, 495, headerHeight)
    .fill('#4f46e5')
    .stroke(primaryColor);

  const numCols = headers[0].length;
  const colWidth = 495 / numCols;

  headers[0].forEach((header, i) => {
    doc.fillColor('#ffffff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(header, 55 + (i * colWidth), tableTop + 9, {
        width: colWidth - 10,
        align: 'left'
      });

    // Línea divisoria vertical en header
    if (i < numCols - 1) {
      doc.moveTo(55 + ((i + 1) * colWidth), tableTop)
        .lineTo(55 + ((i + 1) * colWidth), tableTop + headerHeight)
        .stroke('#ffffff')
        .lineWidth(0.5);
    }
  });

  // Filas de datos
  rows.forEach((row, rowIndex) => {
    const rowY = tableTop + headerHeight + (rowIndex * rowHeight);

    // Alternar color de fondo para mejor legibilidad
    if (rowIndex % 2 === 0) {
      doc.rect(50, rowY, 495, rowHeight)
        .fill('#f8f9fa');
    } else {
      doc.rect(50, rowY, 495, rowHeight)
        .fill('#ffffff');
    }

    // Borde de fila
    doc.rect(50, rowY, 495, rowHeight)
      .stroke('#dee2e6')
      .lineWidth(0.5);

    row.forEach((cell, colIndex) => {
      // Líneas verticales entre columnas
      if (colIndex < numCols - 1) {
        doc.moveTo(55 + ((colIndex + 1) * colWidth), rowY)
          .lineTo(55 + ((colIndex + 1) * colWidth), rowY + rowHeight)
          .stroke('#dee2e6')
          .lineWidth(0.3);
      }

      doc.fillColor(textColor)
        .fontSize(8)
        .font('Helvetica')
        .text(cell || 'N/A', 55 + (colIndex * colWidth), rowY + 6, {
          width: colWidth - 10,
          align: 'left'
        });
    });
  });

  return tableTop + headerHeight + (rows.length * rowHeight) + 30;
}

// Función para agregar sección de experiencia laboral (más compleja)
function addWorkExperienceSection(doc, yPosition, workExperience, primaryColor, textColor) {
  // Título de sección
  doc.rect(50, yPosition - 5, 495, 25)
    .fill(primaryColor);

  doc.fillColor('#ffffff')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('VI. EXPERIENCIA LABORAL', 55, yPosition + 3);

  yPosition += 35;

  workExperience.forEach((exp, index) => {
    // Verificar espacio
    const cardHeight = 100 + (exp.funcionPrincipal1 ? 30 : 0) + (exp.funcionPrincipal2 ? 15 : 0) +
      (exp.funcionPrincipal3 ? 15 : 0) + (exp.funcionPrincipal4 ? 15 : 0) +
      (exp.funcionPrincipal5 ? 15 : 0);

    if (yPosition + cardHeight > doc.page.height - 50) {
      doc.addPage();
      yPosition = 50;
    }

    // Tarjeta de experiencia con mejor diseño
    doc.rect(50, yPosition, 495, cardHeight - 10)
      .fill('#ffffff')
      .stroke(primaryColor)
      .lineWidth(1.5);

    // Header de la tarjeta
    doc.rect(50, yPosition, 495, 25)
      .fill('#e8eaff');

    doc.fillColor(primaryColor)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(exp.puestoCargo || 'N/A', 60, yPosition + 8);

    yPosition += 30;

    // Información de la empresa
    doc.fillColor(primaryColor)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Empresa/Institución:', 60, yPosition);

    doc.fillColor(textColor)
      .fontSize(9)
      .font('Helvetica')
      .text(exp.empresaInstitucion || 'N/A', 60, yPosition + 12, { width: 240 });

    doc.fillColor(primaryColor)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Sector/Giro:', 310, yPosition);

    doc.fillColor(textColor)
      .fontSize(9)
      .font('Helvetica')
      .text(exp.sectorGiroNegocio || 'N/A', 310, yPosition + 12, { width: 235 });

    yPosition += 25;

    // Periodo
    doc.fillColor(primaryColor)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Periodo:', 60, yPosition);

    doc.fillColor(textColor)
      .fontSize(9)
      .font('Helvetica')
      .text(`${exp.periodoDesde || 'N/A'} - ${exp.periodoHasta || 'N/A'}`, 120, yPosition);

    yPosition += 20;

    // Funciones principales
    const funciones = [
      exp.funcionPrincipal1,
      exp.funcionPrincipal2,
      exp.funcionPrincipal3,
      exp.funcionPrincipal4,
      exp.funcionPrincipal5
    ].filter(f => f && f.trim() !== '');

    if (funciones.length > 0) {
      doc.fillColor(primaryColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Funciones Principales:', 60, yPosition);

      yPosition += 15;

      funciones.forEach((funcion) => {
        doc.fillColor(textColor)
          .fontSize(8)
          .font('Helvetica')
          .text(`• ${funcion}`, 70, yPosition, { width: 465 });
        yPosition += 12;
      });
    }

    yPosition += 15;
  });

  return yPosition;
}

// Función para agregar sección con tabla incluyendo número de anexo, área y puesto
function addSectionWithTableWithAnexoNumber(doc, yPosition, anexoNumber, area, puesto, primaryColor, textColor, headers, rows) {
  // Verificar si hay espacio en la página actual
  const titleHeight = 30; // Altura para anexo, área y puesto
  const estimatedHeight = titleHeight + 40 + (rows.length * 22) + 30; // Título + filas + margen
  if (yPosition + estimatedHeight > doc.page.height - 100) {
    doc.addPage();
    yPosition = 50;
  }

  // Barra con número de anexo, área y puesto
  doc.rect(50, yPosition - 5, 495, titleHeight)
    .fill(primaryColor);

  doc.fillColor('#ffffff')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(`Anexo #${anexoNumber} - Área: ${area} - Puesto: ${puesto}`, 55, yPosition + 6, { width: 485 });

  yPosition += titleHeight + 10;

  if (rows.length === 0) {
    doc.fillColor(textColor)
      .fontSize(9)
      .font('Helvetica')
      .text('No hay datos registrados.', 55, yPosition);
    return yPosition + 25;
  }

  // Crear tabla
  const tableTop = yPosition;
  const headerHeight = 28;
  const rowHeight = 20;

  // Header de tabla
  doc.rect(50, tableTop, 495, headerHeight)
    .fill('#4f46e5')
    .stroke(primaryColor);

  const numCols = headers[0].length;
  const colWidth = 495 / numCols;

  headers[0].forEach((header, i) => {
    doc.fillColor('#ffffff')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(header, 55 + (i * colWidth), tableTop + 9, {
        width: colWidth - 10,
        align: 'left'
      });

    // Línea divisoria vertical en header
    if (i < numCols - 1) {
      doc.moveTo(55 + ((i + 1) * colWidth), tableTop)
        .lineTo(55 + ((i + 1) * colWidth), tableTop + headerHeight)
        .stroke('#ffffff')
        .lineWidth(0.5);
    }
  });

  // Filas de datos
  rows.forEach((row, rowIndex) => {
    const rowY = tableTop + headerHeight + (rowIndex * rowHeight);

    // Alternar color de fondo para mejor legibilidad
    if (rowIndex % 2 === 0) {
      doc.rect(50, rowY, 495, rowHeight)
        .fill('#f8f9fa');
    } else {
      doc.rect(50, rowY, 495, rowHeight)
        .fill('#ffffff');
    }

    // Borde de fila
    doc.rect(50, rowY, 495, rowHeight)
      .stroke('#dee2e6')
      .lineWidth(0.5);

    row.forEach((cell, colIndex) => {
      // Líneas verticales entre columnas
      if (colIndex < numCols - 1) {
        doc.moveTo(55 + ((colIndex + 1) * colWidth), rowY)
          .lineTo(55 + ((colIndex + 1) * colWidth), rowY + rowHeight)
          .stroke('#dee2e6')
          .lineWidth(0.3);
      }

      doc.fillColor(textColor)
        .fontSize(8)
        .font('Helvetica')
        .text(cell || 'N/A', 55 + (colIndex * colWidth), rowY + 6, {
          width: colWidth - 10,
          align: 'left'
        });
    });
  });

  return tableTop + headerHeight + (rows.length * rowHeight) + 30;
}

// Función para agregar sección de experiencia laboral incluyendo número de anexo, área y puesto
function addWorkExperienceSectionWithAnexoNumber(doc, yPosition, anexoNumber, workExperience, area, puesto, primaryColor, textColor) {
  const titleHeight = 30;

  // Verificar espacio
  if (yPosition + titleHeight > doc.page.height - 100) {
    doc.addPage();
    yPosition = 50;
  }

  // Barra con número de anexo, área y puesto
  doc.rect(50, yPosition - 5, 495, titleHeight)
    .fill(primaryColor);

  doc.fillColor('#ffffff')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(`Anexo #${anexoNumber} - Área: ${area} - Puesto: ${puesto}`, 55, yPosition + 6, { width: 485 });

  yPosition += titleHeight + 10;

  workExperience.forEach((exp, index) => {
    // Verificar espacio
    const cardHeight = 100 + (exp.funcionPrincipal1 ? 30 : 0) + (exp.funcionPrincipal2 ? 15 : 0) +
      (exp.funcionPrincipal3 ? 15 : 0) + (exp.funcionPrincipal4 ? 15 : 0) +
      (exp.funcionPrincipal5 ? 15 : 0);

    if (yPosition + cardHeight > doc.page.height - 50) {
      doc.addPage();
      yPosition = 50;
    }

    // Tarjeta de experiencia con mejor diseño
    doc.rect(50, yPosition, 495, cardHeight - 10)
      .fill('#ffffff')
      .stroke(primaryColor)
      .lineWidth(1.5);

    // Header de la tarjeta
    doc.rect(50, yPosition, 495, 25)
      .fill('#e8eaff');

    doc.fillColor(primaryColor)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(exp.puestoCargo || 'N/A', 60, yPosition + 8);

    yPosition += 30;

    // Información de la empresa
    doc.fillColor(primaryColor)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Empresa/Institución:', 60, yPosition);

    doc.fillColor(textColor)
      .fontSize(9)
      .font('Helvetica')
      .text(exp.empresaInstitucion || exp.empresaEntidad || 'N/A', 60, yPosition + 12, { width: 240 });

    // Periodo
    doc.fillColor(primaryColor)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Periodo:', 60, yPosition + 25);

    doc.fillColor(textColor)
      .fontSize(9)
      .font('Helvetica')
      .text(`${exp.periodoDesde || 'N/A'} - ${exp.periodoHasta || 'N/A'}`, 120, yPosition + 25);

    yPosition += 45;

    // Funciones principales
    const funciones = [
      exp.funcionPrincipal1,
      exp.funcionPrincipal2,
      exp.funcionPrincipal3,
      exp.funcionPrincipal4,
      exp.funcionPrincipal5
    ].filter(f => f && f.trim() !== '');

    if (funciones.length > 0) {
      doc.fillColor(primaryColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Funciones Principales:', 60, yPosition);

      yPosition += 15;

      funciones.forEach((funcion) => {
        doc.fillColor(textColor)
          .fontSize(8)
          .font('Helvetica')
          .text(`• ${funcion}`, 70, yPosition, { width: 465 });
        yPosition += 12;
      });
    }

    yPosition += 15;
  });

  return yPosition;
}

// Función para agregar declaraciones (versión original sin área y puesto)
function addDeclarationsSection(doc, yPosition, declarations, primaryColor, textColor) {
  // Verificar espacio
  if (yPosition + 250 > doc.page.height - 50) {
    doc.addPage();
    yPosition = 50;
  }

  // Título de sección
  doc.rect(50, yPosition - 5, 495, 25)
    .fill(primaryColor);

  doc.fillColor('#ffffff')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('VIII. DECLARACIONES JURADAS', 55, yPosition + 3);

  yPosition += 35;

  // Calcular altura total necesaria para todas las declaraciones
  // 3 declaraciones iniciales (25 + 20 + 30 = 75) + 8 declaraciones adicionales (8 * 18 = 144) + márgenes
  const alturaTotalDeclaraciones = 15 + 75 + (8 * 18) + 20; // Aproximadamente 254

  // Cuadro de declaraciones con altura dinámica
  doc.rect(50, yPosition, 495, alturaTotalDeclaraciones)
    .fill('#f0f7ff')
    .stroke(primaryColor)
    .lineWidth(1.5);

  let textY = yPosition + 15;

  // Declaración 1
  doc.fillColor(declarations.datosConsignadosVerdaderos ? '#28a745' : '#6c757d')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(declarations.datosConsignadosVerdaderos ? '✓' : '☐', 60, textY);

  doc.fillColor(textColor)
    .fontSize(9)
    .font('Helvetica')
    .text('Declaro bajo juramento que los datos consignados en este formulario expresan la verdad.',
      80, textY, { width: 455 });

  textY += 25;

  // Declaración 2
  doc.fillColor(declarations.leyProteccionDatos ? '#28a745' : '#6c757d')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(declarations.leyProteccionDatos ? '✓' : '☐', 60, textY);

  doc.fillColor(textColor)
    .fontSize(8)
    .font('Helvetica')
    .text('Ley de Protección de Datos Personales: De conformidad con la Ley N° 29733 - Ley de Protección de Datos Personales.',
      80, textY, { width: 455 });

  textY += 20;

  // Declaración 3 (usar veracidadDatos si infoVerdadera no existe)
  const infoVerdadera = declarations.infoVerdadera || declarations.veracidadDatos || declarations.datosConsignadosVerdaderos || false;
  doc.fillColor(infoVerdadera ? '#28a745' : '#6c757d')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(infoVerdadera ? '✓' : '☐', 60, textY);

  doc.fillColor(textColor)
    .fontSize(9)
    .font('Helvetica')
    .text('Declaro que la información proporcionada es verdadera y podrá ser verificada.',
      80, textY, { width: 455 });

  textY += 30;

  // Otras declaraciones importantes (todas juntas en la misma sección)
  const otrasDeclaraciones = [
    { key: 'plenosDerechosCiviles', text: 'ESTAR EN EJERCICIO Y EN PLENO GOCE DE MIS DERECHOS CIVILES.' },
    { key: 'cumplirRequisitos', altKey: 'cumploRequisitosMinimos', text: 'CUMPLIR CON LOS REQUISITOS MÍNIMOS ESTABLECIDOS EN LA CONVOCATORIA.' },
    { key: 'noCondenaDolosa', text: 'NO TENGO CONDENA DOLOSA.' },
    { key: 'noEstarInhabilitado', altKey: 'noInhabilitacion', text: 'NO TENGO INHABILITACIÓN PARA EL EJERCICIO DE LA FUNCIÓN PÚBLICA.' },
    { key: 'noSentenciaCondenatoria', text: 'NO TENGO SENTENCIA CONDENATORIA.' },
    { key: 'noAntecedentesPenales', text: 'NO REGISTRO ANTECEDENTES PENALES.' },
    { key: 'noAntecedentesPoliciales', text: 'NO REGISTRO ANTECEDENTES POLICIALES.' },
    { key: 'noAntecedentesJudiciales', text: 'NO REGISTRO ANTECEDENTES JUDICIALES.' }
  ];

  otrasDeclaraciones.forEach(decl => {
    // Verificar si necesitamos cambiar de página
    if (textY + 20 > doc.page.height - 50) {
      textY = 50 + 15;
      doc.addPage();
      yPosition = 50;

      // Redibujar el cuadro en la nueva página
      doc.rect(50, yPosition, 495, alturaTotalDeclaraciones)
        .fill('#f0f7ff')
        .stroke(primaryColor)
        .lineWidth(1.5);
    }

    // Intentar usar la clave principal, si no existe, usar la clave alternativa
    const value = declarations[decl.key] || (decl.altKey ? declarations[decl.altKey] : false) || false;

    doc.fillColor(value ? '#28a745' : '#6c757d')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(value ? '✓' : '☐', 60, textY);

    doc.fillColor(textColor)
      .fontSize(8)
      .font('Helvetica')
      .text(decl.text, 80, textY + 2, { width: 455 });

    textY += 18;
  });

  return textY + 20;
}

// Función para agregar declaraciones incluyendo número de anexo, área y puesto
function addDeclarationsSectionWithAnexoNumber(doc, yPosition, anexoNumber, declarations, area, puesto, primaryColor, textColor) {
  const titleHeight = 30;

  // Verificar espacio
  if (yPosition + titleHeight + 200 > doc.page.height - 50) {
    doc.addPage();
    yPosition = 50;
  }

  // Barra con número de anexo, área y puesto
  doc.rect(50, yPosition - 5, 495, titleHeight)
    .fill(primaryColor);

  doc.fillColor('#ffffff')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(`Anexo #${anexoNumber} - Área: ${area} - Puesto: ${puesto}`, 55, yPosition + 6, { width: 485 });

  yPosition += titleHeight + 10;

  // Calcular altura total necesaria para todas las declaraciones
  // 3 declaraciones iniciales (25 + 20 + 30 = 75) + 8 declaraciones adicionales (8 * 18 = 144) + márgenes
  const alturaTotalDeclaraciones = 15 + 75 + (8 * 18) + 20; // Aproximadamente 254

  // Cuadro de declaraciones con altura dinámica
  doc.rect(50, yPosition, 495, alturaTotalDeclaraciones)
    .fill('#f0f7ff')
    .stroke(primaryColor)
    .lineWidth(1.5);

  let textY = yPosition + 15;

  // Declaración 1
  doc.fillColor(declarations.datosConsignadosVerdaderos ? '#28a745' : '#6c757d')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(declarations.datosConsignadosVerdaderos ? '✓' : '☐', 60, textY);

  doc.fillColor(textColor)
    .fontSize(9)
    .font('Helvetica')
    .text('Declaro bajo juramento que los datos consignados en este formulario expresan la verdad.',
      80, textY, { width: 455 });

  textY += 25;

  // Declaración 2
  doc.fillColor(declarations.leyProteccionDatos ? '#28a745' : '#6c757d')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(declarations.leyProteccionDatos ? '✓' : '☐', 60, textY);

  doc.fillColor(textColor)
    .fontSize(8)
    .font('Helvetica')
    .text('Ley de Protección de Datos Personales: De conformidad con la Ley N° 29733 - Ley de Protección de Datos Personales.',
      80, textY, { width: 455 });

  textY += 20;

  // Declaración 3 (usar veracidadDatos si infoVerdadera no existe)
  const infoVerdadera = declarations.infoVerdadera || declarations.veracidadDatos || declarations.datosConsignadosVerdaderos || false;
  doc.fillColor(infoVerdadera ? '#28a745' : '#6c757d')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(infoVerdadera ? '✓' : '☐', 60, textY);

  doc.fillColor(textColor)
    .fontSize(9)
    .font('Helvetica')
    .text('Declaro que la información proporcionada es verdadera y podrá ser verificada.',
      80, textY, { width: 455 });

  textY += 30;

  // Otras declaraciones importantes (todas juntas en la misma sección)
  const otrasDeclaraciones = [
    { key: 'plenosDerechosCiviles', text: 'ESTAR EN EJERCICIO Y EN PLENO GOCE DE MIS DERECHOS CIVILES.' },
    { key: 'cumplirRequisitos', altKey: 'cumploRequisitosMinimos', text: 'CUMPLIR CON LOS REQUISITOS MÍNIMOS ESTABLECIDOS EN LA CONVOCATORIA.' },
    { key: 'noCondenaDolosa', text: 'NO TENGO CONDENA DOLOSA.' },
    { key: 'noEstarInhabilitado', altKey: 'noInhabilitacion', text: 'NO TENGO INHABILITACIÓN PARA EL EJERCICIO DE LA FUNCIÓN PÚBLICA.' },
    { key: 'noSentenciaCondenatoria', text: 'NO TENGO SENTENCIA CONDENATORIA.' },
    { key: 'noAntecedentesPenales', text: 'NO REGISTRO ANTECEDENTES PENALES.' },
    { key: 'noAntecedentesPoliciales', text: 'NO REGISTRO ANTECEDENTES POLICIALES.' },
    { key: 'noAntecedentesJudiciales', text: 'NO REGISTRO ANTECEDENTES JUDICIALES.' }
  ];

  otrasDeclaraciones.forEach(decl => {
    // Verificar si necesitamos cambiar de página
    if (textY + 20 > doc.page.height - 50) {
      textY = 50 + 15;
      doc.addPage();
      yPosition = 50;

      // Redibujar el cuadro en la nueva página
      doc.rect(50, yPosition, 495, alturaTotalDeclaraciones)
        .fill('#f0f7ff')
        .stroke(primaryColor)
        .lineWidth(1.5);
    }

    // Intentar usar la clave principal, si no existe, usar la clave alternativa
    const value = declarations[decl.key] || (decl.altKey ? declarations[decl.altKey] : false) || false;

    doc.fillColor(value ? '#28a745' : '#6c757d')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(value ? '✓' : '☐', 60, textY);

    doc.fillColor(textColor)
      .fontSize(8)
      .font('Helvetica')
      .text(decl.text, 80, textY + 2, { width: 455 });

    textY += 18;
  });

  return textY + 20;
}

// Función auxiliar para convertir fecha DD/MM/AAAA a formato DATE
function parseDate(dateString) {
  if (!dateString || dateString.trim() === '') return null;

  // Si ya está en formato YYYY-MM-DD, devolverlo
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // Si está en formato DD/MM/AAAA, convertir
  const parts = dateString.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return null;
}

// Controlador para subir anexo
export const uploadAnexo = async (req, res) => {
  try {
    // Crear todas las tablas necesarias
    await ensureAllAnexosTables();

    // Obtener ID del usuario del token
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;

    if (!userId) {
      return res.status(401).json({ error: 'ID de usuario no encontrado en el token' });
    }

    // Obtener datos del usuario
    const [userRows] = await pool.execute(
      'SELECT IDUSUARIO, nombreCompleto, documento, telefono, correo FROM usuarios WHERE IDUSUARIO = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userData = userRows[0];

    // Obtener datos del formulario
    const formDataJson = req.body.formDataJson;
    if (!formDataJson) {
      return res.status(400).json({ error: 'Datos del formulario requeridos' });
    }

    let formData;
    try {
      formData = typeof formDataJson === 'string' ? JSON.parse(formDataJson) : formDataJson;
    } catch (error) {
      return res.status(400).json({ error: 'Error al parsear datos del formulario' });
    }

    // Obtener ID de convocatoria desde el request body (prioritario) o desde formData
    // Prioridad 1: request body (explícito)
    // Prioridad 2: formData.personalData?.codigo (legacy)
    // Prioridad 3: null (sin convocatoria)
    let convocatoriaId = req.body.convocatoriaId || null;

    // Si no viene en el body, intentar obtenerlo del formData
    if (!convocatoriaId && formData.personalData?.codigo) {
      // Validar que el codigo sea un número válido
      const codigoNum = Number(formData.personalData.codigo);
      if (!Number.isNaN(codigoNum) && codigoNum > 0) {
        convocatoriaId = codigoNum;
      }
    }

    // Normalizar convocatoriaId a número o null
    if (convocatoriaId !== null && convocatoriaId !== undefined) {
      const convocatoriaIdNum = Number(convocatoriaId);
      convocatoriaId = (!Number.isNaN(convocatoriaIdNum) && convocatoriaIdNum > 0) ? convocatoriaIdNum : null;
    } else {
      convocatoriaId = null;
    }

    console.log('📋 ID de convocatoria para anexo:', {
      fromBody: req.body.convocatoriaId,
      fromFormData: formData.personalData?.codigo,
      final: convocatoriaId,
      userId: userId
    });

    // Generar nombre de archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Anexo_01_Usuario_${userId}_${timestamp}.pdf`;
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'anexos');

    // Crear directorio si no existe
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);

    // Generar PDF
    await generateAnexoPDF(formData, userData, filePath);

    // Leer el PDF generado como buffer
    const pdfBuffer = fs.readFileSync(filePath);

    // Iniciar transacción para guardar todos los datos
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Guardar en tabla principal anexos
      const [result] = await connection.execute(
        `INSERT INTO anexos (IDUSUARIO, IDCONVOCATORIA, formDataJson, pdfFile, nombreArchivo) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          convocatoriaId,
          JSON.stringify(formData),
          pdfBuffer,
          fileName
        ]
      );

      const anexoId = result.insertId;

      // 2. Guardar datos personales
      if (formData.personalData) {
        const pd = formData.personalData;
        // Preparar valores en orden exacto de las columnas
        const personalDataValues = [
          anexoId,                              // IDANEXO
          pd.codigo || null,                    // codigo
          pd.nombrePuesto || null,              // nombrePuesto
          pd.tipoDocumento || 'DNI',            // tipoDocumento
          pd.dni || null,                       // dni
          pd.carnetExtranjeria || null,         // carnetExtranjeria
          pd.apellidoPaterno || null,           // apellidoPaterno
          pd.apellidoMaterno || null,           // apellidoMaterno
          pd.nombres || null,                   // nombres
          pd.genero || 'M',                     // genero
          pd.direccion || null,                 // direccion
          pd.provincia || null,                 // provincia
          pd.departamento || null,              // departamento
          pd.distrito || null,                  // distrito
          pd.departamentoId || null,            // departamentoId
          pd.provinciaId || null,               // provinciaId
          pd.distritoId || null,                // distritoId
          pd.referenciaDireccion || null,       // referenciaDireccion
          parseDate(pd.fechaNacimiento),        // fechaNacimiento
          pd.lugarNacimiento || null,           // lugarNacimiento
          pd.lugarNacimientoDepartamentoId || null,  // lugarNacimientoDepartamentoId
          pd.lugarNacimientoProvinciaId || null,     // lugarNacimientoProvinciaId
          pd.lugarNacimientoDistritoId || null,      // lugarNacimientoDistritoId
          pd.lugarNacimientoDepartamento || null,    // lugarNacimientoDepartamento
          pd.lugarNacimientoProvincia || null,       // lugarNacimientoProvincia
          pd.lugarNacimientoDistrito || null,        // lugarNacimientoDistrito
          pd.correoElectronico || null,         // correoElectronico
          pd.telefonoDomicilio || null,         // telefonoDomicilio
          pd.telefonoCelular1 || null,          // telefonoCelular1
          pd.telefonoCelular2 || null,          // telefonoCelular2
          pd.correoElectronicoAlterno || null,  // correoElectronicoAlterno
          pd.conadis || 'NO',                   // conadis
          pd.nCarnetConadis || null,            // nCarnetConadis
          pd.codigoConadis || null,             // codigoConadis
          pd.fuerzasArmadas || 'NO',            // fuerzasArmadas
          pd.nCarnetFuerzasArmadas || null,     // nCarnetFuerzasArmadas
          pd.codigoFuerzasArmadas || null,      // codigoFuerzasArmadas
          pd.asistenciaEspecial || null,        // asistenciaEspecial
          parseDate(pd.tiempoSectorPublico),    // tiempoSectorPublico
          parseDate(pd.tiempoSectorPrivado),    // tiempoSectorPrivado
          pd.colegioProfesional || null,        // colegioProfesional
          pd.colegioProfesionalHabilitado || 'NO', // colegioProfesionalHabilitado
          pd.nColegiatura || null,              // nColegiatura
          parseDate(pd.fechaVencimientoColegiatura), // fechaVencimientoColegiatura
          pd.numeroCas || null                  // numeroCas
        ];

        // Verificar que el número de valores coincida exactamente (45 valores)
        const EXPECTED_COLUMN_COUNT = 45;
        const actualValueCount = personalDataValues.length;

        console.log(`📊 Insertando datos personales: ${actualValueCount} valores (esperado: ${EXPECTED_COLUMN_COUNT})`);

        // Validar que el array tenga exactamente el número correcto de elementos
        if (actualValueCount !== EXPECTED_COLUMN_COUNT) {
          console.error(`❌ ERROR: El número de valores (${actualValueCount}) no coincide con el número de columnas (${EXPECTED_COLUMN_COUNT})`);
          console.error('📋 Valores en el array:', personalDataValues);
          throw new Error(`Error de validación: Se esperaban ${EXPECTED_COLUMN_COUNT} valores pero se encontraron ${actualValueCount}`);
        }

        // Verificar que no haya valores undefined (deben ser null)
        const hasUndefined = personalDataValues.some((val, idx) => {
          if (val === undefined) {
            console.warn(`⚠️ Valor undefined encontrado en índice ${idx}`);
            return true;
          }
          return false;
        });

        // Convertir cualquier undefined a null
        const sanitizedValues = personalDataValues.map(val => val === undefined ? null : val);

        // Construir la consulta SQL
        const insertSQL = `INSERT INTO anexos_personal_data (
            IDANEXO, codigo, nombrePuesto, tipoDocumento, dni, carnetExtranjeria,
            apellidoPaterno, apellidoMaterno, nombres, genero, direccion,
            provincia, departamento, distrito, departamentoId, provinciaId, distritoId,
            referenciaDireccion, fechaNacimiento, lugarNacimiento,
            lugarNacimientoDepartamentoId, lugarNacimientoProvinciaId, lugarNacimientoDistritoId,
            lugarNacimientoDepartamento, lugarNacimientoProvincia, lugarNacimientoDistrito,
            correoElectronico, telefonoDomicilio, telefonoCelular1, telefonoCelular2,
            correoElectronicoAlterno, conadis, nCarnetConadis, codigoConadis,
            fuerzasArmadas, nCarnetFuerzasArmadas, codigoFuerzasArmadas,
            asistenciaEspecial, tiempoSectorPublico, tiempoSectorPrivado,
            colegioProfesional, colegioProfesionalHabilitado, nColegiatura,
            fechaVencimientoColegiatura, numeroCas
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        // Contar placeholders en el SQL
        const placeholderCount = (insertSQL.match(/\?/g) || []).length;
        const valueCount = sanitizedValues.length;

        // Consultar la estructura real de la tabla para comparar
        const [columns] = await connection.execute(
          `SELECT COLUMN_NAME, ORDINAL_POSITION 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'anexos_personal_data' 
           AND COLUMN_NAME NOT IN ('IDPERSONAL', 'fechaCreacion', 'fechaActualizacion')
           ORDER BY ORDINAL_POSITION`
        );
        const actualColumnCount = columns.length;

        console.log(`📊 Validación de INSERT anexos_personal_data:`);
        console.log(`   - Columnas en tabla (excluyendo auto): ${actualColumnCount}`);
        console.log(`   - Placeholders (?) en SQL: ${placeholderCount}`);
        console.log(`   - Valores en array: ${valueCount}`);
        console.log(`   - Nombres de columnas:`, columns.map(c => c.COLUMN_NAME).join(', '));

        // Validar que todo coincida
        if (placeholderCount !== valueCount) {
          throw new Error(`❌ ERROR: Los placeholders en SQL (${placeholderCount}) no coinciden con los valores (${valueCount})`);
        }
        if (placeholderCount !== actualColumnCount) {
          throw new Error(`❌ ERROR: Los placeholders en SQL (${placeholderCount}) no coinciden con las columnas reales (${actualColumnCount})`);
        }
        if (valueCount !== actualColumnCount) {
          throw new Error(`❌ ERROR: Los valores (${valueCount}) no coinciden con las columnas reales (${actualColumnCount})`);
        }

        await connection.execute(insertSQL, sanitizedValues);
      }

      // 3. Guardar formación académica
      if (formData.academicFormation && Array.isArray(formData.academicFormation)) {
        for (const item of formData.academicFormation) {
          await connection.execute(
            `INSERT INTO anexos_academic_formation (
              IDANEXO, nivelEducativo, gradoAcademico, nombreCarrera,
              institucion, anoDesde, anoHasta, otrosNivelEspecificar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              anexoId, item.nivelEducativo || null, item.gradoAcademico || null,
              item.nombreCarrera || null, item.institucion || null,
              item.anoDesde || null, item.anoHasta || null,
              item.otrosNivelEspecificar || null
            ]
          );
        }
      }

      // 4. Guardar idiomas
      if (formData.languageSkills && Array.isArray(formData.languageSkills)) {
        for (const item of formData.languageSkills) {
          await connection.execute(
            `INSERT INTO anexos_language_skills (IDANEXO, idiomaDialecto, nivel) VALUES (?, ?, ?)`,
            [anexoId, item.idiomaDialecto || null, item.nivel || null]
          );
        }
      }

      // 5. Guardar ofimática
      if (formData.officeSkills && Array.isArray(formData.officeSkills)) {
        for (const item of formData.officeSkills) {
          await connection.execute(
            `INSERT INTO anexos_office_skills (IDANEXO, materia, nivel) VALUES (?, ?, ?)`,
            [anexoId, item.materia || null, item.nivel || null]
          );
        }
      }

      // 6. Guardar especialización
      if (formData.specializationStudies && Array.isArray(formData.specializationStudies)) {
        for (const item of formData.specializationStudies) {
          await connection.execute(
            `INSERT INTO anexos_specialization_studies (
              IDANEXO, tipoEstudio, nombreEstudio, periodoInicio,
              periodoFin, horas, centroEstudio
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              anexoId, item.tipoEstudio || null, item.nombreEstudio || null,
              item.periodoInicio || null, item.periodoFin || null,
              item.horas || null, item.centroEstudio || null
            ]
          );
        }
      }

      // 7. Guardar experiencia laboral
      if (formData.workExperience && Array.isArray(formData.workExperience)) {
        for (const item of formData.workExperience) {
          await connection.execute(
            `INSERT INTO anexos_work_experience (
              IDANEXO, empresaInstitucion, sectorGiroNegocio, puestoCargo,
              periodoDesde, periodoHasta, funcionPrincipal1, funcionPrincipal2,
              funcionPrincipal3, funcionPrincipal4, funcionPrincipal5
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              anexoId, item.empresaInstitucion || null, item.sectorGiroNegocio || null,
              item.puestoCargo || null, item.periodoDesde || null, item.periodoHasta || null,
              item.funcionPrincipal1 || null, item.funcionPrincipal2 || null,
              item.funcionPrincipal3 || null, item.funcionPrincipal4 || null,
              item.funcionPrincipal5 || null
            ]
          );
        }
      }

      // 8. Guardar referencias laborales
      if (formData.laborReferences && Array.isArray(formData.laborReferences)) {
        for (const item of formData.laborReferences) {
          await connection.execute(
            `INSERT INTO anexos_labor_references (
              IDANEXO, empresaEntidad, direccion, cargoPostulante,
              nombreCargoJefe, telefonos, correoElectronico
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              anexoId, item.empresaEntidad || null, item.direccion || null,
              item.cargoPostulante || null, item.nombreCargoJefe || null,
              item.telefonos || null, item.correoElectronico || null
            ]
          );
        }
      }

      // 9. Guardar parientes
      if (formData.relativesInUGEL && Array.isArray(formData.relativesInUGEL)) {
        for (const item of formData.relativesInUGEL) {
          await connection.execute(
            `INSERT INTO anexos_relatives (
              IDANEXO, gradoParentesco, areaTrabajo, apellidos, nombres
            ) VALUES (?, ?, ?, ?, ?)`,
            [
              anexoId, item.gradoParentesco || null, item.areaTrabajo || null,
              item.apellidos || null, item.nombres || null
            ]
          );
        }
      }

      // 10. Guardar declaraciones
      if (formData.declarations) {
        const decl = formData.declarations;
        await connection.execute(
          `INSERT INTO anexos_declarations (
            IDANEXO, infoVerdadera, fechaDeclaracion, leyProteccionDatos,
            datosConsignadosVerdaderos, plenosDerechosCiviles, cumploRequisitosMinimos,
            noCondenaDolosa, noInhabilitacion, noSentenciaCondenatoria,
            noAntecedentesPenales, noAntecedentesPoliciales, noAntecedentesJudiciales,
            noParientesUGEL, tieneParientesUGEL
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            anexoId,
            decl.infoVerdadera || false,
            null, // fechaDeclaracion eliminada
            decl.leyProteccionDatos || false,
            decl.datosConsignadosVerdaderos || false,
            decl.plenosDerechosCiviles || false,
            decl.cumploRequisitosMinimos || false,
            decl.noCondenaDolosa || false,
            decl.noInhabilitacion || false,
            decl.noSentenciaCondenatoria || false,
            decl.noAntecedentesPenales || false,
            decl.noAntecedentesPoliciales || false,
            decl.noAntecedentesJudiciales || false,
            decl.noParientesUGEL || false,
            decl.tieneParientesUGEL || 'NO'
          ]
        );
      }

      // 11. Guardar en tabla consolidada anexos_completos
      const pd = formData.personalData || {};
      const decl = formData.declarations || {};

      // Preparar arrays JSON - asegurar que sean arrays válidos (inicializar si no existen)
      // Esto garantiza que todos los datos se guarden automáticamente
      const formacionAcademicaJson = JSON.stringify(Array.isArray(formData.academicFormation) && formData.academicFormation.length > 0 ? formData.academicFormation : []);
      const idiomasJson = JSON.stringify(Array.isArray(formData.languageSkills) && formData.languageSkills.length > 0 ? formData.languageSkills : []);
      const ofimaticaJson = JSON.stringify(Array.isArray(formData.officeSkills) && formData.officeSkills.length > 0 ? formData.officeSkills : []);
      const especializacionJson = JSON.stringify(Array.isArray(formData.specializationStudies) && formData.specializationStudies.length > 0 ? formData.specializationStudies : []);
      const experienciaLaboralJson = JSON.stringify(Array.isArray(formData.workExperience) && formData.workExperience.length > 0 ? formData.workExperience : []);
      const referenciasLaboralesJson = JSON.stringify(Array.isArray(formData.laborReferences) && formData.laborReferences.length > 0 ? formData.laborReferences : []);
      const parientesUGELJson = JSON.stringify(Array.isArray(formData.relativesInUGEL) && formData.relativesInUGEL.length > 0 ? formData.relativesInUGEL : []);

      // Validar que personalData existe (pero permitir guardar otros datos aunque personalData esté incompleto)
      if (!pd || Object.keys(pd).length === 0) {
        console.warn('⚠️ Advertencia: personalData está vacío o no existe, pero se intentará guardar el anexo');
      }

      // Log detallado para debugging - mostrar todos los datos que se van a guardar
      console.log('📊 Preparando INSERT en anexos_completos:', {
        anexoId,
        userId,
        convocatoriaId,
        tienePersonalData: !!pd && Object.keys(pd).length > 0,
        tieneDeclarations: !!decl && Object.keys(decl).length > 0,
        formacionAcademicaCount: Array.isArray(formData.academicFormation) ? formData.academicFormation.length : 0,
        idiomasCount: Array.isArray(formData.languageSkills) ? formData.languageSkills.length : 0,
        ofimaticaCount: Array.isArray(formData.officeSkills) ? formData.officeSkills.length : 0,
        especializacionCount: Array.isArray(formData.specializationStudies) ? formData.specializationStudies.length : 0,
        experienciaLaboralCount: Array.isArray(formData.workExperience) ? formData.workExperience.length : 0,
        referenciasLaboralesCount: Array.isArray(formData.laborReferences) ? formData.laborReferences.length : 0,
        parientesUGELCount: Array.isArray(formData.relativesInUGEL) ? formData.relativesInUGEL.length : 0,
        formacionAcademicaJson: formacionAcademicaJson.substring(0, 100) + '...',
        idiomasJson: idiomasJson.substring(0, 100) + '...',
      });

      // Verificar la estructura real de la tabla y construir INSERT dinámico
      const [tableColumns] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'anexos_completos' 
         AND COLUMN_NAME NOT IN ('IDANEXO_COMPLETO', 'fechaCreacion', 'fechaActualizacion')
         ORDER BY ORDINAL_POSITION`
      );

      const availableColumns = tableColumns.map(col => col.COLUMN_NAME);
      console.log('📋 Columnas disponibles en anexos_completos:', availableColumns.length, 'columnas');

      // Construir el INSERT dinámicamente
      const insertColumns = [];
      const insertValues = [];

      // Mapa de todos los campos posibles
      const allFields = {
        'IDANEXO': anexoId,
        'IDUSUARIO': userId,
        'IDCONVOCATORIA': convocatoriaId,
        'codigo': pd.codigo || null,
        'nombrePuesto': pd.nombrePuesto || null,
        'tipoDocumento': pd.tipoDocumento || 'DNI',
        'dni': pd.dni || null,
        'carnetExtranjeria': pd.carnetExtranjeria || null,
        'apellidoPaterno': pd.apellidoPaterno || null,
        'apellidoMaterno': pd.apellidoMaterno || null,
        'nombres': pd.nombres || null,
        'genero': pd.genero || 'M',
        'direccion': pd.direccion || null,
        'provincia': pd.provincia || null,
        'departamento': pd.departamento || null,
        'distrito': pd.distrito || null,
        'departamentoId': pd.departamentoId || null,
        'provinciaId': pd.provinciaId || null,
        'distritoId': pd.distritoId || null,
        'referenciaDireccion': pd.referenciaDireccion || null,
        'fechaNacimiento': pd.fechaNacimiento ? parseDate(pd.fechaNacimiento) : null,
        'lugarNacimiento': pd.lugarNacimiento || null,
        'lugarNacimientoDepartamentoId': pd.lugarNacimientoDepartamentoId || null,
        'lugarNacimientoProvinciaId': pd.lugarNacimientoProvinciaId || null,
        'lugarNacimientoDistritoId': pd.lugarNacimientoDistritoId || null,
        'lugarNacimientoDepartamento': pd.lugarNacimientoDepartamento || null,
        'lugarNacimientoProvincia': pd.lugarNacimientoProvincia || null,
        'lugarNacimientoDistrito': pd.lugarNacimientoDistrito || null,
        'correoElectronico': pd.correoElectronico || null,
        'telefonoDomicilio': pd.telefonoDomicilio || null,
        'telefonoCelular1': pd.telefonoCelular1 || null,
        'telefonoCelular2': pd.telefonoCelular2 || null,
        'correoElectronicoAlterno': pd.correoElectronicoAlterno || null,
        'conadis': pd.conadis || 'NO',
        'nCarnetConadis': pd.nCarnetConadis || null,
        'codigoConadis': pd.codigoConadis || null,
        'fuerzasArmadas': pd.fuerzasArmadas || 'NO',
        'nCarnetFuerzasArmadas': pd.nCarnetFuerzasArmadas || null,
        'codigoFuerzasArmadas': pd.codigoFuerzasArmadas || null,
        'asistenciaEspecial': pd.asistenciaEspecial || null,
        'tiempoSectorPublico': pd.tiempoSectorPublico ? parseDate(pd.tiempoSectorPublico) : null,
        'tiempoSectorPrivado': pd.tiempoSectorPrivado ? parseDate(pd.tiempoSectorPrivado) : null,
        'colegioProfesional': pd.colegioProfesional || null,
        'colegioProfesionalHabilitado': pd.colegioProfesionalHabilitado || 'NO',
        'nColegiatura': pd.nColegiatura || null,
        'fechaVencimientoColegiatura': pd.fechaVencimientoColegiatura ? parseDate(pd.fechaVencimientoColegiatura) : null,
        'numeroCas': pd.numeroCas || null,
        'formacionAcademica': formacionAcademicaJson,
        'idiomas': idiomasJson,
        'ofimatica': ofimaticaJson,
        'especializacion': especializacionJson,
        'experienciaLaboral': experienciaLaboralJson,
        'referenciasLaborales': referenciasLaboralesJson,
        'parientesUGEL': parientesUGELJson,
        'veracidadDatos': decl.infoVerdadera || decl.veracidadDatos || false,
        'leyProteccionDatos': decl.leyProteccionDatos || false,
        'datosConsignadosVerdaderos': decl.datosConsignadosVerdaderos || false,
        'plenosDerechosCiviles': decl.plenosDerechosCiviles || false,
        'cumplirRequisitos': decl.cumploRequisitosMinimos || decl.cumplirRequisitos || false,
        'noCondenaDolosa': decl.noCondenaDolosa || false,
        'noEstarInhabilitado': decl.noInhabilitacion || decl.noEstarInhabilitado || false,
        'noSentenciaCondenatoria': decl.noSentenciaCondenatoria || false,
        'noAntecedentesPenales': decl.noAntecedentesPenales || false,
        'noAntecedentesPoliciales': decl.noAntecedentesPoliciales || false,
        'noAntecedentesJudiciales': decl.noAntecedentesJudiciales || false,
        'noParientesUGEL': decl.noParientesUGEL || false,
        'tieneParientesUGEL': decl.tieneParientesUGEL || 'NO',
      };

      // Agregar solo las columnas que existen en la tabla
      for (const colName of availableColumns) {
        if (allFields.hasOwnProperty(colName)) {
          insertColumns.push(colName);
          insertValues.push(allFields[colName]);
        }
      }

      // Construir y ejecutar el INSERT
      const insertPlaceholders = insertColumns.map(() => '?').join(', ');
      const insertSQL = `INSERT INTO anexos_completos (${insertColumns.join(', ')}) VALUES (${insertPlaceholders})`;

      console.log('📊 INSERT dinámico en anexos_completos:', {
        columnas: insertColumns.length,
        valores: insertValues.length,
        coinciden: insertColumns.length === insertValues.length
      });

      if (insertColumns.length !== insertValues.length) {
        throw new Error(`Error: Columnas (${insertColumns.length}) no coincide con valores (${insertValues.length})`);
      }

      await connection.execute(insertSQL, insertValues);

      // Confirmar transacción
      await connection.commit();
      connection.release();

      // Eliminar el archivo temporal ya que está guardado en la base de datos
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.warn('⚠️ No se pudo eliminar el archivo temporal:', unlinkError.message);
      }

      // Log detallado de lo que se guardó exitosamente
      console.log('✅ Anexo guardado exitosamente en la base de datos (todas las tablas incluyendo anexos_completos):', anexoId);
      console.log('✅ Resumen de datos guardados:', {
        anexoId,
        personalData: !!pd && Object.keys(pd).length > 0,
        academicFormation: Array.isArray(formData.academicFormation) ? formData.academicFormation.length : 0,
        languageSkills: Array.isArray(formData.languageSkills) ? formData.languageSkills.length : 0,
        officeSkills: Array.isArray(formData.officeSkills) ? formData.officeSkills.length : 0,
        specializationStudies: Array.isArray(formData.specializationStudies) ? formData.specializationStudies.length : 0,
        workExperience: Array.isArray(formData.workExperience) ? formData.workExperience.length : 0,
        laborReferences: Array.isArray(formData.laborReferences) ? formData.laborReferences.length : 0,
        relativesInUGEL: Array.isArray(formData.relativesInUGEL) ? formData.relativesInUGEL.length : 0,
        declarations: !!decl && Object.keys(decl).length > 0,
      });

      // Crear o actualizar registro en postulantes_registrados para Mesa de Partes
      try {
        // Asegurar que la tabla existe
        await asegurarTablaPostulantesRegistrados();
        
        // Obtener datos del usuario
        const [usuarios] = await pool.execute(
          'SELECT * FROM usuarios WHERE IDUSUARIO = ?',
          [userId]
        );
        
        if (usuarios.length > 0) {
          const usuario = usuarios[0];
          const nombreCompleto = `${pd.nombres || usuario.nombre || ''} ${pd.apellidoPaterno || usuario.apellidoPaterno || ''} ${pd.apellidoMaterno || usuario.apellidoMaterno || ''}`.trim();
          const codigoCertificado = `CERT-${userId}-${Date.now()}`;
          
          // Obtener datos de la convocatoria si existe
          let convocatoriaData = null;
          if (convocatoriaId) {
            const [convocatorias] = await pool.execute(
              'SELECT * FROM convocatorias WHERE id = ?',
              [convocatoriaId]
            );
            if (convocatorias.length > 0) {
              convocatoriaData = convocatorias[0];
            }
          }
          
          // Verificar si ya existe un registro para este usuario y convocatoria
          const [existentes] = await pool.execute(
            'SELECT * FROM postulantes_registrados WHERE IDUSUARIO = ? AND convocatoriaId = ?',
            [userId, convocatoriaId || null]
          );
          
          if (existentes.length > 0) {
            // Actualizar registro existente
            await pool.execute(
              `UPDATE postulantes_registrados 
               SET nombreCompleto = ?, apellidoPaterno = ?, apellidoMaterno = ?, 
                   dni = ?, email = ?, telefono = ?, numeroCAS = ?, puesto = ?, area = ?,
                   anexoId = ?, fechaActualizacion = NOW()
               WHERE id = ?`,
              [
                nombreCompleto,
                pd.apellidoPaterno || usuario.apellidoPaterno || null,
                pd.apellidoMaterno || usuario.apellidoMaterno || null,
                pd.dni || usuario.documento || null,
                pd.correoElectronico || usuario.correo || null,
                pd.telefonoCelular1 || usuario.telefono || null,
                pd.numeroCas || convocatoriaData?.numero_cas || convocatoriaData?.numeroCAS || null,
                pd.nombrePuesto || convocatoriaData?.puesto || null,
                convocatoriaData?.area || null,
                anexoId,
                existentes[0].id
              ]
            );
            console.log('✅ Registro de postulante actualizado en Mesa de Partes:', existentes[0].id);
          } else {
            // Crear nuevo registro
            await pool.execute(
              `INSERT INTO postulantes_registrados (
                IDUSUARIO, certificadoId, nombreCompleto, apellidoPaterno, apellidoMaterno,
                dni, email, telefono, numeroCAS, puesto, area,
                convocatoriaId, anexoId, estado, fechaRegistro
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', NOW())`,
              [
                userId,
                codigoCertificado,
                nombreCompleto,
                pd.apellidoPaterno || usuario.apellidoPaterno || null,
                pd.apellidoMaterno || usuario.apellidoMaterno || null,
                pd.dni || usuario.documento || null,
                pd.correoElectronico || usuario.correo || null,
                pd.telefonoCelular1 || usuario.telefono || null,
                pd.numeroCas || convocatoriaData?.numero_cas || convocatoriaData?.numeroCAS || null,
                pd.nombrePuesto || convocatoriaData?.puesto || null,
                convocatoriaData?.area || null,
                convocatoriaId || null,
                anexoId
              ]
            );
            console.log('✅ Registro de postulante creado en Mesa de Partes:', codigoCertificado);
            
            // Generar constancia de postulación automáticamente
            try {
              // Importar canvas dinámicamente
              const canvasModule = await import('canvas');
              const { createCanvas } = canvasModule;
              
              // Generar constancia con Canvas
              const canvas = createCanvas(1200, 848);
              const ctx = canvas.getContext('2d');
              
              // Fondo blanco
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, 1200, 848);
              
              // Marco decorativo
              ctx.strokeStyle = '#154c79';
              ctx.lineWidth = 8;
              ctx.strokeRect(20, 20, 1160, 808);
              
              ctx.strokeStyle = '#d4af37';
              ctx.lineWidth = 4;
              ctx.strokeRect(32, 32, 1136, 784);
              
              // Encabezado
              let yPos = 110;
              ctx.fillStyle = '#154c79';
              ctx.font = 'bold 32px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('UNIDAD DE GESTIÓN EDUCATIVA LOCAL TALARA', 600, yPos);
              
              yPos += 35;
              ctx.fillStyle = '#d4af37';
              ctx.font = 'bold 16px Arial';
              ctx.fillText('★ ★ ★   EXCELENCIA Y TRANSPARENCIA   ★ ★ ★', 600, yPos);
              
              // Título
              yPos += 90;
              ctx.fillStyle = '#154c79';
              ctx.font = 'bold 56px Arial';
              ctx.fillText('CONSTANCIA DE POSTULACIÓN', 600, yPos);
              
              // Línea decorativa
              yPos += 25;
              ctx.fillStyle = '#154c79';
              ctx.fillRect(350, yPos, 500, 3);
              
              // Texto introductorio
              yPos += 70;
              ctx.fillStyle = '#374151';
              ctx.font = 'normal 22px Arial';
              ctx.fillText('La Unidad de Gestión Educativa Local Talara hace constar que:', 600, yPos);
              
              // Nombre del postulante
              yPos += 70;
              ctx.fillStyle = '#154c79';
              ctx.font = 'bold 48px Arial';
              ctx.fillText(nombreCompleto.toUpperCase(), 600, yPos);
              
              // DNI
              yPos += 45;
              ctx.fillStyle = '#4b5563';
              ctx.font = 'bold 22px Arial';
              ctx.fillText(`Identificado(a) con DNI N° ${pd.dni || usuario.documento || 'N/A'}`, 600, yPos);
              
              // Texto de postulación
              yPos += 70;
              ctx.fillStyle = '#374151';
              ctx.font = 'normal 24px Arial';
              ctx.fillText('Ha completado satisfactoriamente su inscripción en el proceso de selección', 600, yPos);
              
              // Convocatoria
              yPos += 35;
              ctx.font = 'bold 24px Arial';
              ctx.fillStyle = '#154c79';
              const nombreConvocatoria = convocatoriaData ? 
                (convocatoriaData.puesto || convocatoriaData.area || convocatoriaData.titulo || 'CONVOCATORIA CAS') : 
                'CONVOCATORIA CAS';
              ctx.fillText(nombreConvocatoria.toUpperCase(), 600, yPos);
              
              // Número CAS
              if (convocatoriaData && (convocatoriaData.numeroCAS || convocatoriaData.numero_cas)) {
                yPos += 35;
                ctx.font = 'normal 20px Arial';
                ctx.fillStyle = '#4b5563';
                ctx.fillText(`N° CAS: ${convocatoriaData.numeroCAS || convocatoriaData.numero_cas}`, 600, yPos);
              }
              
              // Fecha
              const footerY = 668;
              ctx.fillStyle = '#374151';
              ctx.font = 'italic 18px Arial';
              const fecha = new Date().toLocaleDateString('es-PE', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              });
              ctx.fillText('Talara, ' + fecha, 600, footerY);
              
              // Código
              const codigoY = footerY + 60;
              ctx.fillStyle = '#f3f4f6';
              ctx.fillRect(150, codigoY - 45, 900, 90);
              ctx.strokeStyle = '#154c79';
              ctx.lineWidth = 4;
              ctx.strokeRect(150, codigoY - 45, 900, 90);
              
              ctx.fillStyle = '#154c79';
              ctx.font = 'bold 36px monospace';
              ctx.fillText(`CÓDIGO: ${codigoCertificado}`, 600, codigoY + 15);
              
              // Nota
              const notaY = 788;
              ctx.fillStyle = '#dc2626';
              ctx.font = 'bold 16px Arial';
              ctx.fillText('IMPORTANTE: Adjunte esta constancia en su expediente para Mesa de Partes.', 600, notaY);
              
              // Convertir a buffer
              const imagenBuffer = canvas.toBuffer('image/png');
              
              // Guardar la constancia en la base de datos
              await pool.execute(
                `UPDATE postulantes_registrados 
                 SET imagenConstancia = ?, archivoConstancia = ?
                 WHERE certificadoId = ?`,
                [imagenBuffer, imagenBuffer, codigoCertificado]
              );
              
              console.log('✅ Constancia de postulación generada y guardada:', codigoCertificado);
            } catch (constanciaError) {
              console.error('⚠️ Error al generar constancia (no crítico):', constanciaError.message);
            }
          }
        }
      } catch (postulanteError) {
        // No fallar la subida del anexo si hay error al crear el registro
        console.error('⚠️ Error al crear registro en postulantes_registrados:', postulanteError);
      }

      // Generar reporte de IA automáticamente (sin bloquear la respuesta)
      // Solo si hay convocatoria asociada
      if (convocatoriaId) {
        generarReporteIAAutomatico(userId, convocatoriaId, anexoId).catch(error => {
          console.error('⚠️ Error en generación automática de reporte IA (no crítico):', error.message);
        });
      }

      res.status(201).json({
        message: 'Anexo guardado exitosamente con todos los datos',
        id: anexoId,
        fileName: fileName,
        savedData: {
          personalData: !!pd && Object.keys(pd).length > 0,
          academicFormation: Array.isArray(formData.academicFormation) ? formData.academicFormation.length : 0,
          languageSkills: Array.isArray(formData.languageSkills) ? formData.languageSkills.length : 0,
          officeSkills: Array.isArray(formData.officeSkills) ? formData.officeSkills.length : 0,
          specializationStudies: Array.isArray(formData.specializationStudies) ? formData.specializationStudies.length : 0,
          workExperience: Array.isArray(formData.workExperience) ? formData.workExperience.length : 0,
          laborReferences: Array.isArray(formData.laborReferences) ? formData.laborReferences.length : 0,
          relativesInUGEL: Array.isArray(formData.relativesInUGEL) ? formData.relativesInUGEL.length : 0,
          declarations: !!decl && Object.keys(decl).length > 0,
        }
      });

    } catch (error) {
      // Revertir transacción en caso de error
      await connection.rollback();
      connection.release();

      // Log detallado del error
      console.error('❌ Error en transacción de anexo:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error sqlMessage:', error.sqlMessage);
      console.error('❌ Error sqlState:', error.sqlState);

      // Si es error de conteo de columnas, mostrar información adicional
      if (error.code === 'ER_WRONG_VALUE_COUNT_ON_ROW' && error.sql) {
        console.error('❌ SQL que causó el error:', error.sql);
        // Contar placeholders en el SQL
        const placeholderCount = (error.sql.match(/\?/g) || []).length;
        console.error(`❌ Número de placeholders (?) en SQL: ${placeholderCount}`);

        // Consultar la estructura real de la tabla para comparar
        try {
          const [columns] = await pool.execute(
            `SELECT COLUMN_NAME, ORDINAL_POSITION 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'anexos_personal_data' 
             AND COLUMN_NAME NOT IN ('IDPERSONAL', 'fechaCreacion', 'fechaActualizacion')
             ORDER BY ORDINAL_POSITION`
          );
          console.error(`❌ Columnas reales en la tabla (${columns.length}):`, columns.map(c => c.COLUMN_NAME));
        } catch (structError) {
          console.error('⚠️ No se pudo consultar la estructura de la tabla:', structError.message);
        }
      }

      throw error;
    }

  } catch (error) {
    console.error('❌ Error al guardar anexo:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Error al guardar el anexo',
      details: error.message,
      sqlError: error.sqlMessage || null,
      sqlCode: error.code || null
    });
  }
};

// Controlador para obtener anexos por usuario
export const obtenerAnexosPorUsuario = async (req, res) => {
  try {
    await ensureAnexosTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;

    const [anexos] = await pool.execute(
      `SELECT IDANEXO, IDUSUARIO, IDCONVOCATORIA, nombreArchivo, fechaCreacion 
       FROM anexos WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC`,
      [userId]
    );

    // Deshabilitar caché para asegurar datos frescos
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(anexos);
  } catch (error) {
    console.error('❌ Error al obtener anexos:', error);
    res.status(500).json({
      error: 'Error al obtener anexos',
      details: error.message
    });
  }
};

// Controlador para obtener anexos filtrados por usuario (query params)
export const obtenerAnexosFiltrados = async (req, res) => {
  try {
    await ensureAnexosTable();

    const { IDUSUARIO } = req.query;

    if (!IDUSUARIO) {
      return res.status(400).json({ error: 'IDUSUARIO es requerido' });
    }

    const [anexos] = await pool.execute(
      `SELECT IDANEXO, IDUSUARIO, IDCONVOCATORIA, nombreArchivo, fechaCreacion 
       FROM anexos WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC`,
      [IDUSUARIO]
    );

    // Deshabilitar caché
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(anexos);
  } catch (error) {
    console.error('❌ Error al obtener anexos filtrados:', error);
    res.status(500).json({
      error: 'Error al obtener anexos filtrados',
      details: error.message
    });
  }
};

// Controlador para obtener datos completos de un anexo guardado
export const obtenerAnexoCompleto = async (req, res) => {
  try {
    await ensureAllAnexosTables();
    await ensureAnexosCompletosTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId || req.query.anexoId;

    if (!anexoId) {
      return res.status(400).json({ error: 'ID de anexo requerido' });
    }

    // PRIMERO: Intentar obtener desde anexos_completos (tiene todos los datos consolidados)
    let anexosCompletos = [];
    try {
      const [anexosCompletosResult] = await pool.execute(
        `SELECT * FROM anexos_completos WHERE IDANEXO = ? AND IDUSUARIO = ?`,
        [anexoId, userId]
      );
      anexosCompletos = anexosCompletosResult || [];
    } catch (err) {
      console.warn('⚠️ Error al obtener anexos_completos (continuando):', err.message);
      anexosCompletos = [];
    }

    // Obtener datos de TODAS las tablas relacionadas con manejo de errores individual
    let personalDataFromTables = [];
    let academicFormationFromTables = [];
    let languageSkillsFromTables = [];
    let officeSkillsFromTables = [];
    let specializationStudiesFromTables = [];
    let workExperienceFromTables = [];
    let laborReferencesFromTables = [];
    let relativesFromTables = [];
    let declarationsFromTables = [];

    try {
      const [personalData] = await pool.execute(
        'SELECT * FROM anexos_personal_data WHERE IDANEXO = ?',
        [anexoId]
      );
      personalDataFromTables = personalData || [];
    } catch (err) {
      console.warn('⚠️ Error al obtener personalData (continuando):', err.message);
      personalDataFromTables = [];
    }

    try {
      const [academicFormation] = await pool.execute(
        'SELECT * FROM anexos_academic_formation WHERE IDANEXO = ? ORDER BY fechaCreacion ASC',
        [anexoId]
      );
      academicFormationFromTables = academicFormation || [];
    } catch (err) {
      console.warn('⚠️ Error al obtener academicFormation (continuando):', err.message);
      academicFormationFromTables = [];
    }

    try {
      const [languageSkills] = await pool.execute(
        'SELECT * FROM anexos_language_skills WHERE IDANEXO = ? ORDER BY fechaCreacion ASC',
        [anexoId]
      );
      languageSkillsFromTables = languageSkills || [];
    } catch (err) {
      console.warn('⚠️ Error al obtener languageSkills (continuando):', err.message);
      languageSkillsFromTables = [];
    }

    try {
      const [officeSkills] = await pool.execute(
        'SELECT * FROM anexos_office_skills WHERE IDANEXO = ? ORDER BY fechaCreacion ASC',
        [anexoId]
      );
      officeSkillsFromTables = officeSkills || [];
    } catch (err) {
      console.warn('⚠️ Error al obtener officeSkills (continuando):', err.message);
      officeSkillsFromTables = [];
    }

    try {
      const [specializationStudies] = await pool.execute(
        'SELECT * FROM anexos_specialization_studies WHERE IDANEXO = ? ORDER BY fechaCreacion ASC',
        [anexoId]
      );
      specializationStudiesFromTables = specializationStudies || [];
    } catch (err) {
      console.warn('⚠️ Error al obtener specializationStudies (continuando):', err.message);
      specializationStudiesFromTables = [];
    }

    try {
      const [workExperience] = await pool.execute(
        'SELECT * FROM anexos_work_experience WHERE IDANEXO = ? ORDER BY fechaCreacion ASC',
        [anexoId]
      );
      workExperienceFromTables = workExperience || [];
    } catch (err) {
      console.warn('⚠️ Error al obtener workExperience (continuando):', err.message);
      workExperienceFromTables = [];
    }

    try {
      const [laborReferences] = await pool.execute(
        'SELECT * FROM anexos_labor_references WHERE IDANEXO = ? ORDER BY fechaCreacion ASC',
        [anexoId]
      );
      laborReferencesFromTables = laborReferences || [];
    } catch (err) {
      console.warn('⚠️ Error al obtener laborReferences (continuando):', err.message);
      laborReferencesFromTables = [];
    }

    try {
      const [relatives] = await pool.execute(
        'SELECT * FROM anexos_relatives WHERE IDANEXO = ? ORDER BY fechaCreacion ASC',
        [anexoId]
      );
      relativesFromTables = relatives || [];
    } catch (err) {
      console.warn('⚠️ Error al obtener relatives (continuando):', err.message);
      relativesFromTables = [];
    }

    try {
      const [declarations] = await pool.execute(
        'SELECT * FROM anexos_declarations WHERE IDANEXO = ?',
        [anexoId]
      );
      declarationsFromTables = declarations || [];
    } catch (err) {
      console.warn('⚠️ Error al obtener declarations (continuando):', err.message);
      declarationsFromTables = [];
    }

    // Si existe en anexos_completos, usar como base, sino usar datos de tablas normalizadas
    if (anexosCompletos.length > 0) {
      const anexoCompleto = anexosCompletos[0];
      console.log('✅ Anexo encontrado en anexos_completos, consolidando con datos de tablas normalizadas');

      // Función helper para parsear JSON de anexos_completos (más robusta)
      const parseJson = (value) => {
        if (!value) return [];
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch (e) {
            console.error('Error parsing JSON string:', e);
            return [];
          }
        }
        if (Buffer.isBuffer(value)) {
          try {
            const bufferString = value.toString('utf8');
            const parsed = JSON.parse(bufferString);
            return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch (e) {
            console.error('Error parsing Buffer JSON:', e);
            return [];
          }
        }
        if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
          try {
            const bufferString = Buffer.from(value.data).toString('utf8');
            const parsed = JSON.parse(bufferString);
            return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch (e) {
            console.error('Error parsing Buffer object JSON:', e);
            return [];
          }
        }
        if (Array.isArray(value)) {
          return value;
        }
        if (typeof value === 'object') {
          return [value];
        }
        return [];
      };

      // Función helper para convertir Buffer a string
      const bufferToString = (value) => {
        if (!value) return '';
        if (Buffer.isBuffer(value)) {
          return value.toString('utf8');
        }
        if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
          return Buffer.from(value.data).toString('utf8');
        }
        if (typeof value === 'string') {
          return value;
        }
        return String(value);
      };

      // Priorizar datos de tablas normalizadas si existen, sino usar de anexos_completos
      const pd = personalDataFromTables.length > 0 ? personalDataFromTables[0] : {};
      const formDataJson = {};

      try {
        const [anexoBase] = await pool.execute(
          'SELECT formDataJson FROM anexos WHERE IDANEXO = ?',
          [anexoId]
        );
        if (anexoBase.length > 0 && anexoBase[0].formDataJson) {
          formDataJson.parsed = typeof anexoBase[0].formDataJson === 'string'
            ? JSON.parse(anexoBase[0].formDataJson)
            : anexoBase[0].formDataJson;
        }
      } catch (e) {
        console.warn('Error al parsear formDataJson:', e);
      }

      // Priorizar anexos_completos, luego tablas normalizadas
      // Primero intentar parsear desde anexos_completos
      const academicFromAnexosCompletos = parseJson(anexoCompleto.formacionAcademica);
      console.log('📚 Datos de formacionAcademica desde anexos_completos:', {
        raw: anexoCompleto.formacionAcademica,
        parsed: academicFromAnexosCompletos,
        cantidad: academicFromAnexosCompletos.length
      });

      // Si hay datos en anexos_completos, usarlos; sino usar tablas normalizadas
      const academicFromTables = academicFromAnexosCompletos.length > 0
        ? academicFromAnexosCompletos.map(item => ({
          nivelEducativo: item.nivelEducativo || '',
          nombreGrado: item.gradoAcademico || item.nombreGrado || '',
          nombreCarrera: item.nombreCarrera || '',
          nombreInstitucion: item.institucion || item.nombreInstitucion || '',
          fechaInicio: item.anoDesde || item.fechaInicio || '',
          fechaFin: item.anoHasta || item.fechaFin || '',
          tieneTitulo: item.tieneTitulo || false,
          nombreTitulo: item.nombreTitulo || '',
          numeroColegiatura: item.numeroColegiatura || '',
          otrosNivelEspecificar: item.otrosNivelEspecificar || '',
        }))
        : (academicFormationFromTables.length > 0 ? academicFormationFromTables.map(item => ({
          nivelEducativo: item.nivelEducativo || '',
          nombreGrado: item.gradoAcademico || item.nombreGrado || '',
          nombreCarrera: item.nombreCarrera || '',
          nombreInstitucion: item.institucion || item.nombreInstitucion || '',
          fechaInicio: item.anoDesde || item.fechaInicio || '',
          fechaFin: item.anoHasta || item.fechaFin || '',
          tieneTitulo: item.tieneTitulo || false,
          nombreTitulo: item.nombreTitulo || '',
          numeroColegiatura: item.numeroColegiatura || '',
          otrosNivelEspecificar: item.otrosNivelEspecificar || '',
        })) : []);

      console.log('📚 academicFromTables mapeado:', {
        cantidad: academicFromTables.length,
        datos: academicFromTables
      });

      // Priorizar anexos_completos para idiomas
      const languagesFromAnexosCompletos = parseJson(anexoCompleto.idiomas);
      console.log('🌐 Datos de idiomas desde anexos_completos:', {
        raw: anexoCompleto.idiomas,
        parsed: languagesFromAnexosCompletos,
        cantidad: languagesFromAnexosCompletos.length
      });

      const languagesFromTables = languagesFromAnexosCompletos.length > 0
        ? languagesFromAnexosCompletos.map(item => ({
          idioma: item.idioma || item.idiomaDialecto || '',
          nivel: item.nivel || 'Básico',
          institutoCertificador: item.institutoCertificador || '',
          numeroCertificado: item.numeroCertificado || '',
        }))
        : (languageSkillsFromTables.length > 0 ? languageSkillsFromTables.map(item => ({
          idioma: item.idiomaDialecto || item.idioma || '',
          nivel: item.nivel || 'Básico',
          institutoCertificador: item.institutoCertificador || '',
          numeroCertificado: item.numeroCertificado || '',
        })) : []);

      console.log('🌐 languagesFromTables mapeado:', {
        cantidad: languagesFromTables.length,
        datos: languagesFromTables
      });

      // Priorizar anexos_completos para ofimática
      const officeFromAnexosCompletos = parseJson(anexoCompleto.ofimatica);
      console.log('💻 Datos de ofimatica desde anexos_completos:', {
        raw: anexoCompleto.ofimatica,
        parsed: officeFromAnexosCompletos,
        cantidad: officeFromAnexosCompletos.length
      });

      const officeFromTables = officeFromAnexosCompletos.length > 0
        ? officeFromAnexosCompletos.map(item => ({
          programa: item.programa || item.materia || '',
          nivel: item.nivel || 'Básico',
        }))
        : (officeSkillsFromTables.length > 0 ? officeSkillsFromTables.map(item => ({
          programa: item.materia || item.programa || '',
          nivel: item.nivel || 'Básico',
        })) : []);

      console.log('💻 officeFromTables mapeado:', {
        cantidad: officeFromTables.length,
        datos: officeFromTables
      });

      // Priorizar anexos_completos para especialización
      const specializationFromAnexosCompletos = parseJson(anexoCompleto.especializacion);
      console.log('🎓 Datos de especializacion desde anexos_completos:', {
        raw: anexoCompleto.especializacion,
        parsed: specializationFromAnexosCompletos,
        cantidad: specializationFromAnexosCompletos.length
      });

      const specializationFromTables = specializationFromAnexosCompletos.length > 0
        ? specializationFromAnexosCompletos.map(item => ({
          tipoEstudio: item.tipoEstudio || '',
          nombreEspecializacion: item.nombreEspecializacion || item.nombreEstudio || '',
          institucion: item.institucion || item.centroEstudio || '',
          fechaInicio: item.fechaInicio || item.periodoInicio || '',
          fechaFin: item.fechaFin || item.periodoFin || '',
          horasAcademicas: item.horasAcademicas || item.horas || '',
        }))
        : (specializationStudiesFromTables.length > 0 ? specializationStudiesFromTables.map(item => ({
          tipoEstudio: item.tipoEstudio || '',
          nombreEspecializacion: item.nombreEspecializacion || item.nombreEstudio || '',
          institucion: item.institucion || item.centroEstudio || '',
          fechaInicio: item.fechaInicio || item.periodoInicio || '',
          fechaFin: item.fechaFin || item.periodoFin || '',
          horasAcademicas: item.horasAcademicas || item.horas || '',
        })) : []);

      // Helper para parsear JSON de anexos_completos
      const parseJsonFromAnexosCompletos = (value) => {
        if (!value) return [];
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch (e) {
            console.error('Error parsing JSON string:', e);
            return [];
          }
        }
        if (Buffer.isBuffer(value)) {
          try {
            const bufferString = value.toString('utf8');
            const parsed = JSON.parse(bufferString);
            return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch (e) {
            console.error('Error parsing Buffer JSON:', e);
            return [];
          }
        }
        if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
          try {
            const bufferString = Buffer.from(value.data).toString('utf8');
            const parsed = JSON.parse(bufferString);
            return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch (e) {
            console.error('Error parsing Buffer object JSON:', e);
            return [];
          }
        }
        if (Array.isArray(value)) {
          return value;
        }
        if (typeof value === 'object') {
          return [value];
        }
        return [];
      };

      // Priorizar anexos_completos para experiencia laboral
      const workFromAnexosCompletos = parseJsonFromAnexosCompletos(anexoCompleto.experienciaLaboral);
      console.log('💼 Datos de experienciaLaboral desde anexos_completos:', {
        raw: anexoCompleto.experienciaLaboral,
        parsed: workFromAnexosCompletos,
        cantidad: workFromAnexosCompletos.length
      });

      const workFromTables = workFromAnexosCompletos.length > 0
        ? workFromAnexosCompletos.map(item => ({
          empresaEntidad: item.empresaEntidad || item.empresaInstitucion || '',
          cargo: item.cargo || item.puestoCargo || '',
          fechaInicio: item.fechaInicio || item.periodoDesde || '',
          fechaFin: item.fechaFin || item.periodoHasta || '',
          funciones: item.funciones || '',
          sector: item.sector || item.sectorGiroNegocio || '',
          funcionPrincipal1: item.funcionPrincipal1 || '',
          funcionPrincipal2: item.funcionPrincipal2 || '',
          funcionPrincipal3: item.funcionPrincipal3 || '',
          funcionPrincipal4: item.funcionPrincipal4 || '',
          funcionPrincipal5: item.funcionPrincipal5 || '',
        }))
        : (workExperienceFromTables.length > 0 ? workExperienceFromTables.map(item => {
          // Combinar funciones principales en un solo campo de texto
          const funcionesArray = [
            item.funcionPrincipal1,
            item.funcionPrincipal2,
            item.funcionPrincipal3,
            item.funcionPrincipal4,
            item.funcionPrincipal5
          ].filter(f => f && f.trim() !== '');
          const funciones = funcionesArray.join('\n');

          return {
            empresaEntidad: item.empresaInstitucion || item.empresaEntidad || '',
            cargo: item.puestoCargo || item.cargo || '',
            fechaInicio: item.periodoDesde || item.fechaInicio || '',
            fechaFin: item.periodoHasta || item.fechaFin || '',
            funciones: funciones || item.funciones || '',
            sector: item.sectorGiroNegocio || item.sector || '',
            funcionPrincipal1: item.funcionPrincipal1 || '',
            funcionPrincipal2: item.funcionPrincipal2 || '',
            funcionPrincipal3: item.funcionPrincipal3 || '',
            funcionPrincipal4: item.funcionPrincipal4 || '',
            funcionPrincipal5: item.funcionPrincipal5 || '',
          };
        }) : []);

      console.log('💼 workFromTables mapeado:', {
        cantidad: workFromTables.length,
        datos: workFromTables
      });

      // Priorizar anexos_completos para referencias laborales
      const refsFromAnexosCompletos = parseJsonFromAnexosCompletos(anexoCompleto.referenciasLaborales);
      console.log('📞 Datos de referenciasLaborales desde anexos_completos:', {
        raw: anexoCompleto.referenciasLaborales,
        parsed: refsFromAnexosCompletos,
        cantidad: refsFromAnexosCompletos.length
      });

      const refsFromTables = refsFromAnexosCompletos.length > 0
        ? refsFromAnexosCompletos.map(item => ({
          empresaEntidad: item.empresaEntidad || '',
          direccion: item.direccion || '',
          cargoPostulante: item.cargoPostulante || '',
          nombreCargoJefe: item.nombreCargoJefe || '',
          telefonos: item.telefonos || '',
          correoElectronico: item.correoElectronico || '',
        }))
        : (laborReferencesFromTables.length > 0 ? laborReferencesFromTables.map(item => ({
          empresaEntidad: item.empresaEntidad || '',
          direccion: item.direccion || '',
          cargoPostulante: item.cargoPostulante || '',
          nombreCargoJefe: item.nombreCargoJefe || '',
          telefonos: item.telefonos || '',
          correoElectronico: item.correoElectronico || '',
        })) : []);

      const relativesConsolidated = relativesFromTables.length > 0 ? relativesFromTables.map(item => ({
        parentesco: item.parentesco || '',
        nombresCompletos: item.nombresCompletos || '',
        cargo: item.cargo || '',
      })) : parseJsonFromAnexosCompletos(anexoCompleto.parientesUGEL);

      // Consolidar personalData: usar de tabla normalizada si existe, sino de anexos_completos
      const personalDataConsolidated = personalDataFromTables.length > 0 ? {
        codigo: pd.codigo || anexoCompleto.codigo || formDataJson.parsed?.personalData?.codigo || '',
        nombrePuesto: pd.nombrePuesto || anexoCompleto.nombrePuesto || formDataJson.parsed?.personalData?.nombrePuesto || '',
        numeroCas: pd.numeroCas || anexoCompleto.numeroCas || formDataJson.parsed?.personalData?.numeroCas || '',
        tipoDocumento: pd.tipoDocumento || anexoCompleto.tipoDocumento || formDataJson.parsed?.personalData?.tipoDocumento || 'DNI',
        dni: pd.dni || anexoCompleto.dni || formDataJson.parsed?.personalData?.dni || '',
        carnetExtranjeria: pd.carnetExtranjeria || anexoCompleto.carnetExtranjeria || formDataJson.parsed?.personalData?.carnetExtranjeria || '',
        apellidoPaterno: pd.apellidoPaterno || anexoCompleto.apellidoPaterno || formDataJson.parsed?.personalData?.apellidoPaterno || '',
        apellidoMaterno: pd.apellidoMaterno || anexoCompleto.apellidoMaterno || formDataJson.parsed?.personalData?.apellidoMaterno || '',
        nombres: pd.nombres || anexoCompleto.nombres || formDataJson.parsed?.personalData?.nombres || '',
        genero: pd.genero || anexoCompleto.genero || formDataJson.parsed?.personalData?.genero || 'M',
        direccion: bufferToString(pd.direccion || anexoCompleto.direccion || formDataJson.parsed?.personalData?.direccion || ''),
        provincia: pd.provincia || anexoCompleto.provincia || formDataJson.parsed?.personalData?.provincia || '',
        departamento: pd.departamento || anexoCompleto.departamento || formDataJson.parsed?.personalData?.departamento || '',
        distrito: pd.distrito || anexoCompleto.distrito || formDataJson.parsed?.personalData?.distrito || '',
        departamentoId: pd.departamentoId || anexoCompleto.departamentoId || formDataJson.parsed?.personalData?.departamentoId || '',
        provinciaId: pd.provinciaId || anexoCompleto.provinciaId || formDataJson.parsed?.personalData?.provinciaId || '',
        distritoId: pd.distritoId || anexoCompleto.distritoId || formDataJson.parsed?.personalData?.distritoId || '',
        referenciaDireccion: pd.referenciaDireccion || anexoCompleto.referenciaDireccion || formDataJson.parsed?.personalData?.referenciaDireccion || '',
        fechaNacimiento: pd.fechaNacimiento ? new Date(pd.fechaNacimiento).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (anexoCompleto.fechaNacimiento ? new Date(anexoCompleto.fechaNacimiento).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (formDataJson.parsed?.personalData?.fechaNacimiento || '')),
        lugarNacimiento: pd.lugarNacimiento || anexoCompleto.lugarNacimiento || formDataJson.parsed?.personalData?.lugarNacimiento || '',
        lugarNacimientoDepartamentoId: pd.lugarNacimientoDepartamentoId || anexoCompleto.lugarNacimientoDepartamentoId || formDataJson.parsed?.personalData?.lugarNacimientoDepartamentoId || '',
        lugarNacimientoProvinciaId: pd.lugarNacimientoProvinciaId || anexoCompleto.lugarNacimientoProvinciaId || formDataJson.parsed?.personalData?.lugarNacimientoProvinciaId || '',
        lugarNacimientoDistritoId: pd.lugarNacimientoDistritoId || anexoCompleto.lugarNacimientoDistritoId || formDataJson.parsed?.personalData?.lugarNacimientoDistritoId || '',
        lugarNacimientoDepartamento: pd.lugarNacimientoDepartamento || anexoCompleto.lugarNacimientoDepartamento || formDataJson.parsed?.personalData?.lugarNacimientoDepartamento || '',
        lugarNacimientoProvincia: pd.lugarNacimientoProvincia || anexoCompleto.lugarNacimientoProvincia || formDataJson.parsed?.personalData?.lugarNacimientoProvincia || '',
        lugarNacimientoDistrito: pd.lugarNacimientoDistrito || anexoCompleto.lugarNacimientoDistrito || formDataJson.parsed?.personalData?.lugarNacimientoDistrito || '',
        correoElectronico: pd.correoElectronico || anexoCompleto.correoElectronico || formDataJson.parsed?.personalData?.correoElectronico || '',
        telefonoDomicilio: pd.telefonoDomicilio || anexoCompleto.telefonoDomicilio || formDataJson.parsed?.personalData?.telefonoDomicilio || '',
        telefonoCelular1: pd.telefonoCelular1 || anexoCompleto.telefonoCelular1 || formDataJson.parsed?.personalData?.telefonoCelular1 || '',
        telefonoCelular2: pd.telefonoCelular2 || anexoCompleto.telefonoCelular2 || formDataJson.parsed?.personalData?.telefonoCelular2 || '',
        correoElectronicoAlterno: pd.correoElectronicoAlterno || anexoCompleto.correoElectronicoAlterno || formDataJson.parsed?.personalData?.correoElectronicoAlterno || '',
        conadis: pd.conadis || anexoCompleto.conadis || formDataJson.parsed?.personalData?.conadis || 'NO',
        nCarnetConadis: pd.nCarnetConadis || anexoCompleto.nCarnetConadis || formDataJson.parsed?.personalData?.nCarnetConadis || '',
        codigoConadis: pd.codigoConadis || anexoCompleto.codigoConadis || formDataJson.parsed?.personalData?.codigoConadis || '',
        fuerzasArmadas: pd.fuerzasArmadas || anexoCompleto.fuerzasArmadas || formDataJson.parsed?.personalData?.fuerzasArmadas || 'NO',
        nCarnetFuerzasArmadas: pd.nCarnetFuerzasArmadas || anexoCompleto.nCarnetFuerzasArmadas || formDataJson.parsed?.personalData?.nCarnetFuerzasArmadas || '',
        codigoFuerzasArmadas: pd.codigoFuerzasArmadas || anexoCompleto.codigoFuerzasArmadas || formDataJson.parsed?.personalData?.codigoFuerzasArmadas || '',
        asistenciaEspecial: pd.asistenciaEspecial || anexoCompleto.asistenciaEspecial || formDataJson.parsed?.personalData?.asistenciaEspecial || '',
        tiempoSectorPublico: pd.tiempoSectorPublico ? new Date(pd.tiempoSectorPublico).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (anexoCompleto.tiempoSectorPublico ? new Date(anexoCompleto.tiempoSectorPublico).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (formDataJson.parsed?.personalData?.tiempoSectorPublico || '')),
        tiempoSectorPrivado: pd.tiempoSectorPrivado ? new Date(pd.tiempoSectorPrivado).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (anexoCompleto.tiempoSectorPrivado ? new Date(anexoCompleto.tiempoSectorPrivado).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (formDataJson.parsed?.personalData?.tiempoSectorPrivado || '')),
        colegioProfesional: pd.colegioProfesional || anexoCompleto.colegioProfesional || formDataJson.parsed?.personalData?.colegioProfesional || '',
        colegioProfesionalHabilitado: pd.colegioProfesionalHabilitado || anexoCompleto.colegioProfesionalHabilitado || formDataJson.parsed?.personalData?.colegioProfesionalHabilitado || 'NO',
        nColegiatura: pd.nColegiatura || anexoCompleto.nColegiatura || formDataJson.parsed?.personalData?.nColegiatura || '',
        fechaVencimientoColegiatura: pd.fechaVencimientoColegiatura ? new Date(pd.fechaVencimientoColegiatura).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (anexoCompleto.fechaVencimientoColegiatura ? new Date(anexoCompleto.fechaVencimientoColegiatura).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (formDataJson.parsed?.personalData?.fechaVencimientoColegiatura || '')),
      } : {
        // Si no hay datos en tablas normalizadas, usar solo de anexos_completos
        codigo: anexoCompleto.codigo || '',
        nombrePuesto: anexoCompleto.nombrePuesto || '',
        numeroCas: anexoCompleto.numeroCas || '',
        tipoDocumento: anexoCompleto.tipoDocumento || 'DNI',
        dni: anexoCompleto.dni || '',
        carnetExtranjeria: anexoCompleto.carnetExtranjeria || '',
        apellidoPaterno: anexoCompleto.apellidoPaterno || '',
        apellidoMaterno: anexoCompleto.apellidoMaterno || '',
        nombres: anexoCompleto.nombres || '',
        genero: anexoCompleto.genero || 'M',
        direccion: bufferToString(anexoCompleto.direccion || ''),
        provincia: anexoCompleto.provincia || '',
        departamento: anexoCompleto.departamento || '',
        distrito: anexoCompleto.distrito || '',
        departamentoId: anexoCompleto.departamentoId || '',
        provinciaId: anexoCompleto.provinciaId || '',
        distritoId: anexoCompleto.distritoId || '',
        referenciaDireccion: anexoCompleto.referenciaDireccion || '',
        fechaNacimiento: anexoCompleto.fechaNacimiento ? new Date(anexoCompleto.fechaNacimiento).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : '',
        lugarNacimiento: anexoCompleto.lugarNacimiento || '',
        lugarNacimientoDepartamentoId: anexoCompleto.lugarNacimientoDepartamentoId || '',
        lugarNacimientoProvinciaId: anexoCompleto.lugarNacimientoProvinciaId || '',
        lugarNacimientoDistritoId: anexoCompleto.lugarNacimientoDistritoId || '',
        lugarNacimientoDepartamento: anexoCompleto.lugarNacimientoDepartamento || '',
        lugarNacimientoProvincia: anexoCompleto.lugarNacimientoProvincia || '',
        lugarNacimientoDistrito: anexoCompleto.lugarNacimientoDistrito || '',
        correoElectronico: anexoCompleto.correoElectronico || '',
        telefonoDomicilio: anexoCompleto.telefonoDomicilio || '',
        telefonoCelular1: anexoCompleto.telefonoCelular1 || '',
        telefonoCelular2: anexoCompleto.telefonoCelular2 || '',
        correoElectronicoAlterno: anexoCompleto.correoElectronicoAlterno || '',
        conadis: anexoCompleto.conadis || 'NO',
        nCarnetConadis: anexoCompleto.nCarnetConadis || '',
        codigoConadis: anexoCompleto.codigoConadis || '',
        fuerzasArmadas: anexoCompleto.fuerzasArmadas || 'NO',
        nCarnetFuerzasArmadas: anexoCompleto.nCarnetFuerzasArmadas || '',
        codigoFuerzasArmadas: anexoCompleto.codigoFuerzasArmadas || '',
        asistenciaEspecial: anexoCompleto.asistenciaEspecial || '',
        tiempoSectorPublico: anexoCompleto.tiempoSectorPublico ? new Date(anexoCompleto.tiempoSectorPublico).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : '',
        tiempoSectorPrivado: anexoCompleto.tiempoSectorPrivado ? new Date(anexoCompleto.tiempoSectorPrivado).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : '',
        colegioProfesional: anexoCompleto.colegioProfesional || '',
        colegioProfesionalHabilitado: anexoCompleto.colegioProfesionalHabilitado || 'NO',
        nColegiatura: anexoCompleto.nColegiatura || '',
        fechaVencimientoColegiatura: anexoCompleto.fechaVencimientoColegiatura ? new Date(anexoCompleto.fechaVencimientoColegiatura).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : '',
      };

      // Consolidar declaraciones: usar de tabla normalizada si existe, sino de anexos_completos
      const decl = declarationsFromTables.length > 0 ? declarationsFromTables[0] : {};
      const declarationsConsolidated = {
        infoVerdadera: Boolean(decl.infoVerdadera || anexoCompleto.veracidadDatos || false),
        leyProteccionDatos: Boolean(decl.leyProteccionDatos || anexoCompleto.leyProteccionDatos || false),
        datosConsignadosVerdaderos: Boolean(decl.datosConsignadosVerdaderos || anexoCompleto.datosConsignadosVerdaderos || false),
        plenosDerechosCiviles: Boolean(decl.plenosDerechosCiviles || anexoCompleto.plenosDerechosCiviles || false),
        cumploRequisitosMinimos: Boolean(decl.cumploRequisitosMinimos || decl.cumplirRequisitos || anexoCompleto.cumplirRequisitos || false),
        noCondenaDolosa: Boolean(decl.noCondenaDolosa || anexoCompleto.noCondenaDolosa || false),
        noInhabilitacion: Boolean(decl.noInhabilitacion || decl.noEstarInhabilitado || anexoCompleto.noEstarInhabilitado || false),
        noSentenciaCondenatoria: Boolean(decl.noSentenciaCondenatoria || anexoCompleto.noSentenciaCondenatoria || false),
        noAntecedentesPenales: Boolean(decl.noAntecedentesPenales || anexoCompleto.noAntecedentesPenales || false),
        noAntecedentesPoliciales: Boolean(decl.noAntecedentesPoliciales || anexoCompleto.noAntecedentesPoliciales || false),
        noAntecedentesJudiciales: Boolean(decl.noAntecedentesJudiciales || anexoCompleto.noAntecedentesJudiciales || false),
        noParientesUGEL: Boolean(decl.noParientesUGEL || anexoCompleto.noParientesUGEL || false),
        tieneParientesUGEL: decl.tieneParientesUGEL || anexoCompleto.tieneParientesUGEL || 'NO',
      };

      // Construir respuesta con TODOS los datos consolidados de TODAS las tablas
      const anexoCompletoResponse = {
        id: anexoCompleto.IDANEXO,
        IDANEXO_COMPLETO: anexoCompleto.IDANEXO_COMPLETO,
        convocatoriaId: anexoCompleto.IDCONVOCATORIA,
        formData: {
          personalData: personalDataConsolidated,
          // Usar datos de tablas normalizadas si existen, sino usar de anexos_completos
          academicFormation: academicFromTables,
          languageSkills: languagesFromTables,
          officeSkills: officeFromTables,
          specializationStudies: specializationFromTables,
          workExperience: workFromTables,
          laborReferences: refsFromTables,
          relativesInUGEL: relativesConsolidated,
          declarations: declarationsConsolidated,
        },
        fechaCreacion: anexoCompleto.fechaCreacion,
      };

      console.log('✅ Anexo completo desde anexos_completos:', {
        academicFormation: anexoCompletoResponse.formData.academicFormation.length,
        languageSkills: anexoCompletoResponse.formData.languageSkills.length,
        officeSkills: anexoCompletoResponse.formData.officeSkills.length,
        specializationStudies: anexoCompletoResponse.formData.specializationStudies.length,
        workExperience: anexoCompletoResponse.formData.workExperience.length,
        laborReferences: anexoCompletoResponse.formData.laborReferences.length,
        academicFormationData: anexoCompletoResponse.formData.academicFormation,
        languageSkillsData: anexoCompletoResponse.formData.languageSkills,
        officeSkillsData: anexoCompletoResponse.formData.officeSkills,
        workExperienceData: anexoCompletoResponse.formData.workExperience,
      });

      return res.json(anexoCompletoResponse);
    }

    // FALLBACK: Si no está en anexos_completos, usar las tablas normalizadas que ya obtuvimos
    // Verificar que el anexo pertenece al usuario
    const [anexos] = await pool.execute(
      'SELECT IDANEXO, IDUSUARIO, IDCONVOCATORIA, formDataJson FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const anexo = anexos[0];

    // Parsear el JSON del formData
    let formDataJsonFallback;
    try {
      formDataJsonFallback = typeof anexo.formDataJson === 'string'
        ? JSON.parse(anexo.formDataJson)
        : anexo.formDataJson;
    } catch (error) {
      console.error('Error al parsear formDataJson:', error);
      formDataJsonFallback = {};
    }

    // Usar los datos de tablas normalizadas que ya obtuvimos antes del if

    // Construir objeto completo con datos de todas las tablas
    // Mapear personalData con todos los campos necesarios
    const pdFallback = personalDataFromTables.length > 0 ? personalDataFromTables[0] : {};
    const personalDataMapped = {
      codigo: pdFallback.codigo || formDataJsonFallback.personalData?.codigo || '',
      nombrePuesto: pdFallback.nombrePuesto || formDataJsonFallback.personalData?.nombrePuesto || '',
      numeroCas: pdFallback.numeroCas || formDataJsonFallback.personalData?.numeroCas || '',
      tipoDocumento: pdFallback.tipoDocumento || formDataJsonFallback.personalData?.tipoDocumento || 'DNI',
      dni: pdFallback.dni || formDataJsonFallback.personalData?.dni || '',
      carnetExtranjeria: pdFallback.carnetExtranjeria || formDataJsonFallback.personalData?.carnetExtranjeria || '',
      apellidoPaterno: pdFallback.apellidoPaterno || formDataJsonFallback.personalData?.apellidoPaterno || '',
      apellidoMaterno: pdFallback.apellidoMaterno || formDataJsonFallback.personalData?.apellidoMaterno || '',
      nombres: pdFallback.nombres || formDataJsonFallback.personalData?.nombres || '',
      genero: pdFallback.genero || formDataJsonFallback.personalData?.genero || 'M',
      direccion: (() => {
        const dir = pdFallback.direccion || formDataJsonFallback.personalData?.direccion || '';
        if (Buffer.isBuffer(dir)) return dir.toString('utf8');
        if (dir && typeof dir === 'object' && dir.type === 'Buffer' && Array.isArray(dir.data)) {
          return Buffer.from(dir.data).toString('utf8');
        }
        return String(dir || '');
      })(),
      provincia: pdFallback.provincia || formDataJsonFallback.personalData?.provincia || '',
      departamento: pdFallback.departamento || formDataJsonFallback.personalData?.departamento || '',
      distrito: pdFallback.distrito || formDataJsonFallback.personalData?.distrito || '',
      departamentoId: pdFallback.departamentoId || formDataJsonFallback.personalData?.departamentoId || '',
      provinciaId: pdFallback.provinciaId || formDataJsonFallback.personalData?.provinciaId || '',
      distritoId: pdFallback.distritoId || formDataJsonFallback.personalData?.distritoId || '',
      referenciaDireccion: pdFallback.referenciaDireccion || formDataJsonFallback.personalData?.referenciaDireccion || '',
      fechaNacimiento: pdFallback.fechaNacimiento ? new Date(pdFallback.fechaNacimiento).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (formDataJsonFallback.personalData?.fechaNacimiento || ''),
      lugarNacimiento: pdFallback.lugarNacimiento || formDataJsonFallback.personalData?.lugarNacimiento || '',
      lugarNacimientoDepartamentoId: pdFallback.lugarNacimientoDepartamentoId || formDataJsonFallback.personalData?.lugarNacimientoDepartamentoId || '',
      lugarNacimientoProvinciaId: pdFallback.lugarNacimientoProvinciaId || formDataJsonFallback.personalData?.lugarNacimientoProvinciaId || '',
      lugarNacimientoDistritoId: pdFallback.lugarNacimientoDistritoId || formDataJsonFallback.personalData?.lugarNacimientoDistritoId || '',
      lugarNacimientoDepartamento: pdFallback.lugarNacimientoDepartamento || formDataJsonFallback.personalData?.lugarNacimientoDepartamento || '',
      lugarNacimientoProvincia: pdFallback.lugarNacimientoProvincia || formDataJsonFallback.personalData?.lugarNacimientoProvincia || '',
      lugarNacimientoDistrito: pdFallback.lugarNacimientoDistrito || formDataJsonFallback.personalData?.lugarNacimientoDistrito || '',
      correoElectronico: pdFallback.correoElectronico || formDataJsonFallback.personalData?.correoElectronico || '',
      telefonoDomicilio: pdFallback.telefonoDomicilio || formDataJsonFallback.personalData?.telefonoDomicilio || '',
      telefonoCelular1: pdFallback.telefonoCelular1 || formDataJsonFallback.personalData?.telefonoCelular1 || '',
      telefonoCelular2: pdFallback.telefonoCelular2 || formDataJsonFallback.personalData?.telefonoCelular2 || '',
      correoElectronicoAlterno: pdFallback.correoElectronicoAlterno || formDataJsonFallback.personalData?.correoElectronicoAlterno || '',
      conadis: pdFallback.conadis || formDataJsonFallback.personalData?.conadis || 'NO',
      nCarnetConadis: pdFallback.nCarnetConadis || formDataJsonFallback.personalData?.nCarnetConadis || '',
      codigoConadis: pdFallback.codigoConadis || formDataJsonFallback.personalData?.codigoConadis || '',
      fuerzasArmadas: pdFallback.fuerzasArmadas || formDataJsonFallback.personalData?.fuerzasArmadas || 'NO',
      nCarnetFuerzasArmadas: pdFallback.nCarnetFuerzasArmadas || formDataJsonFallback.personalData?.nCarnetFuerzasArmadas || '',
      codigoFuerzasArmadas: pdFallback.codigoFuerzasArmadas || formDataJsonFallback.personalData?.codigoFuerzasArmadas || '',
      asistenciaEspecial: pdFallback.asistenciaEspecial || formDataJsonFallback.personalData?.asistenciaEspecial || '',
      tiempoSectorPublico: pdFallback.tiempoSectorPublico ? new Date(pdFallback.tiempoSectorPublico).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (formDataJsonFallback.personalData?.tiempoSectorPublico || ''),
      tiempoSectorPrivado: pdFallback.tiempoSectorPrivado ? new Date(pdFallback.tiempoSectorPrivado).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (formDataJsonFallback.personalData?.tiempoSectorPrivado || ''),
      colegioProfesional: pdFallback.colegioProfesional || formDataJsonFallback.personalData?.colegioProfesional || '',
      colegioProfesionalHabilitado: pdFallback.colegioProfesionalHabilitado || formDataJsonFallback.personalData?.colegioProfesionalHabilitado || 'NO',
      nColegiatura: pdFallback.nColegiatura || formDataJsonFallback.personalData?.nColegiatura || '',
      fechaVencimientoColegiatura: pdFallback.fechaVencimientoColegiatura ? new Date(pdFallback.fechaVencimientoColegiatura).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : (formDataJsonFallback.personalData?.fechaVencimientoColegiatura || ''),
    };

    const anexoCompleto = {
      id: anexo.IDANEXO,
      convocatoriaId: anexo.IDCONVOCATORIA,
      formData: {
        personalData: personalDataMapped,
        academicFormation: academicFormationFromTables.map(item => ({
          nivelEducativo: item.nivelEducativo || '',
          nombreGrado: item.gradoAcademico || item.nombreGrado || '',
          nombreCarrera: item.nombreCarrera || '',
          nombreInstitucion: item.institucion || item.nombreInstitucion || '',
          fechaInicio: item.anoDesde || item.fechaInicio || '',
          fechaFin: item.anoHasta || item.fechaFin || '',
          tieneTitulo: item.tieneTitulo || false,
          nombreTitulo: item.nombreTitulo || '',
          numeroColegiatura: item.numeroColegiatura || '',
          otrosNivelEspecificar: item.otrosNivelEspecificar || '',
        })),
        languageSkills: languageSkillsFromTables.map(item => ({
          idioma: item.idiomaDialecto || item.idioma || '',
          nivel: item.nivel || 'Básico',
          institutoCertificador: item.institutoCertificador || '',
          numeroCertificado: item.numeroCertificado || '',
        })),
        officeSkills: officeSkillsFromTables.map(item => ({
          programa: item.materia || item.programa || '',
          nivel: item.nivel || 'Básico',
        })),
        specializationStudies: specializationStudiesFromTables.map(item => ({
          nombreEspecializacion: item.nombreEspecializacion || item.nombreEstudio || '',
          institucion: item.institucion || item.centroEstudio || '',
          fechaInicio: item.fechaInicio || item.periodoInicio || '',
          fechaFin: item.fechaFin || item.periodoFin || '',
          horasAcademicas: item.horasAcademicas || item.horas || '',
        })),
        workExperience: workExperienceFromTables.map(item => {
          // Combinar funciones principales en un solo campo de texto
          const funcionesArray = [
            item.funcionPrincipal1,
            item.funcionPrincipal2,
            item.funcionPrincipal3,
            item.funcionPrincipal4,
            item.funcionPrincipal5
          ].filter(f => f && f.trim() !== '');
          const funciones = funcionesArray.join('\n');

          return {
            empresaEntidad: item.empresaInstitucion || item.empresaEntidad || '',
            cargo: item.puestoCargo || item.cargo || '',
            fechaInicio: item.periodoDesde || item.fechaInicio || '',
            fechaFin: item.periodoHasta || item.fechaFin || '',
            funciones: funciones || item.funciones || '',
            sector: item.sectorGiroNegocio || item.sector || '',
            funcionPrincipal1: item.funcionPrincipal1 || '',
            funcionPrincipal2: item.funcionPrincipal2 || '',
            funcionPrincipal3: item.funcionPrincipal3 || '',
            funcionPrincipal4: item.funcionPrincipal4 || '',
            funcionPrincipal5: item.funcionPrincipal5 || '',
          };
        }),
        laborReferences: laborReferencesFromTables.map(item => ({
          empresaEntidad: item.empresaEntidad || '',
          direccion: item.direccion || '',
          cargoPostulante: item.cargoPostulante || '',
          nombreCargoJefe: item.nombreCargoJefe || '',
          telefonos: item.telefonos || '',
          correoElectronico: item.correoElectronico || '',
        })),
        relativesInUGEL: relativesFromTables.map(item => ({
          parentesco: item.parentesco || '',
          nombresCompletos: item.nombresCompletos || '',
          cargo: item.cargo || '',
        })),
        declarations: declarationsFromTables.length > 0 ? {
          // Mapear todos los campos de declaraciones según los nombres de la base de datos
          infoVerdadera: Boolean(declarationsFromTables[0].infoVerdadera || false),
          leyProteccionDatos: Boolean(declarationsFromTables[0].leyProteccionDatos || false),
          datosConsignadosVerdaderos: Boolean(declarationsFromTables[0].datosConsignadosVerdaderos || false),
          cumploRequisitosMinimos: Boolean(declarationsFromTables[0].cumploRequisitosMinimos || declarationsFromTables[0].cumplirRequisitos || false),
          plenosDerechosCiviles: Boolean(declarationsFromTables[0].plenosDerechosCiviles || false),
          noCondenaDolosa: Boolean(declarationsFromTables[0].noCondenaDolosa || false),
          noInhabilitacion: Boolean(declarationsFromTables[0].noInhabilitacion || declarationsFromTables[0].noEstarInhabilitado || false),
          noSentenciaCondenatoria: Boolean(declarationsFromTables[0].noSentenciaCondenatoria || false),
          noAntecedentesPenales: Boolean(declarationsFromTables[0].noAntecedentesPenales || false),
          noAntecedentesPoliciales: Boolean(declarationsFromTables[0].noAntecedentesPoliciales || false),
          noAntecedentesJudiciales: Boolean(declarationsFromTables[0].noAntecedentesJudiciales || false),
          noParientesUGEL: Boolean(declarationsFromTables[0].noParientesUGEL || false),
          tieneParientesUGEL: declarationsFromTables[0].tieneParientesUGEL || 'NO',
        } : (formDataJsonFallback.declarations || {}),
      },
      fechaCreacion: anexo.fechaCreacion,
    };

    res.json(anexoCompleto);

  } catch (error) {
    console.error('❌ Error al obtener anexo completo:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      error: 'Error al obtener datos completos del anexo',
      details: error.message || 'Error desconocido'
    });
  }
};

// Controlador para obtener todos los anexos completados de un usuario
export const obtenerAnexosCompletosPorUsuario = async (req, res) => {
  try {
    await ensureAnexosCompletosTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const userRole = (decoded.rol || decoded.role || '').toLowerCase();
    const requestedUserId = req.params.userId || userId; // Si no viene en params, usar el del token

    const puedeVerOtros = ['admin', 'comite', 'rr.hh', 'tramite', 'mesa de partes'].includes(userRole);

    // Verificar permisos: si no es el mismo usuario y no tiene rol autorizado, denegar
    if (Number(requestedUserId) !== Number(userId) && !puedeVerOtros) {
      return res.status(403).json({ error: 'No tienes permiso para ver estos anexos' });
    }

    let anexos = [];
    try {
      const [anexosResult] = await pool.execute(
        `SELECT 
          ac.*,
          apd.lugarNacimiento as pd_lugarNacimiento,
          apd.lugarNacimientoDepartamento as pd_lugarNacimientoDepartamento,
          apd.lugarNacimientoProvincia as pd_lugarNacimientoProvincia,
          apd.lugarNacimientoDistrito as pd_lugarNacimientoDistrito,
          apd.lugarNacimientoDepartamentoId as pd_lugarNacimientoDepartamentoId,
          apd.lugarNacimientoProvinciaId as pd_lugarNacimientoProvinciaId,
          apd.lugarNacimientoDistritoId as pd_lugarNacimientoDistritoId
         FROM anexos_completos ac
         LEFT JOIN anexos_personal_data apd ON ac.IDANEXO = apd.IDANEXO
         WHERE ac.IDUSUARIO = ? 
         ORDER BY COALESCE(ac.fechaActualizacion, ac.fechaCreacion) DESC, ac.fechaCreacion DESC`,
        [requestedUserId]
      );
      anexos = anexosResult || [];
    } catch (err) {
      console.error('❌ Error al obtener anexos_completos:', err);
      // Si la tabla no existe o hay error, devolver array vacío en lugar de fallar
      anexos = [];
    }

    // Parsear los campos JSON y formatear fechas
    const anexosParsed = anexos.map((anexo, index) => {
      console.log(`📦 Procesando anexo ${index + 1}/${anexos.length} - IDANEXO: ${anexo.IDANEXO}`);
      console.log(`📊 Datos raw de anexos_completos:`, {
        formacionAcademica: typeof anexo.formacionAcademica,
        formacionAcademicaValue: anexo.formacionAcademica,
        experienciaLaboral: typeof anexo.experienciaLaboral,
        experienciaLaboralValue: anexo.experienciaLaboral,
        idiomas: typeof anexo.idiomas,
        idiomasValue: anexo.idiomas,
        referenciasLaborales: typeof anexo.referenciasLaborales,
        referenciasLaboralesValue: anexo.referenciasLaborales,
      });
      // Función helper para parsear JSON de forma segura
      const parseJson = (value) => {
        if (!value) return [];
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch (e) {
            console.error('Error parsing JSON string:', e);
            return [];
          }
        }
        // Si es un objeto Buffer (MySQL), convertir a string primero
        if (Buffer.isBuffer(value)) {
          try {
            const bufferString = value.toString('utf8');
            const parsed = JSON.parse(bufferString);
            return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch (e) {
            console.error('Error parsing Buffer JSON:', e);
            return [];
          }
        }
        // Si es un objeto con tipo Buffer (MySQL JSON serializado)
        if (value && typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
          try {
            const bufferString = Buffer.from(value.data).toString('utf8');
            const parsed = JSON.parse(bufferString);
            return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
          } catch (e) {
            console.error('Error parsing Buffer object JSON:', e);
            return [];
          }
        }
        // Si ya es un array, devolverlo
        if (Array.isArray(value)) {
          return value;
        }
        // Si es un objeto (ya parseado), devolverlo en un array
        if (typeof value === 'object') {
          return [value];
        }
        return [];
      };

      // Función helper para formatear fechas
      const formatDate = (dateValue) => {
        if (!dateValue) return null;
        try {
          const date = new Date(dateValue);
          return date.toISOString().split('T')[0]; // YYYY-MM-DD
        } catch (e) {
          return dateValue;
        }
      };

      return {
        ...anexo,
        IDANEXO_COMPLETO: anexo.IDANEXO_COMPLETO,
        IDANEXO: anexo.IDANEXO,
        IDUSUARIO: anexo.IDUSUARIO,
        IDCONVOCATORIA: anexo.IDCONVOCATORIA,
        // Datos personales
        tipoDocumento: anexo.tipoDocumento,
        dni: anexo.dni,
        carnetExtranjeria: anexo.carnetExtranjeria,
        apellidoPaterno: anexo.apellidoPaterno,
        apellidoMaterno: anexo.apellidoMaterno,
        nombres: anexo.nombres,
        genero: anexo.genero,
        fechaNacimiento: formatDate(anexo.fechaNacimiento),
        // Lugar de nacimiento - priorizar datos del JOIN con anexos_personal_data
        lugarNacimiento: anexo.pd_lugarNacimiento || anexo.lugarNacimiento,
        lugarNacimientoDepartamento: anexo.pd_lugarNacimientoDepartamento || anexo.lugarNacimientoDepartamento,
        lugarNacimientoProvincia: anexo.pd_lugarNacimientoProvincia || anexo.lugarNacimientoProvincia,
        lugarNacimientoDistrito: anexo.pd_lugarNacimientoDistrito || anexo.lugarNacimientoDistrito,
        lugarNacimientoDepartamentoId: anexo.pd_lugarNacimientoDepartamentoId || anexo.lugarNacimientoDepartamentoId,
        lugarNacimientoProvinciaId: anexo.pd_lugarNacimientoProvinciaId || anexo.lugarNacimientoProvinciaId,
        lugarNacimientoDistritoId: anexo.pd_lugarNacimientoDistritoId || anexo.lugarNacimientoDistritoId,
        direccion: (() => {
          const dir = anexo.direccion;
          if (!dir) return '';
          if (Buffer.isBuffer(dir)) return dir.toString('utf8');
          if (dir && typeof dir === 'object' && dir.type === 'Buffer' && Array.isArray(dir.data)) {
            return Buffer.from(dir.data).toString('utf8');
          }
          return String(dir || '');
        })(),
        referenciaDireccion: anexo.referenciaDireccion,
        correoElectronico: anexo.correoElectronico,
        telefonoDomicilio: anexo.telefonoDomicilio,
        telefonoCelular1: anexo.telefonoCelular1,
        telefonoCelular2: anexo.telefonoCelular2,
        correoElectronicoAlterno: anexo.correoElectronicoAlterno,
        conadis: anexo.conadis,
        nCarnetConadis: anexo.nCarnetConadis,
        codigoConadis: anexo.codigoConadis,
        fuerzasArmadas: anexo.fuerzasArmadas,
        nCarnetFuerzasArmadas: anexo.nCarnetFuerzasArmadas,
        codigoFuerzasArmadas: anexo.codigoFuerzasArmadas,
        asistenciaEspecial: anexo.asistenciaEspecial,
        tiempoSectorPublico: formatDate(anexo.tiempoSectorPublico),
        tiempoSectorPrivado: formatDate(anexo.tiempoSectorPrivado),
        // Colegio Profesional
        colegioProfesional: anexo.colegioProfesional,
        colegioProfesionalHabilitado: anexo.colegioProfesionalHabilitado,
        nColegiatura: anexo.nColegiatura,
        fechaVencimientoColegiatura: formatDate(anexo.fechaVencimientoColegiatura),
        // Arrays JSON - parsear correctamente
        formacionAcademica: (() => {
          const parsed = parseJson(anexo.formacionAcademica);
          console.log(`✅ formacionAcademica parseado: ${parsed.length} items`);
          return parsed;
        })(),
        idiomas: (() => {
          const parsed = parseJson(anexo.idiomas);
          console.log(`✅ idiomas parseado: ${parsed.length} items`);
          return parsed;
        })(),
        ofimatica: (() => {
          const parsed = parseJson(anexo.ofimatica);
          console.log(`✅ ofimatica parseado: ${parsed.length} items`);
          return parsed;
        })(),
        especializacion: (() => {
          const parsed = parseJson(anexo.especializacion);
          console.log(`✅ especializacion parseado: ${parsed.length} items`);
          return parsed;
        })(),
        experienciaLaboral: (() => {
          const parsed = parseJson(anexo.experienciaLaboral);
          console.log(`✅ experienciaLaboral parseado: ${parsed.length} items`);
          return parsed;
        })(),
        referenciasLaborales: (() => {
          const parsed = parseJson(anexo.referenciasLaborales);
          console.log(`✅ referenciasLaborales parseado: ${parsed.length} items`);
          return parsed;
        })(),
        parientesUGEL: parseJson(anexo.parientesUGEL),
        // Declaraciones
        veracidadDatos: Boolean(anexo.veracidadDatos),
        leyProteccionDatos: Boolean(anexo.leyProteccionDatos),
        datosConsignadosVerdaderos: Boolean(anexo.datosConsignadosVerdaderos),
        plenosDerechosCiviles: Boolean(anexo.plenosDerechosCiviles),
        cumplirRequisitos: Boolean(anexo.cumplirRequisitos),
        noCondenaDolosa: Boolean(anexo.noCondenaDolosa),
        noEstarInhabilitado: Boolean(anexo.noEstarInhabilitado),
        noSentenciaCondenatoria: Boolean(anexo.noSentenciaCondenatoria),
        noAntecedentesPenales: Boolean(anexo.noAntecedentesPenales),
        noAntecedentesPoliciales: Boolean(anexo.noAntecedentesPoliciales),
        noAntecedentesJudiciales: Boolean(anexo.noAntecedentesJudiciales),
        noParientesUGEL: Boolean(anexo.noParientesUGEL),
        tieneParientesUGEL: anexo.tieneParientesUGEL,
        // Metadatos
        codigo: anexo.codigo,
        nombrePuesto: anexo.nombrePuesto,
        numeroCas: anexo.numeroCas,
        fechaCreacion: anexo.fechaCreacion,
        fechaActualizacion: anexo.fechaActualizacion,
        // Agregar personalData consolidado para compatibilidad
        personalData: {
          codigo: anexo.codigo,
          nombrePuesto: anexo.nombrePuesto,
          numeroCas: anexo.numeroCas,
          tipoDocumento: anexo.tipoDocumento,
          dni: anexo.dni,
          carnetExtranjeria: anexo.carnetExtranjeria,
          apellidoPaterno: anexo.apellidoPaterno,
          apellidoMaterno: anexo.apellidoMaterno,
          nombres: anexo.nombres,
          genero: anexo.genero,
          fechaNacimiento: formatDate(anexo.fechaNacimiento),
          // Lugar de nacimiento - usar datos del JOIN
          lugarNacimiento: anexo.pd_lugarNacimiento || anexo.lugarNacimiento,
          lugarNacimientoDepartamento: anexo.pd_lugarNacimientoDepartamento || anexo.lugarNacimientoDepartamento,
          lugarNacimientoProvincia: anexo.pd_lugarNacimientoProvincia || anexo.lugarNacimientoProvincia,
          lugarNacimientoDistrito: anexo.pd_lugarNacimientoDistrito || anexo.lugarNacimientoDistrito,
          lugarNacimientoDepartamentoId: anexo.pd_lugarNacimientoDepartamentoId || anexo.lugarNacimientoDepartamentoId,
          lugarNacimientoProvinciaId: anexo.pd_lugarNacimientoProvinciaId || anexo.lugarNacimientoProvinciaId,
          lugarNacimientoDistritoId: anexo.pd_lugarNacimientoDistritoId || anexo.lugarNacimientoDistritoId,
          direccion: anexo.direccion,
          correoElectronico: anexo.correoElectronico,
          telefonoCelular1: anexo.telefonoCelular1,
          colegioProfesional: anexo.colegioProfesional,
          colegioProfesionalHabilitado: anexo.colegioProfesionalHabilitado,
        },
      };
    });

    console.log('✅ Enviando anexos parseados al frontend:', {
      cantidad: anexosParsed.length,
      primerAnnexo: anexosParsed.length > 0 ? {
        IDANEXO: anexosParsed[0].IDANEXO,
        formacionAcademica: anexosParsed[0].formacionAcademica?.length || 0,
        experienciaLaboral: anexosParsed[0].experienciaLaboral?.length || 0,
        idiomas: anexosParsed[0].idiomas?.length || 0,
        referenciasLaborales: anexosParsed[0].referenciasLaborales?.length || 0,
      } : null
    });

    // Deshabilitar caché para asegurar datos frescos
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(anexosParsed);

  } catch (error) {
    console.error('❌ Error al obtener anexos completos:', error);
    res.status(500).json({
      error: 'Error al obtener anexos completos',
      details: error.message
    });
  }
};

// Función para actualizar un anexo completo
export const updateAnexoCompleto = async (req, res) => {
  try {
    await ensureAnexosCompletosTable();

    const anexoCompletoId = req.params.id;
    if (!anexoCompletoId) {
      return res.status(400).json({ error: 'ID de anexo completo requerido' });
    }

    // Obtener ID del usuario del token
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;

    // Verificar que el anexo pertenece al usuario
    const [existingAnexo] = await pool.execute(
      'SELECT IDANEXO_COMPLETO, IDUSUARIO, IDANEXO, IDCONVOCATORIA FROM anexos_completos WHERE IDANEXO_COMPLETO = ?',
      [anexoCompletoId]
    );

    if (existingAnexo.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado' });
    }

    if (existingAnexo[0].IDUSUARIO !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para actualizar este anexo' });
    }

    // Obtener datos del formulario
    const formDataJson = req.body.formDataJson || req.body;
    let formData;

    if (typeof formDataJson === 'string') {
      formData = JSON.parse(formDataJson);
    } else {
      formData = formDataJson;
    }

    // Obtener ID de convocatoria desde el request body (prioritario) o desde formData
    // Prioridad 1: request body (explícito)
    // Prioridad 2: formData.convocatoriaId (legacy)
    // Prioridad 3: formData.personalData?.codigo (legacy)
    // Prioridad 4: mantener el IDCONVOCATORIA existente del anexo
    let convocatoriaId = req.body.convocatoriaId || null;

    // Si no viene en el body, intentar obtenerlo del formData
    if (!convocatoriaId) {
      convocatoriaId = formData.convocatoriaId || null;
    }

    // Si aún no hay convocatoriaId, intentar obtenerlo del codigo
    if (!convocatoriaId && formData.personalData?.codigo) {
      const codigoNum = Number(formData.personalData.codigo);
      if (!Number.isNaN(codigoNum) && codigoNum > 0) {
        convocatoriaId = codigoNum;
      }
    }

    // Normalizar convocatoriaId a número o null
    if (convocatoriaId !== null && convocatoriaId !== undefined) {
      const convocatoriaIdNum = Number(convocatoriaId);
      convocatoriaId = (!Number.isNaN(convocatoriaIdNum) && convocatoriaIdNum > 0) ? convocatoriaIdNum : null;
    } else {
      // Si no se proporciona convocatoriaId, mantener el existente
      convocatoriaId = existingAnexo[0].IDCONVOCATORIA;
    }

    // IMPORTANTE: Verificar que no se esté intentando cambiar la convocatoria de un anexo existente
    // Cada convocatoria debe tener su propio anexo independiente
    const existingConvocatoriaId = existingAnexo[0].IDCONVOCATORIA;
    if (existingConvocatoriaId !== null && convocatoriaId !== null && existingConvocatoriaId !== convocatoriaId) {
      console.warn('⚠️ Intento de cambiar convocatoria de un anexo existente:', {
        anexoCompletoId: anexoCompletoId,
        convocatoriaActual: existingConvocatoriaId,
        convocatoriaSolicitada: convocatoriaId,
        userId: userId
      });
      return res.status(400).json({
        error: 'No se puede cambiar la convocatoria de un anexo existente. Cada convocatoria debe tener su propio anexo independiente. Por favor, cree un nuevo anexo para la nueva convocatoria.'
      });
    }

    console.log('📋 ID de convocatoria para actualizar anexo:', {
      fromBody: req.body.convocatoriaId,
      fromFormData: formData.convocatoriaId,
      fromCodigo: formData.personalData?.codigo,
      existingConvocatoriaId: existingConvocatoriaId,
      final: convocatoriaId,
      userId: userId,
      anexoCompletoId: anexoCompletoId
    });

    const pd = formData.personalData || {};
    const decl = formData.declarations || {};

    // Preparar JSON arrays
    const formacionAcademicaJson = JSON.stringify(Array.isArray(formData.academicFormation) ? formData.academicFormation : []);
    const idiomasJson = JSON.stringify(Array.isArray(formData.languageSkills) ? formData.languageSkills : []);
    const ofimaticaJson = JSON.stringify(Array.isArray(formData.officeSkills) ? formData.officeSkills : []);
    const especializacionJson = JSON.stringify(Array.isArray(formData.specializationStudies) ? formData.specializationStudies : []);
    const experienciaLaboralJson = JSON.stringify(Array.isArray(formData.workExperience) ? formData.workExperience : []);
    const referenciasLaboralesJson = JSON.stringify(Array.isArray(formData.laborReferences) ? formData.laborReferences : []);
    const parientesUGELJson = JSON.stringify(Array.isArray(formData.relativesInUGEL) ? formData.relativesInUGEL : []);

    // Función helper para parsear fechas
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      } catch (e) {
        return null;
      }
    };

    // Obtener estructura de la tabla
    const [tableColumns] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'anexos_completos' 
       AND COLUMN_NAME NOT IN ('IDANEXO_COMPLETO', 'fechaCreacion', 'fechaActualizacion')
       ORDER BY ORDINAL_POSITION`
    );

    const availableColumns = tableColumns.map(col => col.COLUMN_NAME);

    // Construir UPDATE dinámicamente
    const updateColumns = [];
    const updateValues = [];

    // Mapa de todos los campos posibles
    const allFields = {
      'IDUSUARIO': userId,
      'IDCONVOCATORIA': convocatoriaId, // Usar el convocatoriaId obtenido explícitamente
      'codigo': pd.codigo || null,
      'nombrePuesto': pd.nombrePuesto || null,
      'tipoDocumento': pd.tipoDocumento || 'DNI',
      'dni': pd.dni || null,
      'carnetExtranjeria': pd.carnetExtranjeria || null,
      'apellidoPaterno': pd.apellidoPaterno || null,
      'apellidoMaterno': pd.apellidoMaterno || null,
      'nombres': pd.nombres || null,
      'genero': pd.genero || 'M',
      'direccion': pd.direccion || null,
      'provincia': pd.provincia || null,
      'departamento': pd.departamento || null,
      'distrito': pd.distrito || null,
      'departamentoId': pd.departamentoId || null,
      'provinciaId': pd.provinciaId || null,
      'distritoId': pd.distritoId || null,
      'referenciaDireccion': pd.referenciaDireccion || null,
      'fechaNacimiento': parseDate(pd.fechaNacimiento),
      'lugarNacimiento': pd.lugarNacimiento || null,
      'lugarNacimientoDepartamentoId': pd.lugarNacimientoDepartamentoId || null,
      'lugarNacimientoProvinciaId': pd.lugarNacimientoProvinciaId || null,
      'lugarNacimientoDistritoId': pd.lugarNacimientoDistritoId || null,
      'lugarNacimientoDepartamento': pd.lugarNacimientoDepartamento || null,
      'lugarNacimientoProvincia': pd.lugarNacimientoProvincia || null,
      'lugarNacimientoDistrito': pd.lugarNacimientoDistrito || null,
      'correoElectronico': pd.correoElectronico || null,
      'telefonoDomicilio': pd.telefonoDomicilio || null,
      'telefonoCelular1': pd.telefonoCelular1 || null,
      'telefonoCelular2': pd.telefonoCelular2 || null,
      'correoElectronicoAlterno': pd.correoElectronicoAlterno || null,
      'conadis': pd.conadis || 'NO',
      'nCarnetConadis': pd.nCarnetConadis || null,
      'codigoConadis': pd.codigoConadis || null,
      'fuerzasArmadas': pd.fuerzasArmadas || 'NO',
      'nCarnetFuerzasArmadas': pd.nCarnetFuerzasArmadas || null,
      'codigoFuerzasArmadas': pd.codigoFuerzasArmadas || null,
      'asistenciaEspecial': pd.asistenciaEspecial || null,
      'tiempoSectorPublico': parseDate(pd.tiempoSectorPublico),
      'tiempoSectorPrivado': parseDate(pd.tiempoSectorPrivado),
      'colegioProfesional': pd.colegioProfesional || null,
      'colegioProfesionalHabilitado': pd.colegioProfesionalHabilitado || 'NO',
      'nColegiatura': pd.nColegiatura || null,
      'fechaVencimientoColegiatura': parseDate(pd.fechaVencimientoColegiatura),
      'numeroCas': pd.numeroCas || null,
      'formacionAcademica': formacionAcademicaJson,
      'idiomas': idiomasJson,
      'ofimatica': ofimaticaJson,
      'especializacion': especializacionJson,
      'experienciaLaboral': experienciaLaboralJson,
      'referenciasLaborales': referenciasLaboralesJson,
      'parientesUGEL': parientesUGELJson,
      'veracidadDatos': decl.infoVerdadera || decl.veracidadDatos || false,
      'leyProteccionDatos': decl.leyProteccionDatos || false,
      'datosConsignadosVerdaderos': decl.datosConsignadosVerdaderos || false,
      'plenosDerechosCiviles': decl.plenosDerechosCiviles || false,
      'cumplirRequisitos': decl.cumploRequisitosMinimos || decl.cumplirRequisitos || false,
      'noCondenaDolosa': decl.noCondenaDolosa || false,
      'noEstarInhabilitado': decl.noInhabilitacion || decl.noEstarInhabilitado || false,
      'noSentenciaCondenatoria': decl.noSentenciaCondenatoria || false,
      'noAntecedentesPenales': decl.noAntecedentesPenales || false,
      'noAntecedentesPoliciales': decl.noAntecedentesPoliciales || false,
      'noAntecedentesJudiciales': decl.noAntecedentesJudiciales || false,
      'noParientesUGEL': decl.noParientesUGEL || false,
      'tieneParientesUGEL': decl.tieneParientesUGEL || 'NO',
    };

    // Agregar solo las columnas que existen en la tabla
    for (const colName of availableColumns) {
      if (allFields.hasOwnProperty(colName) && colName !== 'IDANEXO') {
        updateColumns.push(`${colName} = ?`);
        updateValues.push(allFields[colName]);
      }
    }

    // Agregar IDANEXO_COMPLETO al final para el WHERE
    updateValues.push(anexoCompletoId);

    // Asegurar que fechaActualizacion se actualice explícitamente
    // MySQL solo actualiza automáticamente si hay cambios, pero queremos forzar la actualización
    const fechaActualizacionColumn = updateColumns.find(col => col.includes('fechaActualizacion'));
    if (!fechaActualizacionColumn) {
      updateColumns.push('fechaActualizacion = CURRENT_TIMESTAMP');
    }

    // Construir y ejecutar el UPDATE
    const updateSQL = `UPDATE anexos_completos SET ${updateColumns.join(', ')} WHERE IDANEXO_COMPLETO = ?`;

    console.log('📊 UPDATE dinámico en anexos_completos:', {
      id: anexoCompletoId,
      columnas: updateColumns.length,
      valores: updateValues.length - 1,
      incluyeFechaActualizacion: updateColumns.some(col => col.includes('fechaActualizacion'))
    });

    await pool.execute(updateSQL, updateValues);

    // IMPORTANTE: También actualizar la tabla principal anexos para sincronizar el IDCONVOCATORIA
    if (existingAnexo[0].IDANEXO) {
      try {
        await pool.execute(
          'UPDATE anexos SET IDCONVOCATORIA = ?, fechaActualizacion = CURRENT_TIMESTAMP WHERE IDANEXO = ?',
          [convocatoriaId, existingAnexo[0].IDANEXO]
        );
        console.log('✅ Tabla anexos actualizada con IDCONVOCATORIA:', {
          anexoId: existingAnexo[0].IDANEXO,
          convocatoriaId: convocatoriaId
        });
      } catch (updateError) {
        console.warn('⚠️ Error al actualizar tabla anexos (no crítico):', updateError.message);
        // No fallar la actualización completa si esto falla
      }
    }

    // Generar reporte de IA automáticamente después de actualizar (sin bloquear la respuesta)
    // Solo si hay convocatoria asociada
    if (convocatoriaId) {
      generarReporteIAAutomatico(userId, convocatoriaId, existingAnexo[0].IDANEXO).catch(error => {
        console.error('⚠️ Error en generación automática de reporte IA (no crítico):', error.message);
      });
    }

    res.json({
      message: 'Anexo actualizado exitosamente',
      id: anexoCompletoId
    });

  } catch (error) {
    console.error('❌ Error al actualizar anexo completo:', error);
    res.status(500).json({
      error: 'Error al actualizar el anexo',
      details: error.message
    });
  }
};

// Función para generar PDF completo desde datos del anexo completo (en memoria)
function generateAnexoCompletoPDFBuffer(formData, userData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Anexo 01 - Ficha de Datos Personales',
          Author: 'UGEL Talara',
          Subject: 'Datos del Postulante'
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { personalData, academicFormation, languageSkills, officeSkills,
        specializationStudies, workExperience, laborReferences, declarations, relativesInUGEL } = formData;

      // Colores
      const primaryColor = '#667eea';
      const secondaryColor = '#4f46e5';
      const textColor = '#2c3e50';
      const lightGray = '#f8f9fa';

      // Obtener área y puesto para usar en los títulos
      const area = personalData?.area || 'N/A';
      const puesto = personalData?.nombrePuesto || 'N/A';

      // Contador de anexos (empezar en 1)
      let anexoCounter = 0;

      // HEADER CON TÍTULO PRINCIPAL
      doc.rect(0, 0, 595.28, 120)
        .fill(primaryColor);

      doc.fillColor('#ffffff')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('ANEXOS COMPLETOS', 50, 20, { align: 'center', width: 495 });

      doc.fontSize(18)
        .font('Helvetica-Bold')
        .text('FICHA DE DATOS PERSONALES', 50, 50, { align: 'center', width: 495 });

      doc.fontSize(14)
        .font('Helvetica')
        .text('Anexo - Información del Postulante', 50, 75, { align: 'center', width: 495 });

      // Información de identificación en el header
      doc.fillColor('#ffffff')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`ID Usuario: ${userData.IDUSUARIO || userData.id || 'N/A'}`, 50, 95, { align: 'center', width: 495 });

      if (personalData?.numeroCas) {
        doc.fontSize(11)
          .text(`N° CAS: ${personalData.numeroCas}`, 50, 110, { align: 'center', width: 495 });
      }

      let yPosition = 150;

      // CUADRO DESTACADO CON INFORMACIÓN PRINCIPAL DEL USUARIO
      // Borde exterior
      doc.rect(48, yPosition - 2, 499, 115)
        .fill('#ffffff')
        .stroke(primaryColor)
        .lineWidth(3);

      // Header del cuadro con fondo de color
      doc.rect(50, yPosition, 495, 28)
        .fill(primaryColor);

      // Título del cuadro
      doc.fillColor('#ffffff')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('INFORMACIÓN DE IDENTIFICACIÓN', 55, yPosition + 8);

      yPosition += 35;

      // Información del usuario en formato destacado
      const nombreCompleto = personalData?.nombres || personalData?.apellidoPaterno || userData?.nombreCompleto || 'N/A';
      const apellidos = personalData?.apellidoPaterno && personalData?.apellidoMaterno
        ? `${personalData.apellidoPaterno} ${personalData.apellidoMaterno}`
        : userData?.nombreCompleto?.split(' ').slice(0, -1).join(' ') || 'N/A';
      const nombres = personalData?.nombres || userData?.nombreCompleto?.split(' ').slice(-1).join(' ') || 'N/A';
      const nombreFull = `${apellidos} ${nombres}`;
      const dni = personalData?.dni || personalData?.tipoDocumento === 'DNI' ? personalData?.dni : personalData?.carnetExtranjeria || userData?.documento || 'N/A';
      const telefono = personalData?.telefonoCelular1 || personalData?.telefonoDomicilio || userData?.telefono || 'N/A';
      const correo = personalData?.correoElectronico || userData?.correo || 'N/A';

      // Fondo alternado para mejor legibilidad
      doc.rect(52, yPosition - 3, 491, 22)
        .fill('#f0f7ff');

      doc.fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Nombre Completo:', 55, yPosition + 5);

      doc.fillColor('#1a1a1a')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(nombreFull, 165, yPosition + 5, { width: 380 });

      yPosition += 25;

      // Fondo alternado
      doc.rect(52, yPosition - 3, 491, 22)
        .fill('#ffffff');

      // DNI y Teléfono lado a lado
      doc.fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('DNI:', 55, yPosition + 5);

      doc.fillColor(textColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(dni, 95, yPosition + 5, { width: 140 });

      doc.fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Teléfono:', 270, yPosition + 5);

      doc.fillColor(textColor)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(telefono, 350, yPosition + 5, { width: 195 });

      yPosition += 25;

      // Fondo alternado
      doc.rect(52, yPosition - 3, 491, 22)
        .fill('#f0f7ff');

      // Correo
      doc.fillColor(primaryColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Correo Electrónico:', 55, yPosition + 5);

      doc.fillColor(textColor)
        .fontSize(10)
        .font('Helvetica')
        .text(correo, 195, yPosition + 5, { width: 350 });

      yPosition += 35;

      // DATOS PERSONALES
      doc.rect(50, yPosition - 5, 495, 25)
        .fill(primaryColor);

      doc.fillColor('#ffffff')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text('I. DATOS PERSONALES', 55, yPosition + 3);

      yPosition += 35;

      // Crear una tabla organizada para los datos personales
      const datosPersonalesItems = [];

      if (personalData?.nombrePuesto) {
        datosPersonalesItems.push({ label: 'Puesto al que Postula', value: personalData.nombrePuesto });
      }
      if (personalData?.area) {
        datosPersonalesItems.push({ label: 'Área', value: personalData.area });
      }
      if (personalData?.tipoDocumento) {
        datosPersonalesItems.push({ label: 'Tipo de Documento', value: personalData.tipoDocumento });
      }
      if (personalData?.apellidoPaterno) {
        datosPersonalesItems.push({ label: 'Apellido Paterno', value: personalData.apellidoPaterno });
      }
      if (personalData?.apellidoMaterno) {
        datosPersonalesItems.push({ label: 'Apellido Materno', value: personalData.apellidoMaterno });
      }
      if (personalData?.nombres) {
        datosPersonalesItems.push({ label: 'Nombres', value: personalData.nombres });
      }
      if (personalData?.genero) {
        datosPersonalesItems.push({ label: 'Género', value: personalData.genero === 'M' ? 'Masculino' : personalData.genero === 'F' ? 'Femenino' : personalData.genero });
      }
      if (personalData?.fechaNacimiento) {
        datosPersonalesItems.push({ label: 'Fecha de Nacimiento', value: personalData.fechaNacimiento });
      }
      if (personalData?.lugarNacimiento) {
        datosPersonalesItems.push({ label: 'Lugar de Nacimiento', value: personalData.lugarNacimiento });
      }
      if (personalData?.direccion) {
        datosPersonalesItems.push({ label: 'Dirección', value: personalData.direccion });
      }
      if (personalData?.colegioProfesional) {
        datosPersonalesItems.push({ label: 'Colegio Profesional', value: personalData.colegioProfesional });
      }
      if (personalData?.nColegiatura) {
        datosPersonalesItems.push({ label: 'N° Colegiatura', value: personalData.nColegiatura });
      }

      // Mostrar datos en dos columnas para mejor organización
      let dataY = yPosition;
      const itemsPerColumn = Math.ceil(datosPersonalesItems.length / 2);
      const col1Width = 240;
      const col2Width = 245;
      const labelWidth = 125;
      const valueWidth1 = col1Width - labelWidth - 10;
      const valueWidth2 = col2Width - labelWidth - 10;

      // Procesar datos en dos columnas
      for (let i = 0; i < Math.max(itemsPerColumn, datosPersonalesItems.length); i++) {
        if (dataY + 25 > doc.page.height - 100) {
          doc.addPage();
          dataY = 50;
        }

        // Columna 1 (izquierda)
        if (i < datosPersonalesItems.length) {
          const item1 = datosPersonalesItems[i];

          // Fondo alternado
          if (i % 2 === 0) {
            doc.rect(50, dataY, col1Width, 22)
              .fill('#f8f9fa');
          }

          doc.fillColor(primaryColor)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(`${item1.label}:`, 55, dataY + 6);

          doc.fillColor(textColor)
            .fontSize(9)
            .font('Helvetica')
            .text(item1.value || 'N/A', 185, dataY + 6, { width: valueWidth1 });
        }

        // Columna 2 (derecha)
        const index2 = i + itemsPerColumn;
        if (index2 < datosPersonalesItems.length) {
          const item2 = datosPersonalesItems[index2];

          // Fondo alternado
          if (i % 2 === 0) {
            doc.rect(305, dataY, col2Width, 22)
              .fill('#f8f9fa');
          }

          doc.fillColor(primaryColor)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(`${item2.label}:`, 310, dataY + 6);

          doc.fillColor(textColor)
            .fontSize(9)
            .font('Helvetica')
            .text(item2.value || 'N/A', 440, dataY + 6, { width: valueWidth2 });
        }

        dataY += 22;
      }

      yPosition = dataY + 20;

      // COLEGIO PROFESIONAL (si existe)
      if (personalData?.colegioProfesional || personalData?.nColegiatura) {
        anexoCounter++;
        const titleHeight = 30;

        // Verificar espacio antes de agregar sección
        if (yPosition + titleHeight > doc.page.height - 100) {
          doc.addPage();
          yPosition = 50;
        }

        doc.rect(50, yPosition - 5, 495, titleHeight)
          .fill(secondaryColor);

        doc.fillColor('#ffffff')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`Anexo #${anexoCounter} - Área: ${area} - Puesto: ${puesto}`, 55, yPosition + 6, { width: 485 });

        yPosition += titleHeight + 10;

        if (personalData.colegioProfesional) {
          doc.fillColor(primaryColor)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Colegio:', 55, yPosition);

          doc.fillColor(textColor)
            .fontSize(10)
            .font('Helvetica')
            .text(personalData.colegioProfesional, 120, yPosition, { width: 425 });

          yPosition += 20;
        }

        if (personalData.nColegiatura) {
          doc.fillColor(primaryColor)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('N° Colegiatura:', 55, yPosition);

          doc.fillColor(textColor)
            .fontSize(10)
            .font('Helvetica')
            .text(personalData.nColegiatura, 150, yPosition, { width: 395 });

          yPosition += 20;
        }

        if (personalData.fechaVencimientoColegiatura) {
          doc.fillColor(primaryColor)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Fecha Vencimiento:', 55, yPosition);

          doc.fillColor(textColor)
            .fontSize(10)
            .font('Helvetica')
            .text(personalData.fechaVencimientoColegiatura, 180, yPosition, { width: 365 });

          yPosition += 25;
        }
      }

      // FORMACIÓN ACADÉMICA
      if (academicFormation && academicFormation.length > 0) {
        anexoCounter++;
        yPosition = addSectionWithTableWithAnexoNumber(doc, yPosition, anexoCounter, area, puesto, primaryColor, textColor, [
          ['Nivel', 'Grado Académico', 'Carrera', 'Institución', 'Años']
        ], academicFormation.map(item => [
          item.nivelEducativo === 'OTROS (ESPECIFICAR)' && item.otrosNivelEspecificar
            ? `${item.nivelEducativo}: ${item.otrosNivelEspecificar}`
            : (item.nivelEducativo || item.nivel || 'N/A'),
          item.gradoAcademico || item.nombreGrado || 'N/A',
          item.nombreCarrera || 'N/A',
          item.institucion || item.nombreInstitucion || 'N/A',
          `${item.anoDesde || item.fechaInicio || ''} - ${item.anoHasta || item.fechaFin || ''}`
        ]));
      }

      // IDIOMAS
      if (languageSkills && languageSkills.length > 0) {
        anexoCounter++;
        yPosition = addSectionWithTableWithAnexoNumber(doc, yPosition, anexoCounter, area, puesto, primaryColor, textColor, [
          ['Idioma/Dialecto', 'Nivel', 'Instituto Certificador', 'N° Certificado']
        ], languageSkills.map(item => [
          item.idiomaDialecto || item.idioma || 'N/A',
          item.nivel || 'N/A',
          item.institutoCertificador || 'N/A',
          item.numeroCertificado || 'N/A'
        ]));
      }

      // OFIMÁTICA
      if (officeSkills && officeSkills.length > 0) {
        anexoCounter++;
        yPosition = addSectionWithTableWithAnexoNumber(doc, yPosition, anexoCounter, area, puesto, primaryColor, textColor, [
          ['Programa/Materia', 'Nivel']
        ], officeSkills.map(item => [
          item.materia || item.programa || 'N/A',
          item.nivel || 'N/A'
        ]));
      }

      // ESTUDIOS DE ESPECIALIZACIÓN
      if (specializationStudies && specializationStudies.length > 0) {
        anexoCounter++;
        yPosition = addSectionWithTableWithAnexoNumber(doc, yPosition, anexoCounter, area, puesto, primaryColor, textColor, [
          ['Tipo', 'Nombre', 'Centro', 'Periodo', 'Horas']
        ], specializationStudies.map(item => [
          item.tipoEstudio || 'N/A',
          item.nombreEstudio || 'N/A',
          item.centroEstudio || 'N/A',
          `${item.periodoInicio || ''} - ${item.periodoFin || ''}`,
          `${item.horas || ''}h`
        ]));
      }

      // EXPERIENCIA LABORAL
      if (workExperience && workExperience.length > 0) {
        anexoCounter++;
        yPosition = addWorkExperienceSectionWithAnexoNumber(doc, yPosition, anexoCounter, workExperience, area, puesto, primaryColor, textColor);
      }

      // REFERENCIAS LABORALES
      if (laborReferences && laborReferences.length > 0) {
        anexoCounter++;
        yPosition = addSectionWithTableWithAnexoNumber(doc, yPosition, anexoCounter, area, puesto, primaryColor, textColor, [
          ['Empresa', 'Cargo Postulante', 'Jefe', 'Teléfonos', 'Correo']
        ], laborReferences.map(item => [
          item.empresaEntidad || 'N/A',
          item.cargoPostulante || 'N/A',
          item.nombreCargoJefe || 'N/A',
          item.telefonos || 'N/A',
          item.correoElectronico || 'N/A'
        ]));
      }

      // PARIENTES EN UGEL
      if (relativesInUGEL && Array.isArray(relativesInUGEL) && relativesInUGEL.length > 0) {
        anexoCounter++;
        const titleHeight = 30;

        if (yPosition + titleHeight > doc.page.height - 100) {
          doc.addPage();
          yPosition = 50;
        }

        doc.rect(50, yPosition - 5, 495, titleHeight)
          .fill(primaryColor);

        doc.fillColor('#ffffff')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`Anexo #${anexoCounter} - Área: ${area} - Puesto: ${puesto}`, 55, yPosition + 6, { width: 485 });

        yPosition += titleHeight + 10;

        relativesInUGEL.forEach((relative, index) => {
          if (yPosition + 60 > doc.page.height - 50) {
            doc.addPage();
            yPosition = 50;
          }

          doc.rect(50, yPosition, 495, 50)
            .fill(index % 2 === 0 ? '#f8f9fa' : '#ffffff')
            .stroke('#dee2e6')
            .lineWidth(0.5);

          doc.fillColor(primaryColor)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`Pariente ${index + 1}:`, 55, yPosition + 8);

          doc.fillColor(textColor)
            .fontSize(9)
            .font('Helvetica')
            .text(`Nombre: ${relative.nombre || 'N/A'}`, 55, yPosition + 22, { width: 240 });

          doc.text(`Parentesco: ${relative.parentesco || 'N/A'}`, 305, yPosition + 22, { width: 240 });

          doc.text(`Cargo: ${relative.cargo || 'N/A'}`, 55, yPosition + 35, { width: 485 });

          yPosition += 60;
        });
      }

      // DECLARACIONES
      if (declarations) {
        anexoCounter++;
        yPosition = addDeclarationsSectionWithAnexoNumber(doc, yPosition, anexoCounter, declarations, area, puesto, primaryColor, textColor);
      }

      // FOOTER
      doc.fontSize(8)
        .fillColor('#6c757d')
        .text(`Documento generado el ${new Date().toLocaleDateString('es-PE')} - UGEL Talara`,
          50, doc.page.height - 50, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      console.error('❌ Error en generateAnexoCompletoPDFBuffer:', error);
      reject(error);
    }
  });
}

// Controlador para descargar PDF del anexo
export const descargarAnexo = async (req, res) => {
  try {
    const { id } = req.params;

    // Primero intentar obtener desde anexos básicos
    let [anexos] = await pool.execute(
      'SELECT pdfFile, nombreArchivo FROM anexos WHERE IDANEXO = ?',
      [id]
    );

    // Si no se encuentra en anexos básicos, intentar en anexos_completos
    if (anexos.length === 0) {
      try {
        await ensureAnexosCompletosTable();
        await ensureAllAnexosTables();

        // Obtener el anexo completo con todos sus datos
        const [anexosCompletos] = await pool.execute(
          `SELECT ac.*, u.nombreCompleto, u.correo, u.documento, u.telefono
           FROM anexos_completos ac
           LEFT JOIN usuarios u ON ac.IDUSUARIO = u.IDUSUARIO
           WHERE ac.IDANEXO = ?`,
          [id]
        );

        if (anexosCompletos.length > 0) {
          const anexoCompleto = anexosCompletos[0];

          // SIEMPRE REGENERAR EL PDF para asegurar que los datos estén actualizados y sin Buffers
          // Comentado para forzar regeneración:
          // if (anexoCompleto.pdfFile) {
          //   res.setHeader('Content-Type', 'application/pdf');
          //   res.setHeader('Content-Disposition', `attachment; filename="Anexos_Completos_${id}.pdf"`);
          //   res.send(anexoCompleto.pdfFile);
          //   return;
          // }

          // Si no tiene PDF, generar uno completo desde los datos
          console.log('📄 Generando PDF completo desde datos del anexo...');

          // Obtener datos de todas las tablas relacionadas
          let personalDataFromTables = [];
          let academicFormationFromTables = [];
          let languageSkillsFromTables = [];
          let officeSkillsFromTables = [];
          let specializationStudiesFromTables = [];
          let workExperienceFromTables = [];
          let laborReferencesFromTables = [];
          let relativesFromTables = [];

          try {
            const [personalData] = await pool.execute(
              `SELECT * FROM anexos_personal_data WHERE IDANEXO = ?`,
              [id]
            );
            personalDataFromTables = personalData || [];
          } catch (err) {
            console.warn('⚠️ Error al obtener personalData:', err.message);
          }

          try {
            const [academicFormation] = await pool.execute(
              `SELECT * FROM anexos_academic_formation WHERE IDANEXO = ? ORDER BY fechaCreacion ASC`,
              [id]
            );
            academicFormationFromTables = academicFormation || [];
          } catch (err) {
            console.warn('⚠️ Error al obtener academicFormation:', err.message);
          }

          try {
            const [languageSkills] = await pool.execute(
              `SELECT * FROM anexos_language_skills WHERE IDANEXO = ? ORDER BY fechaCreacion ASC`,
              [id]
            );
            languageSkillsFromTables = languageSkills || [];
          } catch (err) {
            console.warn('⚠️ Error al obtener languageSkills:', err.message);
          }

          try {
            const [officeSkills] = await pool.execute(
              `SELECT * FROM anexos_office_skills WHERE IDANEXO = ? ORDER BY fechaCreacion ASC`,
              [id]
            );
            officeSkillsFromTables = officeSkills || [];
          } catch (err) {
            console.warn('⚠️ Error al obtener officeSkills:', err.message);
          }

          try {
            const [specializationStudies] = await pool.execute(
              `SELECT * FROM anexos_specialization_studies WHERE IDANEXO = ? ORDER BY fechaCreacion ASC`,
              [id]
            );
            specializationStudiesFromTables = specializationStudies || [];
          } catch (err) {
            console.warn('⚠️ Error al obtener specializationStudies:', err.message);
          }

          try {
            const [workExperience] = await pool.execute(
              `SELECT * FROM anexos_work_experience WHERE IDANEXO = ? ORDER BY fechaCreacion ASC`,
              [id]
            );
            workExperienceFromTables = workExperience || [];
          } catch (err) {
            console.warn('⚠️ Error al obtener workExperience:', err.message);
          }

          try {
            const [laborReferences] = await pool.execute(
              `SELECT * FROM anexos_labor_references WHERE IDANEXO = ? ORDER BY fechaCreacion ASC`,
              [id]
            );
            laborReferencesFromTables = laborReferences || [];
          } catch (err) {
            console.warn('⚠️ Error al obtener laborReferences:', err.message);
          }

          try {
            const [relatives] = await pool.execute(
              `SELECT * FROM anexos_relatives_ugel WHERE IDANEXO = ? ORDER BY fechaCreacion ASC`,
              [id]
            );
            relativesFromTables = relatives || [];
          } catch (err) {
            console.warn('⚠️ Error al obtener relatives:', err.message);
          }

          // Función auxiliar para convertir Buffer a string
          const bufferToString = (value) => {
            if (!value) return '';
            if (Buffer.isBuffer(value)) {
              return value.toString('utf8');
            }
            if (typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
              return Buffer.from(value.data).toString('utf8');
            }
            return String(value);
          };

          // Construir formData desde anexos_completos y tablas relacionadas
          const pdFallback = personalDataFromTables[0] || {};
          const personalDataMapped = {
            codigo: anexoCompleto.codigo || pdFallback.codigo || '',
            nombrePuesto: anexoCompleto.nombrePuesto || pdFallback.nombrePuesto || '',
            tipoDocumento: anexoCompleto.tipoDocumento || pdFallback.tipoDocumento || 'DNI',
            dni: anexoCompleto.dni || pdFallback.dni || '',
            carnetExtranjeria: anexoCompleto.carnetExtranjeria || pdFallback.carnetExtranjeria || '',
            apellidoPaterno: anexoCompleto.apellidoPaterno || pdFallback.apellidoPaterno || '',
            apellidoMaterno: anexoCompleto.apellidoMaterno || pdFallback.apellidoMaterno || '',
            nombres: anexoCompleto.nombres || pdFallback.nombres || '',
            genero: anexoCompleto.genero || pdFallback.genero || 'M',
            direccion: bufferToString(anexoCompleto.direccion || pdFallback.direccion) || '',
            fechaNacimiento: anexoCompleto.fechaNacimiento || pdFallback.fechaNacimiento || '',
            lugarNacimiento: bufferToString(anexoCompleto.lugarNacimiento || pdFallback.lugarNacimiento) || '',
            correoElectronico: anexoCompleto.correoElectronico || pdFallback.correoElectronico || '',
            telefonoCelular1: anexoCompleto.telefonoCelular1 || pdFallback.telefonoCelular1 || '',
            telefonoDomicilio: anexoCompleto.telefonoDomicilio || pdFallback.telefonoDomicilio || '',
            colegioProfesional: anexoCompleto.colegioProfesional || pdFallback.colegioProfesional || '',
            nColegiatura: anexoCompleto.nColegiatura || pdFallback.nColegiatura || '',
            fechaVencimientoColegiatura: anexoCompleto.fechaVencimientoColegiatura || pdFallback.fechaVencimientoColegiatura || '',
            numeroCas: anexoCompleto.numeroCas || pdFallback.numeroCas || '',
            area: pdFallback.area || '',
          };

          // Parsear JSON arrays desde anexos_completos
          let academicFormation = [];
          let languageSkills = [];
          let officeSkills = [];
          let specializationStudies = [];
          let workExperience = [];
          let laborReferences = [];
          let relativesInUGEL = [];

          try {
            // Priorizar datos de tablas normalizadas, sino usar datos de anexos_completos
            if (academicFormationFromTables.length > 0) {
              academicFormation = academicFormationFromTables.map(item => ({
                nivelEducativo: item.nivelEducativo || item.nivel || '',
                gradoAcademico: item.gradoAcademico || item.nombreGrado || '',
                nombreCarrera: item.nombreCarrera || '',
                institucion: item.institucion || item.nombreInstitucion || '',
                anoDesde: item.anoDesde || item.fechaInicio || '',
                anoHasta: item.anoHasta || item.fechaFin || '',
                fechaInicio: item.fechaInicio || item.anoDesde || '',
                fechaFin: item.fechaFin || item.anoHasta || '',
                otrosNivelEspecificar: item.otrosNivelEspecificar || '',
              }));
            } else if (anexoCompleto.formacionAcademica) {
              academicFormation = typeof anexoCompleto.formacionAcademica === 'string'
                ? JSON.parse(anexoCompleto.formacionAcademica)
                : anexoCompleto.formacionAcademica;
              // Asegurarse de que sea un array
              if (!Array.isArray(academicFormation)) {
                academicFormation = [];
              }
            }
          } catch (err) {
            console.warn('⚠️ Error al parsear formacionAcademica:', err.message);
            academicFormation = [];
          }

          try {
            // Priorizar datos de tablas normalizadas, sino usar datos de anexos_completos
            if (languageSkillsFromTables.length > 0) {
              languageSkills = languageSkillsFromTables.map(item => ({
                idioma: item.idioma || item.idiomaDialecto || '',
                idiomaDialecto: item.idiomaDialecto || item.idioma || '',
                nivel: item.nivel || '',
                institutoCertificador: item.institutoCertificador || '',
                numeroCertificado: item.numeroCertificado || '',
              }));
            } else if (anexoCompleto.idiomas) {
              languageSkills = typeof anexoCompleto.idiomas === 'string'
                ? JSON.parse(anexoCompleto.idiomas)
                : anexoCompleto.idiomas;
              if (!Array.isArray(languageSkills)) {
                languageSkills = [];
              }
            }
          } catch (err) {
            console.warn('⚠️ Error al parsear idiomas:', err.message);
            languageSkills = [];
          }

          try {
            // Priorizar datos de tablas normalizadas, sino usar datos de anexos_completos
            if (officeSkillsFromTables.length > 0) {
              officeSkills = officeSkillsFromTables.map(item => ({
                programa: item.programa || item.materia || '',
                materia: item.materia || item.programa || '',
                nivel: item.nivel || '',
              }));
            } else if (anexoCompleto.ofimatica) {
              officeSkills = typeof anexoCompleto.ofimatica === 'string'
                ? JSON.parse(anexoCompleto.ofimatica)
                : anexoCompleto.ofimatica;
              if (!Array.isArray(officeSkills)) {
                officeSkills = [];
              }
            }
          } catch (err) {
            console.warn('⚠️ Error al parsear ofimatica:', err.message);
            officeSkills = [];
          }

          try {
            // Priorizar datos de tablas normalizadas, sino usar datos de anexos_completos
            if (specializationStudiesFromTables.length > 0) {
              specializationStudies = specializationStudiesFromTables.map(item => ({
                tipoEstudio: item.tipoEstudio || '',
                nombreEstudio: item.nombreEstudio || '',
                centroEstudio: item.centroEstudio || '',
                periodoInicio: item.periodoInicio || '',
                periodoFin: item.periodoFin || '',
                horas: item.horas || '',
              }));
            } else if (anexoCompleto.especializacion) {
              specializationStudies = typeof anexoCompleto.especializacion === 'string'
                ? JSON.parse(anexoCompleto.especializacion)
                : anexoCompleto.especializacion;
              if (!Array.isArray(specializationStudies)) {
                specializationStudies = [];
              }
            }
          } catch (err) {
            console.warn('⚠️ Error al parsear especializacion:', err.message);
            specializationStudies = [];
          }

          try {
            // Priorizar datos de tablas normalizadas, sino usar datos de anexos_completos
            if (workExperienceFromTables.length > 0) {
              workExperience = workExperienceFromTables.map(item => ({
                puestoCargo: item.puestoCargo || '',
                empresaInstitucion: item.empresaInstitucion || item.empresaEntidad || '',
                periodoDesde: item.periodoDesde || '',
                periodoHasta: item.periodoHasta || '',
                funcionPrincipal1: item.funcionPrincipal1 || '',
                funcionPrincipal2: item.funcionPrincipal2 || '',
                funcionPrincipal3: item.funcionPrincipal3 || '',
                funcionPrincipal4: item.funcionPrincipal4 || '',
                funcionPrincipal5: item.funcionPrincipal5 || '',
              }));
            } else if (anexoCompleto.experienciaLaboral) {
              workExperience = typeof anexoCompleto.experienciaLaboral === 'string'
                ? JSON.parse(anexoCompleto.experienciaLaboral)
                : anexoCompleto.experienciaLaboral;
              if (!Array.isArray(workExperience)) {
                workExperience = [];
              }
            }
          } catch (err) {
            console.warn('⚠️ Error al parsear experienciaLaboral:', err.message);
            workExperience = [];
          }

          try {
            // Priorizar datos de tablas normalizadas, sino usar datos de anexos_completos
            if (laborReferencesFromTables.length > 0) {
              laborReferences = laborReferencesFromTables.map(item => ({
                empresaEntidad: item.empresaEntidad || '',
                cargoPostulante: item.cargoPostulante || '',
                nombreCargoJefe: item.nombreCargoJefe || '',
                telefonos: item.telefonos || '',
                correoElectronico: item.correoElectronico || '',
              }));
            } else if (anexoCompleto.referenciasLaborales) {
              laborReferences = typeof anexoCompleto.referenciasLaborales === 'string'
                ? JSON.parse(anexoCompleto.referenciasLaborales)
                : anexoCompleto.referenciasLaborales;
              if (!Array.isArray(laborReferences)) {
                laborReferences = [];
              }
            }
          } catch (err) {
            console.warn('⚠️ Error al parsear referenciasLaborales:', err.message);
            laborReferences = [];
          }

          try {
            // Priorizar datos de tablas normalizadas, sino usar datos de anexos_completos
            if (relativesFromTables.length > 0) {
              relativesInUGEL = relativesFromTables.map(item => ({
                nombre: item.nombre || '',
                parentesco: item.parentesco || '',
                cargo: item.cargo || '',
              }));
            } else if (anexoCompleto.parientesUGEL) {
              relativesInUGEL = typeof anexoCompleto.parientesUGEL === 'string'
                ? JSON.parse(anexoCompleto.parientesUGEL)
                : anexoCompleto.parientesUGEL;
              if (!Array.isArray(relativesInUGEL)) {
                relativesInUGEL = [];
              }
            }
          } catch (err) {
            console.warn('⚠️ Error al parsear parientesUGEL:', err.message);
            relativesInUGEL = [];
          }

          const declarations = {
            veracidadDatos: anexoCompleto.veracidadDatos || false,
            leyProteccionDatos: anexoCompleto.leyProteccionDatos || false,
            datosConsignadosVerdaderos: anexoCompleto.datosConsignadosVerdaderos || false,
            plenosDerechosCiviles: anexoCompleto.plenosDerechosCiviles || false,
            cumplirRequisitos: anexoCompleto.cumplirRequisitos || false,
            noCondenaDolosa: anexoCompleto.noCondenaDolosa || false,
            noEstarInhabilitado: anexoCompleto.noEstarInhabilitado || false,
            noSentenciaCondenatoria: anexoCompleto.noSentenciaCondenatoria || false,
            noAntecedentesPenales: anexoCompleto.noAntecedentesPenales || false,
            noAntecedentesPoliciales: anexoCompleto.noAntecedentesPoliciales || false,
            noAntecedentesJudiciales: anexoCompleto.noAntecedentesJudiciales || false,
            noParientesUGEL: anexoCompleto.noParientesUGEL || false,
            tieneParientesUGEL: anexoCompleto.tieneParientesUGEL || 'NO',
          };

          const formData = {
            personalData: personalDataMapped,
            academicFormation: academicFormation,
            languageSkills: languageSkills,
            officeSkills: officeSkills,
            specializationStudies: specializationStudies,
            workExperience: workExperience,
            laborReferences: laborReferences,
            relativesInUGEL: relativesInUGEL,
            declarations: declarations,
          };

          const userData = {
            IDUSUARIO: anexoCompleto.IDUSUARIO,
            nombreCompleto: anexoCompleto.nombreCompleto || '',
            correo: anexoCompleto.correo || '',
            documento: anexoCompleto.documento || '',
            telefono: anexoCompleto.telefono || '',
          };

          // Generar PDF completo
          const pdfBuffer = await generateAnexoCompletoPDFBuffer(formData, userData);

          // Opcional: Guardar el PDF en la base de datos para futuras descargas
          try {
            await pool.execute(
              'UPDATE anexos_completos SET pdfFile = ? WHERE IDANEXO = ?',
              [pdfBuffer, id]
            );
            console.log('✅ PDF guardado en base de datos');
          } catch (saveError) {
            console.warn('⚠️ Error al guardar PDF en base de datos (continuando):', saveError.message);
          }

          // Enviar el PDF generado
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="Anexos_Completos_${id}.pdf"`);
          res.send(pdfBuffer);
          return;
        }
      } catch (error) {
        console.error('❌ Error al buscar en anexos_completos:', error);
      }

      return res.status(404).json({ error: 'Anexo no encontrado' });
    }

    const anexo = anexos[0];

    if (!anexo.pdfFile) {
      return res.status(404).json({ error: 'Archivo PDF no encontrado en la base de datos' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${anexo.nombreArchivo || `Anexo_${id}.pdf`}"`);

    // Enviar el PDF desde la base de datos
    res.send(anexo.pdfFile);

  } catch (error) {
    console.error('❌ Error al descargar anexo:', error);
    res.status(500).json({
      error: 'Error al descargar el anexo',
      details: error.message
    });
  }
};

// ============================================================
// CONTROLADORES DE CURRICULUM
// ============================================================

// Función para verificar y crear la tabla CURRICULUM si no existe
async function ensureCurriculumTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'curriculum'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS curriculum (
          IDCURRICULUM INT AUTO_INCREMENT PRIMARY KEY,
          IDUSUARIO INT NOT NULL,
          IDCONVOCATORIA INT,
          pdfFile LONGBLOB,
          nombreArchivo VARCHAR(255),
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_usuario (IDUSUARIO),
          INDEX idx_convocatoria (IDCONVOCATORIA),
          INDEX idx_fechaCreacion (fechaCreacion)
        )
      `);
      console.log('✅ Tabla curriculum creada exitosamente');
    } else {
      // Verificar si existe la columna pdfFile, si no, agregarla
      const [columns] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'curriculum' 
         AND COLUMN_NAME = 'pdfFile'`
      );

      if (columns.length === 0) {
        // Agregar columna pdfFile y eliminar rutaPDF si existe
        try {
          await pool.execute(`
            ALTER TABLE curriculum 
            ADD COLUMN pdfFile LONGBLOB AFTER IDCONVOCATORIA
          `);
          console.log('✅ Columna pdfFile agregada a la tabla curriculum');
        } catch (alterError) {
          console.error('⚠️ Error al agregar columna pdfFile:', alterError.message);
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla curriculum:', error.message);
  }
}

// Controlador para subir curriculum (solo PDF, solo ID de usuario)
export const uploadCurriculum = async (req, res) => {
  try {
    await ensureCurriculumTable();

    // Obtener ID del usuario del token
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;

    if (!userId) {
      return res.status(401).json({ error: 'ID de usuario no encontrado en el token' });
    }

    // Verificar que se haya subido un archivo
    if (!req.files || !req.files.curriculumFile) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo PDF' });
    }

    // Obtener ID de convocatoria del body (express-fileupload coloca los campos del FormData en req.body)
    // Si no está en body, intentar desde query params
    let convocatoriaId = null;

    if (req.body && typeof req.body === 'object') {
      // express-fileupload puede poner los campos como strings
      convocatoriaId = req.body.convocatoriaId || null;

      // Si viene como string, convertir a número si es posible
      if (convocatoriaId && typeof convocatoriaId === 'string') {
        const parsed = parseInt(convocatoriaId, 10);
        convocatoriaId = isNaN(parsed) ? convocatoriaId : parsed;
      }
    }

    // Si no se encontró en body, intentar desde query params
    if (!convocatoriaId && req.query && req.query.convocatoriaId) {
      const parsed = parseInt(req.query.convocatoriaId, 10);
      convocatoriaId = isNaN(parsed) ? req.query.convocatoriaId : parsed;
    }

    console.log('📋 Convocatoria ID obtenida para curriculum:', convocatoriaId);

    // Manejar archivo único o múltiples archivos
    const files = Array.isArray(req.files.curriculumFile) ? req.files.curriculumFile : [req.files.curriculumFile];

    const uploadedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Verificar que sea PDF
      if (file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: `El archivo ${file.name} no es un PDF. Solo se permiten archivos PDF.` });
      }

      // Verificar tamaño (máximo 500MB)
      if (file.size > 500 * 1024 * 1024) {
        return res.status(400).json({ error: `El archivo ${file.name} es demasiado grande. Máximo 500MB.` });
      }

      // Generar nombre de archivo único con índice si hay múltiples archivos
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = files.length > 1
        ? `Curriculum_Usuario_${userId}_${timestamp}_${i + 1}.pdf`
        : `Curriculum_Usuario_${userId}_${timestamp}.pdf`;

      // Leer el archivo como buffer (express-fileupload guarda el archivo en file.data)
      const pdfBuffer = file.data;

      if (!pdfBuffer) {
        return res.status(400).json({ error: `Error al leer el archivo ${file.name}` });
      }

      // Obtener una conexión del pool
      // Nota: max_allowed_packet debe estar configurado a nivel global en MySQL
      // Si no está configurado, ejecutar como administrador: SET GLOBAL max_allowed_packet = 524288000;
      const connection = await pool.getConnection();

      try {
        // Guardar en base de datos con el PDF como BLOB
        // El valor de max_allowed_packet debe estar configurado globalmente en MySQL
        const [result] = await connection.execute(
          `INSERT INTO curriculum (IDUSUARIO, IDCONVOCATORIA, pdfFile, nombreArchivo) 
           VALUES (?, ?, ?, ?)`,
          [
            userId,
            convocatoriaId,
            pdfBuffer,
            fileName
          ]
        );

        uploadedFiles.push({
          id: result.insertId,
          fileName: fileName
        });

        console.log('✅ Curriculum guardado exitosamente en la base de datos:', result.insertId);
      } finally {
        // Liberar la conexión de vuelta al pool
        connection.release();
      }

    }

    // Después de subir exitosamente el currículum, crear registro en postulantes_registrados
    try {
      // Asegurar que la tabla existe
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS postulantes_registrados (
          id INT AUTO_INCREMENT PRIMARY KEY,
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

      // Obtener datos completos del usuario
      const [usuarios] = await pool.execute(
        `SELECT IDUSUARIO, nombreCompleto, apellidoPaterno, apellidoMaterno, documento, correo, telefono, rol 
         FROM usuarios WHERE IDUSUARIO = ?`,
        [userId]
      );

      if (usuarios.length === 0) {
        console.warn('⚠️ Usuario no encontrado para crear registro de postulante');
      } else {
        const usuario = usuarios[0];

        // Obtener datos de la convocatoria si existe
        let convocatoriaData = null;
        if (convocatoriaId) {
          const [convocatorias] = await pool.execute(
            `SELECT IDCONVOCATORIA, numeroCAS, area, puesto, estado 
             FROM convocatorias WHERE IDCONVOCATORIA = ?`,
            [convocatoriaId]
          );
          if (convocatorias.length > 0) {
            convocatoriaData = convocatorias[0];
          }
        }

        // Obtener datos del anexo si existe (buscar el más reciente)
        let anexoId = null;
        try {
          const [anexos] = await pool.execute(
            `SELECT IDANEXO FROM anexos_completos WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC LIMIT 1`,
            [userId]
          );
          if (anexos.length > 0) {
            anexoId = anexos[0].IDANEXO;
            console.log('✅ ID del anexo obtenido:', anexoId);
          }
        } catch (anexoError) {
          console.warn('⚠️ Error al obtener anexo:', anexoError);
        }

        // Obtener el último curriculum ID
        let curriculumIdFinal = uploadedFiles[0]?.id || null;
        if (!curriculumIdFinal) {
          try {
            const [curriculums] = await pool.execute(
              `SELECT IDCURRICULUM FROM curriculum WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC LIMIT 1`,
              [userId]
            );
            if (curriculums.length > 0) {
              curriculumIdFinal = curriculums[0].IDCURRICULUM;
              console.log('✅ ID del curriculum obtenido:', curriculumIdFinal);
            }
          } catch (curriculumError) {
            console.warn('⚠️ Error al obtener curriculum:', curriculumError);
          }
        }

        // Construir nombre completo
        const nombreCompleto = usuario.nombreCompleto || `${usuario.apellidoPaterno || ''} ${usuario.apellidoMaterno || ''}`.trim() || 'Postulante';

        // Generar ID del certificado
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const codigoCertificado = `CERT-${userId}-${timestamp}-${random}`;

        // Verificar si ya existe un registro para este usuario por DNI o certificadoId
        const [existentes] = await pool.execute(
          `SELECT id FROM postulantes_registrados WHERE certificadoId LIKE ? OR dni = ?`,
          [`CERT-${userId}-%`, usuario.documento || '']
        );

        if (existentes.length > 0) {
          // Actualizar registro existente
          await pool.execute(
            `UPDATE postulantes_registrados 
             SET certificadoId = ?,
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
                 fechaActualizacion = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              codigoCertificado,
              nombreCompleto,
              usuario.apellidoPaterno || null,
              usuario.apellidoMaterno || null,
              usuario.documento || null,
              usuario.correo || null,
              usuario.telefono || null,
              convocatoriaData?.numeroCAS || null,
              convocatoriaData?.puesto || null,
              convocatoriaData?.area || null,
              convocatoriaId || null,
              anexoId,
              curriculumIdFinal,
              existentes[0].id
            ]
          );
          console.log('✅ Registro de postulante actualizado:', existentes[0].id);
        } else {
          // Crear nuevo registro
          await pool.execute(
            `INSERT INTO postulantes_registrados (
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
              estado,
              fechaRegistro
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', NOW())`,
            [
              codigoCertificado,
              nombreCompleto,
              usuario.apellidoPaterno || null,
              usuario.apellidoMaterno || null,
              usuario.documento || null,
              usuario.correo || null,
              usuario.telefono || null,
              convocatoriaData?.numeroCAS || null,
              convocatoriaData?.puesto || null,
              convocatoriaData?.area || null,
              convocatoriaId || null,
              anexoId,
              curriculumIdFinal
            ]
          );
          console.log('✅ Registro de postulante creado:', codigoCertificado);
        }
      }
    } catch (postulanteError) {
      // No fallar la subida del currículum si hay error al crear el registro
      console.error('⚠️ Error al crear registro en postulantes_registrados:', postulanteError);
    }

    res.status(201).json({
      message: 'Curriculum(s) guardado(s) exitosamente',
      files: uploadedFiles,
      count: uploadedFiles.length
    });

  } catch (error) {
    console.error('❌ Error al guardar curriculum:', error);

    // Manejo específico para error de tamaño de paquete
    if (error.code === 'ER_NET_PACKET_TOO_LARGE' || error.message.includes('max_allowed_packet')) {
      return res.status(500).json({
        error: 'El archivo es demasiado grande para la configuración actual del servidor (max_allowed_packet).',
        details: 'Por favor contacte al administrador para aumentar el límite de tamaño de paquetes en la base de datos.'
      });
    }

    res.status(500).json({
      error: 'Error al guardar el curriculum',
      details: error.message
    });
  }
};

// Controlador para obtener curriculum por usuario
export const obtenerCurriculumPorUsuario = async (req, res) => {
  try {
    await ensureCurriculumTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;

    const [curriculums] = await pool.execute(
      `SELECT IDCURRICULUM, IDUSUARIO, IDCONVOCATORIA, nombreArchivo, fechaCreacion 
       FROM curriculum WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC`,
      [userId]
    );

    res.json(curriculums);
  } catch (error) {
    console.error('❌ Error al obtener curriculum:', error);
    res.status(500).json({
      error: 'Error al obtener curriculum',
      details: error.message
    });
  }
};

// Controlador para verificar si el usuario tiene curriculum subido
export const hasCurriculum = async (req, res) => {
  try {
    await ensureCurriculumTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;

    const [curriculums] = await pool.execute(
      `SELECT COUNT(*) as count FROM curriculum WHERE IDUSUARIO = ?`,
      [userId]
    );

    const hasCurriculum = curriculums[0]?.count > 0;

    res.json({ hasCurriculum });
  } catch (error) {
    console.error('❌ Error al verificar curriculum:', error);
    res.status(500).json({
      error: 'Error al verificar curriculum',
      details: error.message
    });
  }
};

// Controlador para descargar PDF del curriculum
export const descargarCurriculum = async (req, res) => {
  try {
    const { id } = req.params;

    // Primero verificar qué columnas existen en la tabla
    let [curriculums] = await pool.execute(
      'SELECT * FROM curriculum WHERE IDCURRICULUM = ?',
      [id]
    );

    if (curriculums.length === 0) {
      console.log(`❌ Curriculum ${id} no encontrado directamente, intentando buscar por usuario...`);
      
      // Intentar buscar el curriculum más reciente del usuario
      // Primero necesitamos obtener el IDUSUARIO desde postulantes_registrados
      try {
        const [postulantes] = await pool.execute(
          'SELECT IDUSUARIO FROM postulantes_registrados WHERE curriculumId = ? OR curriculumId = ? LIMIT 1',
          [id, `CV-${id}`]
        );
        
        if (postulantes.length > 0 && postulantes[0].IDUSUARIO) {
          const userId = postulantes[0].IDUSUARIO;
          console.log(`🔍 Buscando curriculum para usuario ${userId}...`);
          
          [curriculums] = await pool.execute(
            'SELECT * FROM curriculum WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC LIMIT 1',
            [userId]
          );
          
          if (curriculums.length > 0) {
            console.log(`✅ Curriculum encontrado para usuario ${userId}: ID ${curriculums[0].IDCURRICULUM}`);
          }
        }
      } catch (searchError) {
        console.warn(`⚠️ Error al buscar curriculum por usuario:`, searchError.message);
      }
      
      if (curriculums.length === 0) {
        console.log(`❌ No se pudo encontrar ningún curriculum relacionado con ID ${id}`);
        return res.status(404).json({ 
          error: 'Curriculum no encontrado',
          details: `No se encontró el curriculum con ID ${id} ni ningún curriculum relacionado`,
          suggestion: 'Por favor, ejecute el script CORREGIR_CURRICULUM_IDS.sql para actualizar los IDs incorrectos'
        });
      } else {
        // Si encontramos un curriculum diferente, actualizar el registro en postulantes_registrados
        const curriculumEncontrado = curriculums[0];
        if (curriculumEncontrado.IDCURRICULUM != id) {
          console.log(`🔄 Actualizando curriculumId de ${id} a ${curriculumEncontrado.IDCURRICULUM} en postulantes_registrados`);
          try {
            await pool.execute(
              'UPDATE postulantes_registrados SET curriculumId = ? WHERE curriculumId = ? OR curriculumId = ?',
              [curriculumEncontrado.IDCURRICULUM, id, `CV-${id}`]
            );
            console.log(`✅ CurriculumId actualizado correctamente`);
          } catch (updateError) {
            console.warn(`⚠️ No se pudo actualizar el curriculumId:`, updateError.message);
          }
        }
      }
    }

    const curriculum = curriculums[0];
    
    // Log de las columnas disponibles para debugging
    console.log(`📄 Curriculum ${id} encontrado. Columnas disponibles:`, Object.keys(curriculum));
    console.log(`📄 Datos del curriculum:`, {
      nombreArchivo: curriculum.nombreArchivo,
      tienePdfFile: !!curriculum.pdfFile,
      tieneArchivoPath: !!curriculum.archivoPath,
      tieneFilePath: !!curriculum.filePath
    });

    // Intentar primero desde pdfFile (base de datos)
    if (curriculum.pdfFile) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${curriculum.nombreArchivo || 'curriculum.pdf'}"`);
      console.log(`✅ Enviando curriculum ${id} desde base de datos (pdfFile)`);
      return res.send(curriculum.pdfFile);
    }

    // Si no está en pdfFile, intentar desde archivoPath o filePath (sistema de archivos)
    const rutaArchivo = curriculum.archivoPath || curriculum.filePath || curriculum.rutaArchivo;
    if (rutaArchivo) {
      const fs = require('fs');
      const path = require('path');
      
      // Construir la ruta completa del archivo
      let filePath = rutaArchivo;
      
      // Si la ruta es relativa, construir la ruta absoluta
      if (!path.isAbsolute(filePath)) {
        filePath = path.join(__dirname, '..', '..', filePath);
      }
      
      console.log(`📂 Intentando leer curriculum desde: ${filePath}`);
      
      // Verificar si el archivo existe
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${curriculum.nombreArchivo || 'curriculum.pdf'}"`);
        console.log(`✅ Enviando curriculum ${id} desde sistema de archivos`);
        return res.sendFile(filePath);
      } else {
        console.log(`❌ Archivo no encontrado en: ${filePath}`);
      }
    }

    // Si no se encontró el archivo en ningún lugar
    console.log(`❌ Curriculum ${id} no tiene archivo PDF disponible`);
    console.log(`📋 Columnas del curriculum:`, curriculum);
    return res.status(404).json({ 
      error: 'Archivo PDF no encontrado',
      details: 'El curriculum no tiene un archivo PDF asociado en la base de datos ni en el sistema de archivos',
      availableColumns: Object.keys(curriculum)
    });

  } catch (error) {
    console.error('❌ Error al descargar curriculum:', error);
    res.status(500).json({
      error: 'Error al descargar el curriculum',
      details: error.message
    });
  }
};

// ============================================================
// CONTROLADORES DE BORRADORES DE ANEXOS
// ============================================================

// Función para verificar y crear la tabla ANEXOS_DRAFTS si no existe
async function ensureAnexosDraftsTable() {
  try {
    return await retryDatabaseOperation(async () => {
      const [tables] = await pool.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anexos_drafts'`
      );

      if (tables.length === 0) {
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS anexos_drafts (
            IDDRAFT INT AUTO_INCREMENT PRIMARY KEY,
            IDUSUARIO INT NOT NULL,
            IDCONVOCATORIA INT,
            formDataJson LONGTEXT NOT NULL,
            fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_usuario (IDUSUARIO),
            INDEX idx_convocatoria (IDCONVOCATORIA),
            UNIQUE KEY unique_user_convocatoria (IDUSUARIO, IDCONVOCATORIA)
          )
        `);
        console.log('✅ Tabla anexos_drafts creada exitosamente');
      }
      return true;
    });
  } catch (error) {
    console.error('⚠️ Error al crear tabla anexos_drafts:', error.message);
    // No lanzar el error, solo loguearlo para que la aplicación continúe
    return false;
  }
}

// Controlador para guardar borrador de anexo
export const guardarBorradorAnexo = async (req, res) => {
  try {
    await ensureAnexosDraftsTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;

    if (!userId) {
      return res.status(401).json({ error: 'ID de usuario no encontrado en el token' });
    }

    const { formDataJson } = req.body;
    let convocatoriaId = req.body.convocatoriaId || null;

    if (!formDataJson) {
      return res.status(400).json({ error: 'Datos del formulario requeridos' });
    }

    // Normalizar convocatoriaId a número o null
    // También intentar obtenerlo del formDataJson si no viene en el body
    if (!convocatoriaId && formDataJson.personalData?.codigo) {
      const codigoNum = Number(formDataJson.personalData.codigo);
      if (!Number.isNaN(codigoNum) && codigoNum > 0) {
        convocatoriaId = codigoNum;
      }
    }

    if (convocatoriaId !== null && convocatoriaId !== undefined) {
      const convocatoriaIdNum = Number(convocatoriaId);
      convocatoriaId = (!Number.isNaN(convocatoriaIdNum) && convocatoriaIdNum > 0) ? convocatoriaIdNum : null;
    } else {
      convocatoriaId = null;
    }

    console.log('📋 ID de convocatoria para borrador:', {
      fromBody: req.body.convocatoriaId,
      fromFormData: formDataJson.personalData?.codigo,
      final: convocatoriaId,
      userId: userId
    });

    // Usar INSERT ... ON DUPLICATE KEY UPDATE para evitar errores de duplicado
    // Con retry para manejar errores de conexión
    try {
      const result = await retryDatabaseOperation(async () => {
        const [insertResult] = await pool.execute(
          `INSERT INTO anexos_drafts (IDUSUARIO, IDCONVOCATORIA, formDataJson) 
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           formDataJson = VALUES(formDataJson),
           fechaActualizacion = CURRENT_TIMESTAMP`,
          [userId, convocatoriaId || null, JSON.stringify(formDataJson)]
        );

        // Obtener el ID del borrador (ya sea nuevo o actualizado)
        const [drafts] = await pool.execute(
          'SELECT IDDRAFT FROM anexos_drafts WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?',
          [userId, convocatoriaId || null]
        );

        return {
          insertId: insertResult.insertId,
          draftId: drafts.length > 0 ? drafts[0].IDDRAFT : insertResult.insertId
        };
      });

      console.log('✅ Borrador guardado/actualizado exitosamente');

      res.status(200).json({
        message: 'Borrador guardado exitosamente',
        id: result.draftId
      });
    } catch (insertError) {
      // Si falla el INSERT por duplicado, intentar UPDATE con retry
      if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
        try {
          const updateResult = await retryDatabaseOperation(async () => {
            await pool.execute(
              `UPDATE anexos_drafts 
               SET formDataJson = ?, fechaActualizacion = CURRENT_TIMESTAMP 
               WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?`,
              [JSON.stringify(formDataJson), userId, convocatoriaId || null]
            );

            const [drafts] = await pool.execute(
              'SELECT IDDRAFT FROM anexos_drafts WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?',
              [userId, convocatoriaId || null]
            );

            return drafts.length > 0 ? drafts[0].IDDRAFT : null;
          });

          console.log('✅ Borrador actualizado exitosamente (después de error de duplicado)');

          res.status(200).json({
            message: 'Borrador actualizado exitosamente',
            id: updateResult
          });
        } catch (updateError) {
          throw updateError;
        }
      } else {
        throw insertError;
      }
    }

  } catch (error) {
    console.error('❌ Error al guardar borrador:', error);
    res.status(500).json({
      error: 'Error al guardar el borrador',
      details: error.message
    });
  }
};

// Controlador para obtener borrador de anexo
export const obtenerBorradorAnexo = async (req, res) => {
  try {
    await ensureAnexosDraftsTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const convocatoriaId = req.query.convocatoriaId || null;

    const [drafts] = await retryDatabaseOperation(async () => {
      return await pool.execute(
        'SELECT * FROM anexos_drafts WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?',
        [userId, convocatoriaId]
      );
    });

    if (drafts.length === 0) {
      // Devolver objeto vacío en lugar de 404 para que el frontend pueda manejar la ausencia de borrador
      return res.json({
        id: null,
        convocatoriaId: convocatoriaId,
        formData: null,
        fechaCreacion: null,
        fechaActualizacion: null
      });
    }

    const draft = drafts[0];

    // Parsear el JSON del formData
    let formData;
    try {
      formData = typeof draft.formDataJson === 'string'
        ? JSON.parse(draft.formDataJson)
        : draft.formDataJson;
    } catch (error) {
      return res.status(500).json({ error: 'Error al parsear datos del borrador' });
    }

    res.json({
      id: draft.IDDRAFT,
      convocatoriaId: draft.IDCONVOCATORIA,
      formData: formData,
      fechaCreacion: draft.fechaCreacion,
      fechaActualizacion: draft.fechaActualizacion
    });

  } catch (error) {
    console.error('❌ Error al obtener borrador:', error);
    res.status(500).json({
      error: 'Error al obtener el borrador',
      details: error.message
    });
  }
};

// Controlador para eliminar borrador de anexo
export const eliminarBorradorAnexo = async (req, res) => {
  try {
    await ensureAnexosDraftsTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const convocatoriaId = req.query.convocatoriaId || null;

    await pool.execute(
      'DELETE FROM anexos_drafts WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?',
      [userId, convocatoriaId]
    );

    console.log('✅ Borrador eliminado exitosamente');
    res.status(200).json({ message: 'Borrador eliminado exitosamente' });

  } catch (error) {
    console.error('❌ Error al eliminar borrador:', error);
    res.status(500).json({
      error: 'Error al eliminar el borrador',
      details: error.message
    });
  }
};

// ============================================================
// CRUD PARA FORMACIÓN ACADÉMICA
// ============================================================

// GET - Obtener todas las formaciones académicas de un anexo
export const obtenerFormacionesAcademicas = async (req, res) => {
  try {
    await ensureAnexosAcademicFormationTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;

    // Verificar que el anexo pertenece al usuario
    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [formaciones] = await pool.execute(
      `SELECT IDACADEMIC, nivelEducativo, gradoAcademico, nombreCarrera, 
       institucion, anoDesde, anoHasta, otrosNivelEspecificar, fechaCreacion
       FROM anexos_academic_formation 
       WHERE IDANEXO = ? 
       ORDER BY fechaCreacion ASC`,
      [anexoId]
    );

    res.status(200).json({ formaciones });
  } catch (error) {
    console.error('❌ Error al obtener formaciones académicas:', error);
    res.status(500).json({
      error: 'Error al obtener formaciones académicas',
      details: error.message
    });
  }
};

// POST - Crear una nueva formación académica
export const crearFormacionAcademica = async (req, res) => {
  try {
    await ensureAnexosAcademicFormationTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;
    const { nivelEducativo, gradoAcademico, nombreCarrera, institucion, anoDesde, anoHasta, otrosNivelEspecificar } = req.body;

    // Verificar que el anexo pertenece al usuario
    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [result] = await pool.execute(
      `INSERT INTO anexos_academic_formation (
        IDANEXO, nivelEducativo, gradoAcademico, nombreCarrera,
        institucion, anoDesde, anoHasta, otrosNivelEspecificar
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [anexoId, nivelEducativo || null, gradoAcademico || null, nombreCarrera || null,
        institucion || null, anoDesde || null, anoHasta || null, otrosNivelEspecificar || null]
    );

    const [nuevaFormacion] = await pool.execute(
      `SELECT IDACADEMIC, nivelEducativo, gradoAcademico, nombreCarrera, 
       institucion, anoDesde, anoHasta, otrosNivelEspecificar, fechaCreacion
       FROM anexos_academic_formation 
       WHERE IDACADEMIC = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Formación académica creada exitosamente',
      formacion: nuevaFormacion[0]
    });
  } catch (error) {
    console.error('❌ Error al crear formación académica:', error);
    res.status(500).json({
      error: 'Error al crear formación académica',
      details: error.message
    });
  }
};

// PUT - Actualizar una formación académica
export const actualizarFormacionAcademica = async (req, res) => {
  try {
    await ensureAnexosAcademicFormationTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;
    const { nivelEducativo, gradoAcademico, nombreCarrera, institucion, anoDesde, anoHasta, otrosNivelEspecificar } = req.body;

    // Verificar que la formación académica pertenece a un anexo del usuario
    const [formaciones] = await pool.execute(
      `SELECT fa.IDACADEMIC FROM anexos_academic_formation fa
       INNER JOIN anexos a ON fa.IDANEXO = a.IDANEXO
       WHERE fa.IDACADEMIC = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (formaciones.length === 0) {
      return res.status(404).json({ error: 'Formación académica no encontrada o no pertenece al usuario' });
    }

    await pool.execute(
      `UPDATE anexos_academic_formation SET
       nivelEducativo = ?, gradoAcademico = ?, nombreCarrera = ?,
       institucion = ?, anoDesde = ?, anoHasta = ?, otrosNivelEspecificar = ?
       WHERE IDACADEMIC = ?`,
      [nivelEducativo || null, gradoAcademico || null, nombreCarrera || null,
      institucion || null, anoDesde || null, anoHasta || null, otrosNivelEspecificar || null, id]
    );

    const [formacionActualizada] = await pool.execute(
      `SELECT IDACADEMIC, nivelEducativo, gradoAcademico, nombreCarrera, 
       institucion, anoDesde, anoHasta, otrosNivelEspecificar, fechaCreacion
       FROM anexos_academic_formation 
       WHERE IDACADEMIC = ?`,
      [id]
    );

    res.status(200).json({
      message: 'Formación académica actualizada exitosamente',
      formacion: formacionActualizada[0]
    });
  } catch (error) {
    console.error('❌ Error al actualizar formación académica:', error);
    res.status(500).json({
      error: 'Error al actualizar formación académica',
      details: error.message
    });
  }
};

// DELETE - Eliminar una formación académica
export const eliminarFormacionAcademica = async (req, res) => {
  try {
    await ensureAnexosAcademicFormationTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;

    // Verificar que la formación académica pertenece a un anexo del usuario
    const [formaciones] = await pool.execute(
      `SELECT fa.IDACADEMIC FROM anexos_academic_formation fa
       INNER JOIN anexos a ON fa.IDANEXO = a.IDANEXO
       WHERE fa.IDACADEMIC = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (formaciones.length === 0) {
      return res.status(404).json({ error: 'Formación académica no encontrada o no pertenece al usuario' });
    }

    await pool.execute(
      'DELETE FROM anexos_academic_formation WHERE IDACADEMIC = ?',
      [id]
    );

    res.status(200).json({ message: 'Formación académica eliminada exitosamente' });
  } catch (error) {
    console.error('❌ Error al eliminar formación académica:', error);
    res.status(500).json({
      error: 'Error al eliminar formación académica',
      details: error.message
    });
  }
};

// ============================================================
// CRUD PARA IDIOMAS Y/O DIALECTOS
// ============================================================

// GET - Obtener todos los idiomas de un anexo
export const obtenerIdiomas = async (req, res) => {
  try {
    await ensureAnexosLanguageSkillsTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [idiomas] = await pool.execute(
      `SELECT IDLANGUAGE, idiomaDialecto, nivel, fechaCreacion
       FROM anexos_language_skills 
       WHERE IDANEXO = ? 
       ORDER BY fechaCreacion ASC`,
      [anexoId]
    );

    res.status(200).json({ idiomas });
  } catch (error) {
    console.error('❌ Error al obtener idiomas:', error);
    res.status(500).json({
      error: 'Error al obtener idiomas',
      details: error.message
    });
  }
};

// POST - Crear un nuevo idioma
export const crearIdioma = async (req, res) => {
  try {
    await ensureAnexosLanguageSkillsTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;
    const { idiomaDialecto, nivel } = req.body;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [result] = await pool.execute(
      `INSERT INTO anexos_language_skills (IDANEXO, idiomaDialecto, nivel) VALUES (?, ?, ?)`,
      [anexoId, idiomaDialecto || null, nivel || null]
    );

    const [nuevoIdioma] = await pool.execute(
      `SELECT IDLANGUAGE, idiomaDialecto, nivel, fechaCreacion
       FROM anexos_language_skills 
       WHERE IDLANGUAGE = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Idioma creado exitosamente',
      idioma: nuevoIdioma[0]
    });
  } catch (error) {
    console.error('❌ Error al crear idioma:', error);
    res.status(500).json({
      error: 'Error al crear idioma',
      details: error.message
    });
  }
};

// PUT - Actualizar un idioma
export const actualizarIdioma = async (req, res) => {
  try {
    await ensureAnexosLanguageSkillsTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;
    const { idiomaDialecto, nivel } = req.body;

    const [idiomas] = await pool.execute(
      `SELECT ls.IDLANGUAGE FROM anexos_language_skills ls
       INNER JOIN anexos a ON ls.IDANEXO = a.IDANEXO
       WHERE ls.IDLANGUAGE = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (idiomas.length === 0) {
      return res.status(404).json({ error: 'Idioma no encontrado o no pertenece al usuario' });
    }

    await pool.execute(
      `UPDATE anexos_language_skills SET idiomaDialecto = ?, nivel = ? WHERE IDLANGUAGE = ?`,
      [idiomaDialecto || null, nivel || null, id]
    );

    const [idiomaActualizado] = await pool.execute(
      `SELECT IDLANGUAGE, idiomaDialecto, nivel, fechaCreacion
       FROM anexos_language_skills 
       WHERE IDLANGUAGE = ?`,
      [id]
    );

    res.status(200).json({
      message: 'Idioma actualizado exitosamente',
      idioma: idiomaActualizado[0]
    });
  } catch (error) {
    console.error('❌ Error al actualizar idioma:', error);
    res.status(500).json({
      error: 'Error al actualizar idioma',
      details: error.message
    });
  }
};

// DELETE - Eliminar un idioma
export const eliminarIdioma = async (req, res) => {
  try {
    await ensureAnexosLanguageSkillsTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;

    const [idiomas] = await pool.execute(
      `SELECT ls.IDLANGUAGE FROM anexos_language_skills ls
       INNER JOIN anexos a ON ls.IDANEXO = a.IDANEXO
       WHERE ls.IDLANGUAGE = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (idiomas.length === 0) {
      return res.status(404).json({ error: 'Idioma no encontrado o no pertenece al usuario' });
    }

    await pool.execute('DELETE FROM anexos_language_skills WHERE IDLANGUAGE = ?', [id]);

    res.status(200).json({ message: 'Idioma eliminado exitosamente' });
  } catch (error) {
    console.error('❌ Error al eliminar idioma:', error);
    res.status(500).json({
      error: 'Error al eliminar idioma',
      details: error.message
    });
  }
};

// ============================================================
// CRUD PARA CONOCIMIENTOS DE OFIMÁTICA
// ============================================================

// GET - Obtener todos los conocimientos de ofimática de un anexo
export const obtenerOfimaticas = async (req, res) => {
  try {
    await ensureAnexosOfficeSkillsTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [ofimaticas] = await pool.execute(
      `SELECT IDOFFICE, materia, nivel, fechaCreacion
       FROM anexos_office_skills 
       WHERE IDANEXO = ? 
       ORDER BY fechaCreacion ASC`,
      [anexoId]
    );

    res.status(200).json({ ofimaticas });
  } catch (error) {
    console.error('❌ Error al obtener ofimáticas:', error);
    res.status(500).json({
      error: 'Error al obtener ofimáticas',
      details: error.message
    });
  }
};

// POST - Crear un nuevo conocimiento de ofimática
export const crearOfimatica = async (req, res) => {
  try {
    await ensureAnexosOfficeSkillsTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;
    const { materia, nivel } = req.body;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [result] = await pool.execute(
      `INSERT INTO anexos_office_skills (IDANEXO, materia, nivel) VALUES (?, ?, ?)`,
      [anexoId, materia || null, nivel || null]
    );

    const [nuevaOfimatica] = await pool.execute(
      `SELECT IDOFFICE, materia, nivel, fechaCreacion
       FROM anexos_office_skills 
       WHERE IDOFFICE = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Conocimiento de ofimática creado exitosamente',
      ofimatica: nuevaOfimatica[0]
    });
  } catch (error) {
    console.error('❌ Error al crear ofimática:', error);
    res.status(500).json({
      error: 'Error al crear ofimática',
      details: error.message
    });
  }
};

// PUT - Actualizar un conocimiento de ofimática
export const actualizarOfimatica = async (req, res) => {
  try {
    await ensureAnexosOfficeSkillsTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;
    const { materia, nivel } = req.body;

    const [ofimaticas] = await pool.execute(
      `SELECT os.IDOFFICE FROM anexos_office_skills os
       INNER JOIN anexos a ON os.IDANEXO = a.IDANEXO
       WHERE os.IDOFFICE = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (ofimaticas.length === 0) {
      return res.status(404).json({ error: 'Ofimática no encontrada o no pertenece al usuario' });
    }

    await pool.execute(
      `UPDATE anexos_office_skills SET materia = ?, nivel = ? WHERE IDOFFICE = ?`,
      [materia || null, nivel || null, id]
    );

    const [ofimaticaActualizada] = await pool.execute(
      `SELECT IDOFFICE, materia, nivel, fechaCreacion
       FROM anexos_office_skills 
       WHERE IDOFFICE = ?`,
      [id]
    );

    res.status(200).json({
      message: 'Ofimática actualizada exitosamente',
      ofimatica: ofimaticaActualizada[0]
    });
  } catch (error) {
    console.error('❌ Error al actualizar ofimática:', error);
    res.status(500).json({
      error: 'Error al actualizar ofimática',
      details: error.message
    });
  }
};

// DELETE - Eliminar un conocimiento de ofimática
export const eliminarOfimatica = async (req, res) => {
  try {
    await ensureAnexosOfficeSkillsTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;

    const [ofimaticas] = await pool.execute(
      `SELECT os.IDOFFICE FROM anexos_office_skills os
       INNER JOIN anexos a ON os.IDANEXO = a.IDANEXO
       WHERE os.IDOFFICE = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (ofimaticas.length === 0) {
      return res.status(404).json({ error: 'Ofimática no encontrada o no pertenece al usuario' });
    }

    await pool.execute('DELETE FROM anexos_office_skills WHERE IDOFFICE = ?', [id]);

    res.status(200).json({ message: 'Ofimática eliminada exitosamente' });
  } catch (error) {
    console.error('❌ Error al eliminar ofimática:', error);
    res.status(500).json({
      error: 'Error al eliminar ofimática',
      details: error.message
    });
  }
};

// ============================================================
// CRUD PARA ESTUDIOS DE ESPECIALIZACIÓN
// ============================================================

// GET - Obtener todos los estudios de especialización de un anexo
export const obtenerEspecializaciones = async (req, res) => {
  try {
    await ensureAnexosSpecializationStudiesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [especializaciones] = await pool.execute(
      `SELECT IDSPECIALIZATION, tipoEstudio, nombreEstudio, periodoInicio,
       periodoFin, horas, centroEstudio, fechaCreacion
       FROM anexos_specialization_studies 
       WHERE IDANEXO = ? 
       ORDER BY fechaCreacion ASC`,
      [anexoId]
    );

    res.status(200).json({ especializaciones });
  } catch (error) {
    console.error('❌ Error al obtener especializaciones:', error);
    res.status(500).json({
      error: 'Error al obtener especializaciones',
      details: error.message
    });
  }
};

// POST - Crear un nuevo estudio de especialización
export const crearEspecializacion = async (req, res) => {
  try {
    await ensureAnexosSpecializationStudiesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;
    const { tipoEstudio, nombreEstudio, periodoInicio, periodoFin, horas, centroEstudio } = req.body;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [result] = await pool.execute(
      `INSERT INTO anexos_specialization_studies (
        IDANEXO, tipoEstudio, nombreEstudio, periodoInicio,
        periodoFin, horas, centroEstudio
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [anexoId, tipoEstudio || null, nombreEstudio || null, periodoInicio || null,
        periodoFin || null, horas || null, centroEstudio || null]
    );

    const [nuevaEspecializacion] = await pool.execute(
      `SELECT IDSPECIALIZATION, tipoEstudio, nombreEstudio, periodoInicio,
       periodoFin, horas, centroEstudio, fechaCreacion
       FROM anexos_specialization_studies 
       WHERE IDSPECIALIZATION = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Especialización creada exitosamente',
      especializacion: nuevaEspecializacion[0]
    });
  } catch (error) {
    console.error('❌ Error al crear especialización:', error);
    res.status(500).json({
      error: 'Error al crear especialización',
      details: error.message
    });
  }
};

// PUT - Actualizar un estudio de especialización
export const actualizarEspecializacion = async (req, res) => {
  try {
    await ensureAnexosSpecializationStudiesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;
    const { tipoEstudio, nombreEstudio, periodoInicio, periodoFin, horas, centroEstudio } = req.body;

    const [especializaciones] = await pool.execute(
      `SELECT ss.IDSPECIALIZATION FROM anexos_specialization_studies ss
       INNER JOIN anexos a ON ss.IDANEXO = a.IDANEXO
       WHERE ss.IDSPECIALIZATION = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (especializaciones.length === 0) {
      return res.status(404).json({ error: 'Especialización no encontrada o no pertenece al usuario' });
    }

    await pool.execute(
      `UPDATE anexos_specialization_studies SET
       tipoEstudio = ?, nombreEstudio = ?, periodoInicio = ?,
       periodoFin = ?, horas = ?, centroEstudio = ?
       WHERE IDSPECIALIZATION = ?`,
      [tipoEstudio || null, nombreEstudio || null, periodoInicio || null,
      periodoFin || null, horas || null, centroEstudio || null, id]
    );

    const [especializacionActualizada] = await pool.execute(
      `SELECT IDSPECIALIZATION, tipoEstudio, nombreEstudio, periodoInicio,
       periodoFin, horas, centroEstudio, fechaCreacion
       FROM anexos_specialization_studies 
       WHERE IDSPECIALIZATION = ?`,
      [id]
    );

    res.status(200).json({
      message: 'Especialización actualizada exitosamente',
      especializacion: especializacionActualizada[0]
    });
  } catch (error) {
    console.error('❌ Error al actualizar especialización:', error);
    res.status(500).json({
      error: 'Error al actualizar especialización',
      details: error.message
    });
  }
};

// DELETE - Eliminar un estudio de especialización
export const eliminarEspecializacion = async (req, res) => {
  try {
    await ensureAnexosSpecializationStudiesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;

    const [especializaciones] = await pool.execute(
      `SELECT ss.IDSPECIALIZATION FROM anexos_specialization_studies ss
       INNER JOIN anexos a ON ss.IDANEXO = a.IDANEXO
       WHERE ss.IDSPECIALIZATION = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (especializaciones.length === 0) {
      return res.status(404).json({ error: 'Especialización no encontrada o no pertenece al usuario' });
    }

    await pool.execute('DELETE FROM anexos_specialization_studies WHERE IDSPECIALIZATION = ?', [id]);

    res.status(200).json({ message: 'Especialización eliminada exitosamente' });
  } catch (error) {
    console.error('❌ Error al eliminar especialización:', error);
    res.status(500).json({
      error: 'Error al eliminar especialización',
      details: error.message
    });
  }
};

// ============================================================
// CRUD PARA EXPERIENCIA LABORAL
// ============================================================

// GET - Obtener todas las experiencias laborales de un anexo
export const obtenerExperienciasLaborales = async (req, res) => {
  try {
    await ensureAnexosWorkExperienceTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [experiencias] = await pool.execute(
      `SELECT IDEXPERIENCE, empresaInstitucion, sectorGiroNegocio, puestoCargo,
       periodoDesde, periodoHasta, funcionPrincipal1, funcionPrincipal2,
       funcionPrincipal3, funcionPrincipal4, funcionPrincipal5, fechaCreacion
       FROM anexos_work_experience 
       WHERE IDANEXO = ? 
       ORDER BY fechaCreacion ASC`,
      [anexoId]
    );

    res.status(200).json({ experiencias });
  } catch (error) {
    console.error('❌ Error al obtener experiencias laborales:', error);
    res.status(500).json({
      error: 'Error al obtener experiencias laborales',
      details: error.message
    });
  }
};

// POST - Crear una nueva experiencia laboral
export const crearExperienciaLaboral = async (req, res) => {
  try {
    await ensureAnexosWorkExperienceTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;
    const { empresaInstitucion, sectorGiroNegocio, puestoCargo, periodoDesde, periodoHasta,
      funcionPrincipal1, funcionPrincipal2, funcionPrincipal3, funcionPrincipal4, funcionPrincipal5 } = req.body;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [result] = await pool.execute(
      `INSERT INTO anexos_work_experience (
        IDANEXO, empresaInstitucion, sectorGiroNegocio, puestoCargo,
        periodoDesde, periodoHasta, funcionPrincipal1, funcionPrincipal2,
        funcionPrincipal3, funcionPrincipal4, funcionPrincipal5
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [anexoId, empresaInstitucion || null, sectorGiroNegocio || null, puestoCargo || null,
        periodoDesde || null, periodoHasta || null, funcionPrincipal1 || null, funcionPrincipal2 || null,
        funcionPrincipal3 || null, funcionPrincipal4 || null, funcionPrincipal5 || null]
    );

    const [nuevaExperiencia] = await pool.execute(
      `SELECT IDEXPERIENCE, empresaInstitucion, sectorGiroNegocio, puestoCargo,
       periodoDesde, periodoHasta, funcionPrincipal1, funcionPrincipal2,
       funcionPrincipal3, funcionPrincipal4, funcionPrincipal5, fechaCreacion
       FROM anexos_work_experience 
       WHERE IDEXPERIENCE = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Experiencia laboral creada exitosamente',
      experiencia: nuevaExperiencia[0]
    });
  } catch (error) {
    console.error('❌ Error al crear experiencia laboral:', error);
    res.status(500).json({
      error: 'Error al crear experiencia laboral',
      details: error.message
    });
  }
};

// PUT - Actualizar una experiencia laboral
export const actualizarExperienciaLaboral = async (req, res) => {
  try {
    await ensureAnexosWorkExperienceTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;
    const { empresaInstitucion, sectorGiroNegocio, puestoCargo, periodoDesde, periodoHasta,
      funcionPrincipal1, funcionPrincipal2, funcionPrincipal3, funcionPrincipal4, funcionPrincipal5 } = req.body;

    const [experiencias] = await pool.execute(
      `SELECT we.IDEXPERIENCE FROM anexos_work_experience we
       INNER JOIN anexos a ON we.IDANEXO = a.IDANEXO
       WHERE we.IDEXPERIENCE = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (experiencias.length === 0) {
      return res.status(404).json({ error: 'Experiencia laboral no encontrada o no pertenece al usuario' });
    }

    await pool.execute(
      `UPDATE anexos_work_experience SET
       empresaInstitucion = ?, sectorGiroNegocio = ?, puestoCargo = ?,
       periodoDesde = ?, periodoHasta = ?, funcionPrincipal1 = ?, funcionPrincipal2 = ?,
       funcionPrincipal3 = ?, funcionPrincipal4 = ?, funcionPrincipal5 = ?
       WHERE IDEXPERIENCE = ?`,
      [empresaInstitucion || null, sectorGiroNegocio || null, puestoCargo || null,
      periodoDesde || null, periodoHasta || null, funcionPrincipal1 || null, funcionPrincipal2 || null,
      funcionPrincipal3 || null, funcionPrincipal4 || null, funcionPrincipal5 || null, id]
    );

    const [experienciaActualizada] = await pool.execute(
      `SELECT IDEXPERIENCE, empresaInstitucion, sectorGiroNegocio, puestoCargo,
       periodoDesde, periodoHasta, funcionPrincipal1, funcionPrincipal2,
       funcionPrincipal3, funcionPrincipal4, funcionPrincipal5, fechaCreacion
       FROM anexos_work_experience 
       WHERE IDEXPERIENCE = ?`,
      [id]
    );

    res.status(200).json({
      message: 'Experiencia laboral actualizada exitosamente',
      experiencia: experienciaActualizada[0]
    });
  } catch (error) {
    console.error('❌ Error al actualizar experiencia laboral:', error);
    res.status(500).json({
      error: 'Error al actualizar experiencia laboral',
      details: error.message
    });
  }
};

// DELETE - Eliminar una experiencia laboral
export const eliminarExperienciaLaboral = async (req, res) => {
  try {
    await ensureAnexosWorkExperienceTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;

    const [experiencias] = await pool.execute(
      `SELECT we.IDEXPERIENCE FROM anexos_work_experience we
       INNER JOIN anexos a ON we.IDANEXO = a.IDANEXO
       WHERE we.IDEXPERIENCE = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (experiencias.length === 0) {
      return res.status(404).json({ error: 'Experiencia laboral no encontrada o no pertenece al usuario' });
    }

    await pool.execute('DELETE FROM anexos_work_experience WHERE IDEXPERIENCE = ?', [id]);

    res.status(200).json({ message: 'Experiencia laboral eliminada exitosamente' });
  } catch (error) {
    console.error('❌ Error al eliminar experiencia laboral:', error);
    res.status(500).json({
      error: 'Error al eliminar experiencia laboral',
      details: error.message
    });
  }
};

// ============================================================
// CRUD PARA REFERENCIAS LABORALES
// ============================================================

// GET - Obtener todas las referencias laborales de un anexo
export const obtenerReferenciasLaborales = async (req, res) => {
  try {
    await ensureAnexosLaborReferencesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [referencias] = await pool.execute(
      `SELECT IDREFERENCE, empresaEntidad, direccion, cargoPostulante,
       nombreCargoJefe, telefonos, correoElectronico, fechaCreacion
       FROM anexos_labor_references 
       WHERE IDANEXO = ? 
       ORDER BY fechaCreacion ASC`,
      [anexoId]
    );

    res.status(200).json({ referencias });
  } catch (error) {
    console.error('❌ Error al obtener referencias laborales:', error);
    res.status(500).json({
      error: 'Error al obtener referencias laborales',
      details: error.message
    });
  }
};

// POST - Crear una nueva referencia laboral
export const crearReferenciaLaboral = async (req, res) => {
  try {
    await ensureAnexosLaborReferencesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;
    const { empresaEntidad, direccion, cargoPostulante, nombreCargoJefe, telefonos, correoElectronico } = req.body;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [result] = await pool.execute(
      `INSERT INTO anexos_labor_references (
        IDANEXO, empresaEntidad, direccion, cargoPostulante,
        nombreCargoJefe, telefonos, correoElectronico
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [anexoId, empresaEntidad || null, direccion || null, cargoPostulante || null,
        nombreCargoJefe || null, telefonos || null, correoElectronico || null]
    );

    const [nuevaReferencia] = await pool.execute(
      `SELECT IDREFERENCE, empresaEntidad, direccion, cargoPostulante,
       nombreCargoJefe, telefonos, correoElectronico, fechaCreacion
       FROM anexos_labor_references 
       WHERE IDREFERENCE = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Referencia laboral creada exitosamente',
      referencia: nuevaReferencia[0]
    });
  } catch (error) {
    console.error('❌ Error al crear referencia laboral:', error);
    res.status(500).json({
      error: 'Error al crear referencia laboral',
      details: error.message
    });
  }
};

// PUT - Actualizar una referencia laboral
export const actualizarReferenciaLaboral = async (req, res) => {
  try {
    await ensureAnexosLaborReferencesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;
    const { empresaEntidad, direccion, cargoPostulante, nombreCargoJefe, telefonos, correoElectronico } = req.body;

    const [referencias] = await pool.execute(
      `SELECT lr.IDREFERENCE FROM anexos_labor_references lr
       INNER JOIN anexos a ON lr.IDANEXO = a.IDANEXO
       WHERE lr.IDREFERENCE = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (referencias.length === 0) {
      return res.status(404).json({ error: 'Referencia laboral no encontrada o no pertenece al usuario' });
    }

    await pool.execute(
      `UPDATE anexos_labor_references SET
       empresaEntidad = ?, direccion = ?, cargoPostulante = ?,
       nombreCargoJefe = ?, telefonos = ?, correoElectronico = ?
       WHERE IDREFERENCE = ?`,
      [empresaEntidad || null, direccion || null, cargoPostulante || null,
      nombreCargoJefe || null, telefonos || null, correoElectronico || null, id]
    );

    const [referenciaActualizada] = await pool.execute(
      `SELECT IDREFERENCE, empresaEntidad, direccion, cargoPostulante,
       nombreCargoJefe, telefonos, correoElectronico, fechaCreacion
       FROM anexos_labor_references 
       WHERE IDREFERENCE = ?`,
      [id]
    );

    res.status(200).json({
      message: 'Referencia laboral actualizada exitosamente',
      referencia: referenciaActualizada[0]
    });
  } catch (error) {
    console.error('❌ Error al actualizar referencia laboral:', error);
    res.status(500).json({
      error: 'Error al actualizar referencia laboral',
      details: error.message
    });
  }
};

// DELETE - Eliminar una referencia laboral
export const eliminarReferenciaLaboral = async (req, res) => {
  try {
    await ensureAnexosLaborReferencesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;

    const [referencias] = await pool.execute(
      `SELECT lr.IDREFERENCE FROM anexos_labor_references lr
       INNER JOIN anexos a ON lr.IDANEXO = a.IDANEXO
       WHERE lr.IDREFERENCE = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (referencias.length === 0) {
      return res.status(404).json({ error: 'Referencia laboral no encontrada o no pertenece al usuario' });
    }

    await pool.execute('DELETE FROM anexos_labor_references WHERE IDREFERENCE = ?', [id]);

    res.status(200).json({ message: 'Referencia laboral eliminada exitosamente' });
  } catch (error) {
    console.error('❌ Error al eliminar referencia laboral:', error);
    res.status(500).json({
      error: 'Error al eliminar referencia laboral',
      details: error.message
    });
  }
};

// ============================================================
// CRUD PARA PARIENTES EN UGEL
// ============================================================

// GET - Obtener todos los parientes en UGEL de un anexo
export const obtenerParientes = async (req, res) => {
  try {
    await ensureAnexosRelativesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [parientes] = await pool.execute(
      `SELECT IDRELATIVE, gradoParentesco, areaTrabajo, apellidos, nombres, fechaCreacion
       FROM anexos_relatives 
       WHERE IDANEXO = ? 
       ORDER BY fechaCreacion ASC`,
      [anexoId]
    );

    res.status(200).json({ parientes });
  } catch (error) {
    console.error('❌ Error al obtener parientes:', error);
    res.status(500).json({
      error: 'Error al obtener parientes',
      details: error.message
    });
  }
};

// POST - Crear un nuevo pariente en UGEL
export const crearPariente = async (req, res) => {
  try {
    await ensureAnexosRelativesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const anexoId = req.params.anexoId;
    const { gradoParentesco, areaTrabajo, apellidos, nombres } = req.body;

    const [anexos] = await pool.execute(
      'SELECT IDANEXO FROM anexos WHERE IDANEXO = ? AND IDUSUARIO = ?',
      [anexoId, userId]
    );

    if (anexos.length === 0) {
      return res.status(404).json({ error: 'Anexo no encontrado o no pertenece al usuario' });
    }

    const [result] = await pool.execute(
      `INSERT INTO anexos_relatives (IDANEXO, gradoParentesco, areaTrabajo, apellidos, nombres) VALUES (?, ?, ?, ?, ?)`,
      [anexoId, gradoParentesco || null, areaTrabajo || null, apellidos || null, nombres || null]
    );

    const [nuevoPariente] = await pool.execute(
      `SELECT IDRELATIVE, gradoParentesco, areaTrabajo, apellidos, nombres, fechaCreacion
       FROM anexos_relatives 
       WHERE IDRELATIVE = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Pariente creado exitosamente',
      pariente: nuevoPariente[0]
    });
  } catch (error) {
    console.error('❌ Error al crear pariente:', error);
    res.status(500).json({
      error: 'Error al crear pariente',
      details: error.message
    });
  }
};

// PUT - Actualizar un pariente en UGEL
export const actualizarPariente = async (req, res) => {
  try {
    await ensureAnexosRelativesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;
    const { gradoParentesco, areaTrabajo, apellidos, nombres } = req.body;

    const [parientes] = await pool.execute(
      `SELECT r.IDRELATIVE FROM anexos_relatives r
       INNER JOIN anexos a ON r.IDANEXO = a.IDANEXO
       WHERE r.IDRELATIVE = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (parientes.length === 0) {
      return res.status(404).json({ error: 'Pariente no encontrado o no pertenece al usuario' });
    }

    await pool.execute(
      `UPDATE anexos_relatives SET gradoParentesco = ?, areaTrabajo = ?, apellidos = ?, nombres = ? WHERE IDRELATIVE = ?`,
      [gradoParentesco || null, areaTrabajo || null, apellidos || null, nombres || null, id]
    );

    const [parienteActualizado] = await pool.execute(
      `SELECT IDRELATIVE, gradoParentesco, areaTrabajo, apellidos, nombres, fechaCreacion
       FROM anexos_relatives 
       WHERE IDRELATIVE = ?`,
      [id]
    );

    res.status(200).json({
      message: 'Pariente actualizado exitosamente',
      pariente: parienteActualizado[0]
    });
  } catch (error) {
    console.error('❌ Error al actualizar pariente:', error);
    res.status(500).json({
      error: 'Error al actualizar pariente',
      details: error.message
    });
  }
};

// DELETE - Eliminar un pariente en UGEL
export const eliminarPariente = async (req, res) => {
  try {
    await ensureAnexosRelativesTable();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;
    const { id } = req.params;

    const [parientes] = await pool.execute(
      `SELECT r.IDRELATIVE FROM anexos_relatives r
       INNER JOIN anexos a ON r.IDANEXO = a.IDANEXO
       WHERE r.IDRELATIVE = ? AND a.IDUSUARIO = ?`,
      [id, userId]
    );

    if (parientes.length === 0) {
      return res.status(404).json({ error: 'Pariente no encontrado o no pertenece al usuario' });
    }

    await pool.execute('DELETE FROM anexos_relatives WHERE IDRELATIVE = ?', [id]);

    res.status(200).json({ message: 'Pariente eliminado exitosamente' });
  } catch (error) {
    console.error('❌ Error al eliminar pariente:', error);
    res.status(500).json({
      error: 'Error al eliminar pariente',
      details: error.message
    });
  }
};

// Función para asegurar que existe la tabla de reportes de IA
async function ensureReportesIATable() {
  try {
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reportes_ia'`
    );

    if (tables.length === 0) {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS reportes_ia (
          IDREPORTE INT AUTO_INCREMENT PRIMARY KEY,
          IDUSUARIO INT NOT NULL,
          IDCONVOCATORIA INT NOT NULL,
          nombre_completo VARCHAR(255),
          email VARCHAR(255),
          puesto_postulado VARCHAR(255),
          score INT DEFAULT 0,
          calificacion DECIMAL(3,1) DEFAULT 0,
          estado_evaluacion ENUM('approved', 'rejected', 'pending') DEFAULT 'pending',
          apto BOOLEAN DEFAULT FALSE,
          analisis LONGTEXT,
          razones JSON,
          motivo_rechazo TEXT,
          experiencia_relevante TEXT,
          habilidades_clave JSON,
          convocatoria_usada JSON,
          totalAnexos INT DEFAULT 0,
          declaraciones JSON,
          reglasAplicadas JSON NULL,
          bonosAplicados JSON NULL,
          fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_usuario (IDUSUARIO),
          INDEX idx_convocatoria (IDCONVOCATORIA),
          INDEX idx_estado (estado_evaluacion),
          INDEX idx_fechaCreacion (fechaCreacion),
          UNIQUE KEY unique_usuario_convocatoria (IDUSUARIO, IDCONVOCATORIA)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabla reportes_ia creada exitosamente con soporte para reglas y bonos');
    } else {
      // Verificar si las columnas de reglas y bonos existen, y agregarlas si no
      try {
        const [columnas] = await pool.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'reportes_ia' 
          AND TABLE_SCHEMA = DATABASE()
          AND COLUMN_NAME IN ('reglasAplicadas', 'bonosAplicados')
        `);

        const tieneReglas = columnas.some(c => c.COLUMN_NAME === 'reglasAplicadas');
        const tieneBonos = columnas.some(c => c.COLUMN_NAME === 'bonosAplicados');

        if (!tieneReglas) {
          await pool.execute(`
            ALTER TABLE reportes_ia 
            ADD COLUMN reglasAplicadas JSON NULL
          `);
          console.log('✅ Columna reglasAplicadas agregada a reportes_ia');
        }

        if (!tieneBonos) {
          await pool.execute(`
            ALTER TABLE reportes_ia 
            ADD COLUMN bonosAplicados JSON NULL
          `);
          console.log('✅ Columna bonosAplicados agregada a reportes_ia');
        }
      } catch (alterError) {
        console.warn('⚠️ Advertencia al verificar/agregar columnas de reglas y bonos:', alterError.message);
      }
    }
  } catch (error) {
    console.error('⚠️ Error al crear tabla reportes_ia:', error.message);
  }
}

// Función helper para descargar archivos desde URLs
async function descargarArchivoDesdeURL(url, token = null) {
  try {
    const headers = {
      'Accept': 'application/pdf, application/octet-stream, */*',
      'User-Agent': 'Mozilla/5.0'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error descargando archivo desde ${url}:`, error.message);
    return null;
  }
}

// Función helper para extraer texto de PDF (básico)
async function extraerTextoDePDF(buffer) {
  try {
    // Por ahora retornamos null, pero aquí se podría integrar una librería como pdf-parse
    // const pdfParse = require('pdf-parse');
    // const data = await pdfParse(buffer);
    // return data.text;
    return null;
  } catch (error) {
    console.error('Error extrayendo texto de PDF:', error.message);
    return null;
  }
}

// Función helper para generar automáticamente reporte de IA cuando se sube/actualiza un anexo
// Esta función se ejecuta de forma asíncrona y no bloquea la respuesta al usuario
async function generarReporteIAAutomatico(userId, convocatoriaId, anexoId = null) {
  try {
    console.log(`🤖 Iniciando generación automática de reporte IA para usuario ${userId}, convocatoria ${convocatoriaId}`);

    // Asegurar que la tabla de reportes existe
    await ensureReportesIATable();

    // Si no hay convocatoria, no generar reporte
    if (!convocatoriaId) {
      console.log(`⚠️ No se puede generar reporte: no hay convocatoria asociada`);
      return;
    }

    // Obtener anexos completos del usuario para esta convocatoria
    const [anexosCompletos] = await pool.execute(
      `SELECT * FROM anexos_completos 
       WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?
       ORDER BY fechaCreacion DESC`,
      [userId, convocatoriaId]
    );

    if (anexosCompletos.length === 0) {
      console.log(`⚠️ No se encontraron anexos completos para usuario ${userId} y convocatoria ${convocatoriaId}`);
      return;
    }

    // Obtener datos del usuario
    const [usuarios] = await pool.execute(
      `SELECT IDUSUARIO, nombreCompleto, documento, correo FROM usuarios WHERE IDUSUARIO = ?`,
      [userId]
    );

    if (usuarios.length === 0) {
      console.log(`⚠️ Usuario ${userId} no encontrado`);
      return;
    }

    const postulante = usuarios[0];

    // Obtener convocatoria
    const [convocatorias] = await pool.execute(
      'SELECT * FROM convocatorias WHERE IDCONVOCATORIA = ?',
      [convocatoriaId]
    );

    if (convocatorias.length === 0) {
      console.log(`⚠️ Convocatoria ${convocatoriaId} no encontrada`);
      return;
    }

    const convocatoria = convocatorias[0];

    // Obtener curriculum del usuario
    const [curriculums] = await pool.execute(
      `SELECT * FROM curriculum WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC LIMIT 1`,
      [userId]
    );
    const curriculum = curriculums.length > 0 ? curriculums[0] : null;

    // Parsear datos JSON de anexos
    const parseJson = (value) => {
      if (!value) return [];
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        } catch {
          return [];
        }
      }
      if (Buffer.isBuffer(value)) {
        try {
          const bufferString = value.toString('utf8');
          const parsed = JSON.parse(bufferString);
          return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        } catch {
          return [];
        }
      }
      if (Array.isArray(value)) return value;
      if (typeof value === 'object') return [value];
      return [];
    };

    // Preparar anexos para análisis
    const anexosParaAnalisis = anexosCompletos.map(anexo => {
      const nombreCompleto = `${anexo.nombres || ''} ${anexo.apellidoPaterno || ''} ${anexo.apellidoMaterno || ''}`.trim() || postulante.nombreCompleto;

      return {
        IDANEXO: anexo.IDANEXO,
        tipoAnexo: 'Anexo 01',
        nombreArchivo: `Anexo_${anexo.IDANEXO}.pdf`,
        nombrePostulante: nombreCompleto,
        dniPostulante: anexo.dni || postulante.documento,
        formacionAcademica: parseJson(anexo.formacionAcademica),
        especializacion: parseJson(anexo.especializacion),
        experienciaLaboral: parseJson(anexo.experienciaLaboral),
        referenciasLaborales: parseJson(anexo.referenciasLaborales),
        idiomas: parseJson(anexo.idiomas),
        ofimatica: parseJson(anexo.ofimatica),
        colegioProfesional: anexo.colegioProfesional || null,
        colegioProfesionalHabilitado: anexo.colegioProfesionalHabilitado || 'NO',
        nColegiatura: anexo.nColegiatura || null,
        declaraciones: {
          infoVerdadera: Boolean(anexo.veracidadDatos),
          leyProteccionDatos: Boolean(anexo.leyProteccionDatos),
          datosConsignadosVerdaderos: Boolean(anexo.datosConsignadosVerdaderos),
          cumploRequisitosMinimos: Boolean(anexo.cumplirRequisitos),
          plenosDerechosCiviles: Boolean(anexo.plenosDerechosCiviles),
          noCondenaDolosa: Boolean(anexo.noCondenaDolosa),
          noInhabilitacion: Boolean(anexo.noEstarInhabilitado),
          noSentenciaCondenatoria: Boolean(anexo.noSentenciaCondenatoria),
          noAntecedentesPenales: Boolean(anexo.noAntecedentesPenales),
          noAntecedentesPoliciales: Boolean(anexo.noAntecedentesPoliciales),
          noAntecedentesJudiciales: Boolean(anexo.noAntecedentesJudiciales),
          noParientesUGEL: Boolean(anexo.noParientesUGEL),
        }
      };
    });

    // Llamar al análisis de IA
    const datosCompletos = {
      convocatoria,
      anexos: anexosParaAnalisis,
      curriculum,
      postulante: {
        id: userId,
        nombreCompleto: postulante.nombreCompleto,
        documento: postulante.documento,
        email: postulante.correo,
        totalAnexos: anexosCompletos.length
      },
      incluirCV: curriculum !== null,
      incluirReglasBonos: false // Por ahora no incluimos reglas y bonos en la generación automática
    };

    const { analizarTodosLosAnexos } = await import('../services/aiAnalysis.js');
    const analisisIA = await analizarTodosLosAnexos(datosCompletos);

    // Determinar score y estado
    let score = 0;
    let estado_evaluacion = 'pending';
    let apto = false;
    const razones = [];

    const anexoPrincipal = anexosCompletos[0];
    if (anexoPrincipal) {
      if (!anexoPrincipal.veracidadDatos) razones.push('Declaración de veracidad no marcada');
      if (!anexoPrincipal.leyProteccionDatos) razones.push('Declaración de protección de datos no marcada');
      if (!anexoPrincipal.cumplirRequisitos) razones.push('No cumple requisitos mínimos declarados');
    }

    const analisisLower = (analisisIA || '').toLowerCase();
    const analisisUpper = (analisisIA || '').toUpperCase();

    const scoreMatch = analisisIA?.match(/SCORE[:\s]*(\d+)/i);
    if (scoreMatch) {
      score = parseInt(scoreMatch[1]);
    }

    let nivelCumplimiento = 'PENDIENTE';
    if (analisisLower.includes('aprobado') || analisisLower.includes('cumple completamente') || analisisUpper.includes('APROBADO')) {
      nivelCumplimiento = 'APROBADO';
      if (!scoreMatch) score = 75;
      estado_evaluacion = 'approved';
      apto = true;
    } else if (analisisLower.includes('rechazado') || analisisLower.includes('no cumple') || analisisUpper.includes('RECHAZADO') || razones.length > 2) {
      nivelCumplimiento = 'RECHAZADO';
      if (!scoreMatch) score = 30;
      estado_evaluacion = 'rejected';
      apto = false;
    } else if (analisisLower.includes('parcial') || analisisUpper.includes('PARCIAL')) {
      nivelCumplimiento = 'PARCIAL';
      if (!scoreMatch) score = 50;
      estado_evaluacion = 'pending';
      apto = false;
    } else {
      if (!scoreMatch) score = 40;
      estado_evaluacion = 'pending';
      apto = false;
    }

    // Ajustar score
    if (anexosCompletos.length > 0) score += Math.min(20, anexosCompletos.length * 2);
    if (curriculum) score += 5;
    if (razones.length === 0) score += 5;
    score = Math.min(100, Math.max(0, score));

    // Extraer habilidades y experiencia
    const habilidadesClave = [];
    let experienciaRelevante = '';

    if (analisisIA) {
      // Buscar la sección de habilidades con el nuevo formato
      const habilidadesMatch = analisisIA.match(/💼 HABILIDADES IDENTIFICADAS[\s\S]*?Habilidades:\s*(.+?)(?:\n\n|═══|$)/i);
      if (habilidadesMatch) {
        const habilidadesTexto = habilidadesMatch[1];
        // Dividir por comas y limpiar
        const habilidadesLista = habilidadesTexto.split(',').map(h => h.trim()).filter(h => h.length > 2 && h.length < 50);
        habilidadesClave.push(...habilidadesLista.slice(0, 10));
        console.log('✅ Habilidades extraídas:', habilidadesClave);
      } else {
        // Fallback: buscar formato antiguo
        const habilidadesMatchOld = analisisIA.match(/HABILIDADES[:\s]*(.+?)(?:\n\n|\n═|$)/is);
        if (habilidadesMatchOld) {
          const habilidadesTexto = habilidadesMatchOld[1];
          const habilidadesLista = habilidadesTexto.split(/\n|,|-/).filter(h => h.trim().length > 3);
          habilidadesClave.push(...habilidadesLista.slice(0, 10).map(h => h.trim()));
        }
      }

      const expMatch = analisisIA.match(/EXPERIENCIA[:\s]*(.+?)(?:\n\n|\n═|ANÁLISIS|EVALUACIÓN|$)/is);
      if (expMatch) {
        experienciaRelevante = expMatch[1].substring(0, 500).trim();
      }
    }

    // Si no se encontraron habilidades, extraer de los datos del postulante
    if (habilidadesClave.length === 0) {
      // Extraer habilidades de ofimática e idiomas
      if (anexosCompletos && anexosCompletos.length > 0) {
        const primerAnexo = anexosCompletos[0];

        // Agregar conocimientos de ofimática
        if (primerAnexo.ofimatica && Array.isArray(primerAnexo.ofimatica)) {
          primerAnexo.ofimatica.forEach(ofi => {
            if (ofi.programa && ofi.nivel) {
              habilidadesClave.push(`${ofi.programa} - ${ofi.nivel}`);
            }
          });
        }

        // Agregar idiomas
        if (primerAnexo.idiomas && Array.isArray(primerAnexo.idiomas)) {
          primerAnexo.idiomas.forEach(idioma => {
            if (idioma.idioma && idioma.nivel) {
              habilidadesClave.push(`${idioma.idioma} - ${idioma.nivel}`);
            }
          });
        }

        // Agregar habilidades genéricas basadas en experiencia
        if (primerAnexo.experienciaLaboral && Array.isArray(primerAnexo.experienciaLaboral) && primerAnexo.experienciaLaboral.length > 0) {
          habilidadesClave.push('Experiencia laboral comprobada');
        }

        if (primerAnexo.formacionAcademica && Array.isArray(primerAnexo.formacionAcademica) && primerAnexo.formacionAcademica.length > 0) {
          habilidadesClave.push('Formación académica');
        }
      }

      // Si aún no hay habilidades, agregar mensaje por defecto
      if (habilidadesClave.length === 0) {
        habilidadesClave.push('Trabajo en equipo', 'Comunicación efectiva', 'Responsabilidad', 'Adaptabilidad');
      }
    }

    if (!experienciaRelevante) {
      experienciaRelevante = `Total de anexos: ${anexosCompletos.length}. Experiencia laboral presentada en los anexos.`;
    }

    // Preparar datos de convocatoria y declaraciones
    const convocatoriaData = {
      id: convocatoria.IDCONVOCATORIA,
      numero_cas: convocatoria.numeroCAS,
      area: convocatoria.area,
      puesto: convocatoria.puesto,
      requisitos: convocatoria.requisitos,
      experiencia: convocatoria.experiencia,
      licenciatura: convocatoria.licenciatura,
      habilidades: convocatoria.habilidades,
      expPublicaMin: convocatoria.expPublicaMin,
      expPublicaMax: convocatoria.expPublicaMax,
      sueldo: convocatoria.sueldo
    };

    const declaracionesData = anexosCompletos.length > 0 ? {
      infoVerdadera: Boolean(anexosCompletos[0].veracidadDatos),
      leyProteccionDatos: Boolean(anexosCompletos[0].leyProteccionDatos),
      datosConsignadosVerdaderos: Boolean(anexosCompletos[0].datosConsignadosVerdaderos),
      cumploRequisitosMinimos: Boolean(anexosCompletos[0].cumplirRequisitos),
      plenosDerechosCiviles: Boolean(anexosCompletos[0].plenosDerechosCiviles),
      noCondenaDolosa: Boolean(anexosCompletos[0].noCondenaDolosa),
      noInhabilitacion: Boolean(anexosCompletos[0].noEstarInhabilitado),
      noSentenciaCondenatoria: Boolean(anexosCompletos[0].noSentenciaCondenatoria),
      noAntecedentesPenales: Boolean(anexosCompletos[0].noAntecedentesPenales),
      noAntecedentesPoliciales: Boolean(anexosCompletos[0].noAntecedentesPoliciales),
      noAntecedentesJudiciales: Boolean(anexosCompletos[0].noAntecedentesJudiciales),
      noParientesUGEL: Boolean(anexosCompletos[0].noParientesUGEL),
    } : null;

    // Guardar el reporte en la base de datos
    await pool.execute(
      `INSERT INTO reportes_ia (
        IDUSUARIO, IDCONVOCATORIA, nombre_completo, email, puesto_postulado,
        score, calificacion, estado_evaluacion, apto, analisis, razones,
        experiencia_relevante, habilidades_clave, convocatoria_usada, totalAnexos, declaraciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nombre_completo = VALUES(nombre_completo),
        email = VALUES(email),
        puesto_postulado = VALUES(puesto_postulado),
        score = VALUES(score),
        calificacion = VALUES(calificacion),
        estado_evaluacion = VALUES(estado_evaluacion),
        apto = VALUES(apto),
        analisis = VALUES(analisis),
        razones = VALUES(razones),
        experiencia_relevante = VALUES(experiencia_relevante),
        habilidades_clave = VALUES(habilidades_clave),
        convocatoria_usada = VALUES(convocatoria_usada),
        totalAnexos = VALUES(totalAnexos),
        declaraciones = VALUES(declaraciones),
        fechaActualizacion = CURRENT_TIMESTAMP`,
      [
        userId,
        convocatoriaId,
        postulante.nombreCompleto || 'N/A',
        postulante.correo || 'N/A',
        convocatoria.puesto || 'N/A',
        score,
        Number((score / 10).toFixed(1)),
        estado_evaluacion,
        apto,
        analisisIA,
        JSON.stringify(razones),
        experienciaRelevante,
        JSON.stringify(habilidadesClave),
        JSON.stringify(convocatoriaData),
        anexosCompletos.length,
        declaracionesData ? JSON.stringify(declaracionesData) : null
      ]
    );

    console.log(`✅ Reporte de IA generado automáticamente para usuario ${userId}, convocatoria ${convocatoriaId}, score: ${score}`);
  } catch (error) {
    console.error(`❌ Error generando reporte automático de IA para usuario ${userId}:`, error.message);
    console.error(`❌ Stack trace:`, error.stack);
    // No lanzar el error para no afectar la respuesta al usuario
  }
}

// Controlador para analizar anexos con convocatoria y evaluar requisitos
// Ahora soporta URLs de CV y anexos, y análisis de reglas y bonos
export const analizarAnexosConConvocatoria = async (req, res) => {
  try {
    console.log('🎯 analizarAnexosConConvocatoria llamado');
    console.log('📋 Params:', req.params);
    console.log('📦 Body keys:', Object.keys(req.body || {}));
    
    const { postulanteId, convocatoriaId } = req.params;
    const { cvUrl, anexosUrls, incluirCV, incluirReglasBonos, convocatoria: convocatoriaFromBody } = req.body || {};

    if (!postulanteId || !convocatoriaId) {
      console.log('❌ Faltan parámetros requeridos');
      return res.status(400).json({
        error: 'postulanteId y convocatoriaId son requeridos'
      });
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Asegurar que la tabla de reportes existe
    await ensureReportesIATable();

    // Obtener convocatoria con todos sus requisitos
    // Si se proporciona en el body, usarla, sino obtener de BD
    let convocatoria = convocatoriaFromBody;
    if (!convocatoria) {
      const [convocatorias] = await pool.execute(
        'SELECT * FROM convocatorias WHERE IDCONVOCATORIA = ?',
        [convocatoriaId]
      );

      if (convocatorias.length === 0) {
        console.log(`⚠️ Convocatoria ${convocatoriaId} no encontrada, buscando alternativas...`);
        
        // Intentar obtener la primera convocatoria activa
        const [convocatoriasActivas] = await pool.execute(
          'SELECT * FROM convocatorias WHERE publicada = 1 ORDER BY IDCONVOCATORIA DESC LIMIT 1'
        );
        
        if (convocatoriasActivas.length > 0) {
          convocatoria = convocatoriasActivas[0];
          console.log(`✅ Usando convocatoria alternativa: ${convocatoria.IDCONVOCATORIA} - ${convocatoria.puesto}`);
        } else {
          // Si no hay convocatorias activas, obtener cualquier convocatoria
          const [todasConvocatorias] = await pool.execute(
            'SELECT * FROM convocatorias ORDER BY IDCONVOCATORIA DESC LIMIT 1'
          );
          
          if (todasConvocatorias.length > 0) {
            convocatoria = todasConvocatorias[0];
            console.log(`✅ Usando última convocatoria disponible: ${convocatoria.IDCONVOCATORIA} - ${convocatoria.puesto}`);
          } else {
            console.log('⚠️ No hay convocatorias en la BD, continuando sin convocatoria');
            convocatoria = null;
          }
        }
      } else {
        convocatoria = convocatorias[0];
        console.log(`✅ Convocatoria encontrada: ${convocatoria.IDCONVOCATORIA} - ${convocatoria.puesto}`);
      }
    }

    // Obtener todos los anexos completos del postulante
    // Si se proporcionan URLs, no es necesario obtener de BD (pero lo hacemos para datos adicionales)
    const [anexosCompletos] = await pool.execute(
      `SELECT * FROM anexos_completos 
       WHERE IDUSUARIO = ? 
       ORDER BY fechaCreacion DESC`,
      [postulanteId]
    );

    // Obtener curriculum del postulante
    let curriculum = null;
    if (incluirCV && cvUrl) {
      // Si se proporciona URL de CV, intentar descargarlo y analizarlo
      console.log(`📄 Descargando CV desde URL: ${cvUrl}`);
      const cvBuffer = await descargarArchivoDesdeURL(cvUrl, token);
      if (cvBuffer) {
        curriculum = {
          nombreArchivo: cvUrl.split('/').pop() || 'curriculum.pdf',
          tipoArchivo: 'application/pdf',
          pdfFile: cvBuffer,
          url: cvUrl,
          desdeURL: true
        };
        console.log(`✅ CV descargado exitosamente desde URL (${cvBuffer.length} bytes)`);
      }
    } else {
      // Si no se proporciona URL, obtener de BD
      const [curriculums] = await pool.execute(
        `SELECT * FROM curriculum WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC LIMIT 1`,
        [postulanteId]
      );
      curriculum = curriculums.length > 0 ? curriculums[0] : null;
    }

    // Obtener datos del postulante
    const [usuarios] = await pool.execute(
      `SELECT IDUSUARIO as id, nombreCompleto, documento, correo as email, telefono 
       FROM usuarios WHERE IDUSUARIO = ?`,
      [postulanteId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Postulante no encontrado' });
    }

    const postulante = usuarios[0];

    // Función helper para parsear JSON fields de forma segura (incluye Buffer de MySQL)
    const parseJson = (value, fieldName = 'unknown') => {
      if (!value && value !== 0 && value !== false) {
        console.log(`⚠️ Campo ${fieldName} está vacío o es null/undefined`);
        return [];
      }

      // Si ya es un array, retornarlo directamente
      if (Array.isArray(value)) {
        console.log(`✅ Campo ${fieldName} es array con ${value.length} elementos`);
        return value;
      }

      // Si es un objeto (pero no array), retornarlo como array de un elemento
      if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
        console.log(`✅ Campo ${fieldName} es objeto, convirtiendo a array`);
        return [value];
      }

      // Si es string, intentar parsear como JSON
      if (typeof value === 'string') {
        try {
          // Si el string está vacío, retornar array vacío
          if (value.trim() === '' || value.trim() === 'null' || value.trim() === 'undefined') {
            console.log(`⚠️ Campo ${fieldName} es string vacío o 'null'`);
            return [];
          }
          const parsed = JSON.parse(value);
          console.log(`✅ Campo ${fieldName} parseado desde string: ${Array.isArray(parsed) ? `array con ${parsed.length} elementos` : 'objeto'}`);
          return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        } catch (e) {
          console.warn(`⚠️ Error parseando JSON en campo ${fieldName}:`, e.message);
          // Si no es JSON válido, puede ser un string simple, retornar array vacío
          return [];
        }
      }

      // Si es Buffer, convertirlo a string y luego parsear
      if (Buffer.isBuffer(value)) {
        try {
          const bufferString = value.toString('utf8');
          if (bufferString.trim() === '' || bufferString.trim() === 'null') {
            console.log(`⚠️ Campo ${fieldName} es Buffer vacío o 'null'`);
            return [];
          }
          const parsed = JSON.parse(bufferString);
          console.log(`✅ Campo ${fieldName} parseado desde Buffer: ${Array.isArray(parsed) ? `array con ${parsed.length} elementos` : 'objeto'}`);
          return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
        } catch (e) {
          console.warn(`⚠️ Error parseando Buffer en campo ${fieldName}:`, e.message);
          return [];
        }
      }

      console.log(`⚠️ Campo ${fieldName} tiene tipo no reconocido: ${typeof value}`);
      return [];
    };

    // Preparar datos para análisis con TODA la información disponible de los anexos
    // Si se proporcionan URLs de anexos, usarlas para descargar y analizar
    let anexosParaAnalisis = [];

    if (anexosUrls && Array.isArray(anexosUrls) && anexosUrls.length > 0) {
      // Si se proporcionan URLs, descargar anexos desde URLs
      console.log(`📄 Descargando ${anexosUrls.length} anexos desde URLs...`);
      for (let i = 0; i < anexosUrls.length; i++) {
        const anexoUrl = anexosUrls[i];
        const anexoBuffer = await descargarArchivoDesdeURL(anexoUrl, token);
        if (anexoBuffer) {
          // Buscar anexo correspondiente en BD para obtener datos estructurados
          const anexoId = anexoUrl.match(/\/(\d+)\/download/)?.[1];
          let anexoData = null;
          if (anexoId) {
            const [anexosData] = await pool.execute(
              `SELECT * FROM anexos_completos WHERE IDANEXO = ?`,
              [anexoId]
            );
            anexoData = anexosData.length > 0 ? anexosData[0] : null;
          }

          // Si no encontramos en BD, usar el primer anexo disponible o crear estructura básica
          if (!anexoData && anexosCompletos.length > 0) {
            anexoData = anexosCompletos[i] || anexosCompletos[0];
          }

          if (anexoData) {
            const nombreCompleto = `${anexoData.nombres || ''} ${anexoData.apellidoPaterno || ''} ${anexoData.apellidoMaterno || ''}`.trim() || postulante.nombreCompleto;
            anexosParaAnalisis.push({
              IDANEXO: anexoData.IDANEXO || anexoId || i + 1,
              tipoAnexo: 'Anexo 01',
              nombreArchivo: `Anexo_${anexoData.IDANEXO || anexoId || i + 1}.pdf`,
              nombrePostulante: nombreCompleto,
              dniPostulante: anexoData.dni || postulante.documento,
              url: anexoUrl,
              desdeURL: true,
              // Datos académicos completos
              formacionAcademica: parseJson(anexoData.formacionAcademica),
              especializacion: parseJson(anexoData.especializacion),
              // Experiencia completa
              experienciaLaboral: parseJson(anexoData.experienciaLaboral),
              referenciasLaborales: parseJson(anexoData.referenciasLaborales),
              // Habilidades
              idiomas: parseJson(anexoData.idiomas),
              ofimatica: parseJson(anexoData.ofimatica),
              // Colegio Profesional
              colegioProfesional: anexoData.colegioProfesional || null,
              colegioProfesionalHabilitado: anexoData.colegioProfesionalHabilitado || 'NO',
              nColegiatura: anexoData.nColegiatura || null,
              fechaVencimientoColegiatura: anexoData.fechaVencimientoColegiatura || null,
              // Datos personales completos
              codigo: anexoData.codigo || null,
              nombrePuesto: anexoData.nombrePuesto || null,
              tipoDocumento: anexoData.tipoDocumento || 'DNI',
              carnetExtranjeria: anexoData.carnetExtranjeria || null,
              genero: anexoData.genero || null,
              direccion: anexoData.direccion || null,
              departamento: anexoData.departamento || null,
              provincia: anexoData.provincia || null,
              distrito: anexoData.distrito || null,
              referenciaDireccion: anexoData.referenciaDireccion || null,
              fechaNacimiento: anexoData.fechaNacimiento || null,
              lugarNacimiento: anexoData.lugarNacimiento || null,
              lugarNacimientoDepartamento: anexoData.lugarNacimientoDepartamento || null,
              lugarNacimientoProvincia: anexoData.lugarNacimientoProvincia || null,
              lugarNacimientoDistrito: anexoData.lugarNacimientoDistrito || null,
              correoElectronico: anexoData.correoElectronico || null,
              telefonoDomicilio: anexoData.telefonoDomicilio || null,
              telefonoCelular1: anexoData.telefonoCelular1 || null,
              telefonoCelular2: anexoData.telefonoCelular2 || null,
              correoElectronicoAlterno: anexoData.correoElectronicoAlterno || null,
              // Bonificaciones
              conadis: anexoData.conadis || 'NO',
              nCarnetConadis: anexoData.nCarnetConadis || null,
              codigoConadis: anexoData.codigoConadis || null,
              fuerzasArmadas: anexoData.fuerzasArmadas || 'NO',
              nCarnetFuerzasArmadas: anexoData.nCarnetFuerzasArmadas || null,
              codigoFuerzasArmadas: anexoData.codigoFuerzasArmadas || null,
              asistenciaEspecial: anexoData.asistenciaEspecial || null,
              // Tiempos de experiencia
              tiempoSectorPublico: anexoData.tiempoSectorPublico || null,
              tiempoSectorPrivado: anexoData.tiempoSectorPrivado || null,
              numeroCas: anexoData.numeroCas || null,
              // Familiares en sector público
              familiares: parseJson(anexoData.familiares),
              // Declaraciones
              declaraciones: {
                infoVerdadera: Boolean(anexoData.veracidadDatos),
                leyProteccionDatos: Boolean(anexoData.leyProteccionDatos),
                datosConsignadosVerdaderos: Boolean(anexoData.datosConsignadosVerdaderos),
                cumploRequisitosMinimos: Boolean(anexoData.cumplirRequisitos),
                plenosDerechosCiviles: Boolean(anexoData.plenosDerechosCiviles),
                noCondenaDolosa: Boolean(anexoData.noCondenaDolosa),
                noInhabilitacion: Boolean(anexoData.noEstarInhabilitado),
                noSentenciaCondenatoria: Boolean(anexoData.noSentenciaCondenatoria),
                noAntecedentesPenales: Boolean(anexoData.noAntecedentesPenales),
                noAntecedentesPoliciales: Boolean(anexoData.noAntecedentesPoliciales),
                noAntecedentesJudiciales: Boolean(anexoData.noAntecedentesJudiciales),
                noParientesUGEL: Boolean(anexoData.noParientesUGEL),
              }
            });
          }
        }
      }
      console.log(`✅ ${anexosParaAnalisis.length} anexos preparados desde URLs`);
    } else {
      // Si no se proporcionan URLs, usar anexos de BD
      console.log(`📊 Procesando ${anexosCompletos.length} anexos desde BD para análisis`);

      anexosParaAnalisis = anexosCompletos.map((anexo, index) => {
        const nombreCompleto = `${anexo.nombres || ''} ${anexo.apellidoPaterno || ''} ${anexo.apellidoMaterno || ''}`.trim() || postulante.nombreCompleto;

        // Parsear campos JSON con logging detallado
        const formacionAcademica = parseJson(anexo.formacionAcademica, `anexo[${index}].formacionAcademica`);
        const especializacion = parseJson(anexo.especializacion, `anexo[${index}].especializacion`);
        const experienciaLaboral = parseJson(anexo.experienciaLaboral, `anexo[${index}].experienciaLaboral`);
        const referenciasLaborales = parseJson(anexo.referenciasLaborales, `anexo[${index}].referenciasLaborales`);
        const idiomas = parseJson(anexo.idiomas, `anexo[${index}].idiomas`);
        const ofimatica = parseJson(anexo.ofimatica, `anexo[${index}].ofimatica`);

        // Log de resumen para cada anexo
        console.log(`📋 Anexo ${index + 1} (ID: ${anexo.IDANEXO}):`);
        console.log(`   - Formación Académica: ${formacionAcademica.length} registros`);
        console.log(`   - Especialización: ${especializacion.length} registros`);
        console.log(`   - Experiencia Laboral: ${experienciaLaboral.length} registros`);
        console.log(`   - Referencias Laborales: ${referenciasLaborales.length} registros`);
        console.log(`   - Idiomas: ${idiomas.length} registros`);
        console.log(`   - Ofimática: ${ofimatica.length} registros`);
        console.log(`   - Colegio Profesional: ${anexo.colegioProfesional || 'N/A'}`);

        // Si hay datos, mostrar muestra del primer elemento
        if (formacionAcademica.length > 0) {
          console.log(`   📚 Ejemplo Formación: ${JSON.stringify(formacionAcademica[0])}`);
        }
        if (experienciaLaboral.length > 0) {
          console.log(`   💼 Ejemplo Experiencia: ${JSON.stringify(experienciaLaboral[0])}`);
        }

        return {
          IDANEXO: anexo.IDANEXO,
          tipoAnexo: 'Anexo 01',
          nombreArchivo: `Anexo_${anexo.IDANEXO}.pdf`,
          nombrePostulante: nombreCompleto,
          dniPostulante: anexo.dni || postulante.documento,
          // Datos académicos completos
          formacionAcademica: formacionAcademica,
          especializacion: especializacion,
          // Experiencia completa
          experienciaLaboral: experienciaLaboral,
          referenciasLaborales: referenciasLaborales,
          // Habilidades
          idiomas: idiomas,
          ofimatica: ofimatica,
          // Colegio Profesional
          colegioProfesional: anexo.colegioProfesional || null,
          colegioProfesionalHabilitado: anexo.colegioProfesionalHabilitado || 'NO',
          nColegiatura: anexo.nColegiatura || null,
          fechaVencimientoColegiatura: anexo.fechaVencimientoColegiatura || null,
          // Datos personales completos
          codigo: anexo.codigo || null,
          nombrePuesto: anexo.nombrePuesto || null,
          tipoDocumento: anexo.tipoDocumento || 'DNI',
          carnetExtranjeria: anexo.carnetExtranjeria || null,
          genero: anexo.genero || null,
          direccion: anexo.direccion || null,
          departamento: anexo.departamento || null,
          provincia: anexo.provincia || null,
          distrito: anexo.distrito || null,
          referenciaDireccion: anexo.referenciaDireccion || null,
          fechaNacimiento: anexo.fechaNacimiento || null,
          lugarNacimiento: anexo.lugarNacimiento || null,
          lugarNacimientoDepartamento: anexo.lugarNacimientoDepartamento || null,
          lugarNacimientoProvincia: anexo.lugarNacimientoProvincia || null,
          lugarNacimientoDistrito: anexo.lugarNacimientoDistrito || null,
          correoElectronico: anexo.correoElectronico || null,
          telefonoDomicilio: anexo.telefonoDomicilio || null,
          telefonoCelular1: anexo.telefonoCelular1 || null,
          telefonoCelular2: anexo.telefonoCelular2 || null,
          correoElectronicoAlterno: anexo.correoElectronicoAlterno || null,
          // Bonificaciones
          conadis: anexo.conadis || 'NO',
          nCarnetConadis: anexo.nCarnetConadis || null,
          codigoConadis: anexo.codigoConadis || null,
          fuerzasArmadas: anexo.fuerzasArmadas || 'NO',
          nCarnetFuerzasArmadas: anexo.nCarnetFuerzasArmadas || null,
          codigoFuerzasArmadas: anexo.codigoFuerzasArmadas || null,
          asistenciaEspecial: anexo.asistenciaEspecial || null,
          // Tiempos de experiencia
          tiempoSectorPublico: anexo.tiempoSectorPublico || null,
          tiempoSectorPrivado: anexo.tiempoSectorPrivado || null,
          numeroCas: anexo.numeroCas || null,
          // Familiares en sector público
          familiares: parseJson(anexo.familiares),
          // Declaraciones
          declaraciones: {
            infoVerdadera: Boolean(anexo.veracidadDatos),
            leyProteccionDatos: Boolean(anexo.leyProteccionDatos),
            datosConsignadosVerdaderos: Boolean(anexo.datosConsignadosVerdaderos),
            cumploRequisitosMinimos: Boolean(anexo.cumplirRequisitos),
            plenosDerechosCiviles: Boolean(anexo.plenosDerechosCiviles),
            noCondenaDolosa: Boolean(anexo.noCondenaDolosa),
            noInhabilitacion: Boolean(anexo.noEstarInhabilitado),
            noSentenciaCondenatoria: Boolean(anexo.noSentenciaCondenatoria),
            noAntecedentesPenales: Boolean(anexo.noAntecedentesPenales),
            noAntecedentesPoliciales: Boolean(anexo.noAntecedentesPoliciales),
            noAntecedentesJudiciales: Boolean(anexo.noAntecedentesJudiciales),
            noParientesUGEL: Boolean(anexo.noParientesUGEL),
          }
        };
      });

      console.log(`✅ Total de anexos preparados para análisis: ${anexosParaAnalisis.length}`);

      // Resumen total de datos
      const totalFormacion = anexosParaAnalisis.reduce((sum, a) => sum + (a.formacionAcademica?.length || 0), 0);
      const totalExperiencia = anexosParaAnalisis.reduce((sum, a) => sum + (a.experienciaLaboral?.length || 0), 0);
      const totalIdiomas = anexosParaAnalisis.reduce((sum, a) => sum + (a.idiomas?.length || 0), 0);

      console.log(`📊 RESUMEN TOTAL DE DATOS:`);
      console.log(`   - Total Formación Académica: ${totalFormacion} registros`);
      console.log(`   - Total Experiencia Laboral: ${totalExperiencia} registros`);
      console.log(`   - Total Idiomas: ${totalIdiomas} registros`);
    }

    // Extraer reglas y bonos de la convocatoria si se solicita
    let reglasAplicadas = null;
    let bonosAplicados = null;

    if (incluirReglasBonos) {
      // Extraer reglas de la convocatoria
      reglasAplicadas = {
        requisitosMinimos: convocatoria.requisitos || null,
        experienciaRequerida: convocatoria.experiencia || null,
        tituloRequerido: convocatoria.licenciatura || null,
        habilidadesRequeridas: convocatoria.habilidades || null,
        experienciaPublicaMin: convocatoria.expPublicaMin || null,
        experienciaPublicaMax: convocatoria.expPublicaMax || null
      };

      // Identificar bonos aplicables basados en anexos
      bonosAplicados = [];

      // Bono por discapacidad (CONADIS)
      anexosParaAnalisis.forEach(anexo => {
        if (anexo.conadis === 'SÍ' && anexo.nCarnetConadis) {
          bonosAplicados.push({
            tipo: 'Discapacidad',
            descripcion: `Postulante con discapacidad certificada por CONADIS. Carnet: ${anexo.nCarnetConadis}`,
            puntos: 5 // Ajustar según reglas
          });
        }
      });

      // Bono por licenciatura (si aplica)
      anexosParaAnalisis.forEach(anexo => {
        if (anexo.formacionAcademica && Array.isArray(anexo.formacionAcademica)) {
          const tieneLicenciatura = anexo.formacionAcademica.some(fa =>
            fa.nombreGrado && (fa.nombreGrado.toLowerCase().includes('licenciado') ||
              fa.nombreGrado.toLowerCase().includes('licenciatura'))
          );
          if (tieneLicenciatura) {
            bonosAplicados.push({
              tipo: 'Licenciatura',
              descripcion: 'Postulante con título de licenciado',
              puntos: 3 // Ajustar según reglas
            });
          }
        }
      });

      // Bono por experiencia pública adicional
      let experienciaPublicaTotal = 0;
      anexosParaAnalisis.forEach(anexo => {
        if (anexo.tiempoSectorPublico) {
          experienciaPublicaTotal += parseFloat(anexo.tiempoSectorPublico) || 0;
        }
      });
      if (experienciaPublicaTotal > (convocatoria.expPublicaMin || 0)) {
        bonosAplicados.push({
          tipo: 'Experiencia Pública Adicional',
          descripcion: `Experiencia pública: ${experienciaPublicaTotal} años (requerido: ${convocatoria.expPublicaMin || 0})`,
          puntos: Math.min(5, Math.floor((experienciaPublicaTotal - (convocatoria.expPublicaMin || 0)) / 2))
        });
      }

      console.log(`📋 Reglas aplicadas: ${JSON.stringify(reglasAplicadas)}`);
      console.log(`🎁 Bonos aplicados: ${bonosAplicados.length} bonos identificados`);
    }

    // Validar que tenemos datos para analizar
    if (!anexosParaAnalisis || anexosParaAnalisis.length === 0) {
      console.error('❌ ERROR: No hay anexos para analizar');
      return res.status(400).json({
        error: 'No se encontraron anexos completos para analizar',
        detalles: 'El postulante no tiene anexos completos en la base de datos'
      });
    }

    // Log de validación antes de enviar a IA
    console.log('🔍 VALIDACIÓN DE DATOS ANTES DE ENVIAR A IA:');
    console.log(`   - Total anexos: ${anexosParaAnalisis.length}`);
    anexosParaAnalisis.forEach((anexo, idx) => {
      console.log(`   - Anexo ${idx + 1}:`);
      console.log(`     * Formación Académica: ${anexo.formacionAcademica?.length || 0} registros`);
      if (anexo.formacionAcademica && anexo.formacionAcademica.length > 0) {
        console.log(`       Ejemplo: ${JSON.stringify(anexo.formacionAcademica[0])}`);
      }
      console.log(`     * Experiencia Laboral: ${anexo.experienciaLaboral?.length || 0} registros`);
      if (anexo.experienciaLaboral && anexo.experienciaLaboral.length > 0) {
        console.log(`       Ejemplo: ${JSON.stringify(anexo.experienciaLaboral[0])}`);
      }
      console.log(`     * Idiomas: ${anexo.idiomas?.length || 0} registros`);
      console.log(`     * Colegio Profesional: ${anexo.colegioProfesional || 'N/A'}`);
    });

    // Usar servicio de IA para analizar
    const { analizarTodosLosAnexos } = await import('../services/aiAnalysis.js');

    const datosCompletos = {
      convocatoria,
      anexos: anexosParaAnalisis,
      curriculum,
      postulante: {
        ...postulante,
        totalAnexos: anexosParaAnalisis.length || anexosCompletos.length
      },
      incluirCV: incluirCV || false,
      incluirReglasBonos: incluirReglasBonos || false,
      reglasAplicadas,
      bonosAplicados
    };

    console.log('🤖 Enviando datos a OpenAI para análisis...');
    const analisisIA = await analizarTodosLosAnexos(datosCompletos);
    console.log(`✅ Análisis de IA completado. Longitud: ${analisisIA?.length || 0} caracteres`);

    // Determinar score y estado basado en el análisis
    let score = 0;
    let estado_evaluacion = 'pending';
    let apto = false;
    const razones = [];

    // Verificar declaraciones juradas
    const anexoPrincipal = anexosCompletos[0];
    if (anexoPrincipal) {
      const decl = {
        infoVerdadera: Boolean(anexoPrincipal.veracidadDatos),
        leyProteccionDatos: Boolean(anexoPrincipal.leyProteccionDatos),
        cumploRequisitosMinimos: Boolean(anexoPrincipal.cumplirRequisitos),
        plenosDerechosCiviles: Boolean(anexoPrincipal.plenosDerechosCiviles),
        noCondenaDolosa: Boolean(anexoPrincipal.noCondenaDolosa),
        noInhabilitacion: Boolean(anexoPrincipal.noEstarInhabilitado),
      };

      // Verificar declaraciones críticas
      if (!decl.infoVerdadera) razones.push('Declaración de veracidad no marcada');
      if (!decl.leyProteccionDatos) razones.push('Declaración de protección de datos no marcada');
      if (!decl.cumploRequisitosMinimos) razones.push('No cumple requisitos mínimos declarados');
      if (!decl.plenosDerechosCiviles) razones.push('No tiene plenos derechos civiles declarados');
      if (!decl.noCondenaDolosa) razones.push('Declaración de no condena dolosa no marcada');
      if (!decl.noInhabilitacion) razones.push('Declaración de no inhabilitación no marcada');
    }

    // Extraer información estructurada del análisis de IA
    const analisisLower = (analisisIA || '').toLowerCase();
    const analisisUpper = (analisisIA || '').toUpperCase();

    // Extraer score del análisis si está presente
    const scoreMatch = analisisIA?.match(/SCORE[:\s]*(\d+)/i) || analisisIA?.match(/puntaje[:\s]*(\d+)/i);
    if (scoreMatch) {
      score = parseInt(scoreMatch[1]);
    }

    // Determinar estado y apto basado en el análisis
    let nivelCumplimiento = 'PENDIENTE';
    if (analisisLower.includes('aprobado') || analisisLower.includes('cumple completamente') || analisisUpper.includes('APROBADO')) {
      nivelCumplimiento = 'APROBADO';
      if (!scoreMatch) score = 75;
      estado_evaluacion = 'approved';
      apto = true;
    } else if (analisisLower.includes('rechazado') || analisisLower.includes('no cumple') || analisisUpper.includes('RECHAZADO') || razones.length > 2) {
      nivelCumplimiento = 'RECHAZADO';
      if (!scoreMatch) score = 30;
      estado_evaluacion = 'rejected';
      apto = false;
    } else if (analisisLower.includes('parcial') || analisisUpper.includes('PARCIAL')) {
      nivelCumplimiento = 'PARCIAL';
      if (!scoreMatch) score = 50;
      estado_evaluacion = 'pending';
      apto = false;
    } else {
      if (!scoreMatch) score = 40;
      estado_evaluacion = 'pending';
      apto = false;
    }

    // Ajustar score según criterios adicionales
    if (anexosParaAnalisis.length > 0) score += Math.min(20, anexosParaAnalisis.length * 2);
    if (curriculum) score += 5;
    if (razones.length === 0) score += 5;

    // Bonus por experiencia pública si aplica
    let tieneExpPublica = false;
    anexosParaAnalisis.forEach(anexo => {
      if (anexo.experienciaLaboral && Array.isArray(anexo.experienciaLaboral)) {
        anexo.experienciaLaboral.forEach(exp => {
          if (exp.sectorPublico === 'SÍ' || exp.sectorPublico === 'SI') {
            tieneExpPublica = true;
          }
        });
      }
    });
    if (tieneExpPublica && convocatoria.expPublicaMin) score += 5;

    // Aplicar bonos si se calcularon
    if (bonosAplicados && Array.isArray(bonosAplicados)) {
      bonosAplicados.forEach(bono => {
        score += bono.puntos || 0;
      });
    }

    score = Math.min(100, Math.max(0, score));

    // Extraer habilidades clave del análisis
    const habilidadesClave = [];
    if (analisisIA) {
      // Buscar la sección de habilidades con el nuevo formato
      const habilidadesMatch = analisisIA.match(/💼 HABILIDADES IDENTIFICADAS[\s\S]*?Habilidades:\s*(.+?)(?:\n\n|═══|$)/i);
      if (habilidadesMatch) {
        const habilidadesTexto = habilidadesMatch[1];
        const habilidadesLista = habilidadesTexto.split(',').map(h => h.trim()).filter(h => h.length > 2 && h.length < 50);
        habilidadesClave.push(...habilidadesLista.slice(0, 10));
        console.log('✅ Habilidades extraídas (calificación masiva):', habilidadesClave);
      } else {
        // Fallback: buscar formato antiguo
        const habilidadesMatchOld = analisisIA.match(/HABILIDADES[:\s]*(.+?)(?:\n\n|\n═|$)/is);
        if (habilidadesMatchOld) {
          const habilidadesTexto = habilidadesMatchOld[1];
          const habilidadesLista = habilidadesTexto.split(/\n|,|-/).filter(h => h.trim().length > 3);
          habilidadesClave.push(...habilidadesLista.slice(0, 10).map(h => h.trim()));
        }
      }
    }

    // Extraer experiencia relevante
    let experienciaRelevante = '';
    if (analisisIA) {
      const expMatch = analisisIA.match(/EXPERIENCIA[:\s]*(.+?)(?:\n\n|\n═|ANÁLISIS|EVALUACIÓN|$)/is);
      if (expMatch) {
        experienciaRelevante = expMatch[1].substring(0, 500).trim();
      }
    }
    if (!experienciaRelevante) {
      experienciaRelevante = `Total de anexos: ${anexosCompletos.length}. Experiencia laboral presentada en los anexos.`;
    }

    // Si no se encontraron habilidades, extraer de los datos del postulante
    if (habilidadesClave.length === 0 && anexosCompletos && anexosCompletos.length > 0) {
      const primerAnexo = anexosCompletos[0];

      // Agregar conocimientos de ofimática
      if (primerAnexo.ofimatica && Array.isArray(primerAnexo.ofimatica)) {
        primerAnexo.ofimatica.forEach(ofi => {
          if (ofi.programa && ofi.nivel) {
            habilidadesClave.push(`${ofi.programa} - ${ofi.nivel}`);
          }
        });
      }

      // Agregar idiomas
      if (primerAnexo.idiomas && Array.isArray(primerAnexo.idiomas)) {
        primerAnexo.idiomas.forEach(idioma => {
          if (idioma.idioma && idioma.nivel) {
            habilidadesClave.push(`${idioma.idioma} - ${idioma.nivel}`);
          }
        });
      }

      // Si aún no hay habilidades, agregar genéricas
      if (habilidadesClave.length === 0) {
        habilidadesClave.push('Trabajo en equipo', 'Comunicación efectiva', 'Responsabilidad', 'Adaptabilidad');
      }
    }

    // Preparar datos de convocatoria
    const convocatoriaData = {
      id: convocatoria.IDCONVOCATORIA,
      numero_cas: convocatoria.numeroCAS,
      area: convocatoria.area,
      puesto: convocatoria.puesto,
      requisitos: convocatoria.requisitos,
      experiencia: convocatoria.experiencia,
      licenciatura: convocatoria.licenciatura,
      habilidades: convocatoria.habilidades,
      expPublicaMin: convocatoria.expPublicaMin,
      expPublicaMax: convocatoria.expPublicaMax,
      sueldo: convocatoria.sueldo
    };

    // Preparar declaraciones
    const declaracionesData = anexosCompletos.length > 0 ? {
      infoVerdadera: Boolean(anexosCompletos[0].veracidadDatos),
      leyProteccionDatos: Boolean(anexosCompletos[0].leyProteccionDatos),
      datosConsignadosVerdaderos: Boolean(anexosCompletos[0].datosConsignadosVerdaderos),
      cumploRequisitosMinimos: Boolean(anexosCompletos[0].cumplirRequisitos),
      plenosDerechosCiviles: Boolean(anexosCompletos[0].plenosDerechosCiviles),
      noCondenaDolosa: Boolean(anexosCompletos[0].noCondenaDolosa),
      noInhabilitacion: Boolean(anexosCompletos[0].noEstarInhabilitado),
      noSentenciaCondenatoria: Boolean(anexosCompletos[0].noSentenciaCondenatoria),
      noAntecedentesPenales: Boolean(anexosCompletos[0].noAntecedentesPenales),
      noAntecedentesPoliciales: Boolean(anexosCompletos[0].noAntecedentesPoliciales),
      noAntecedentesJudiciales: Boolean(anexosCompletos[0].noAntecedentesJudiciales),
      noParientesUGEL: Boolean(anexosCompletos[0].noParientesUGEL),
    } : null;

    // Guardar o actualizar el reporte en la base de datos
    try {
      // Verificar si las columnas de reglas y bonos existen
      const [columnas] = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'reportes_ia' 
        AND TABLE_SCHEMA = DATABASE()
        AND COLUMN_NAME IN ('reglasAplicadas', 'bonosAplicados')
      `);

      const tieneReglas = columnas.some(c => c.COLUMN_NAME === 'reglasAplicadas');
      const tieneBonos = columnas.some(c => c.COLUMN_NAME === 'bonosAplicados');

      let query = `INSERT INTO reportes_ia (
        IDUSUARIO, IDCONVOCATORIA, nombre_completo, email, puesto_postulado,
        score, calificacion, estado_evaluacion, apto, analisis, razones,
        experiencia_relevante, habilidades_clave, convocatoria_usada, totalAnexos, declaraciones`;

      let valores = [
        postulanteId,
        convocatoriaId,
        postulante.nombreCompleto || 'N/A',
        postulante.email || 'N/A',
        convocatoria.puesto || 'N/A',
        score,
        Number((score / 10).toFixed(1)),
        estado_evaluacion,
        apto,
        analisisIA,
        JSON.stringify(razones),
        experienciaRelevante,
        JSON.stringify(habilidadesClave),
        JSON.stringify(convocatoriaData),
        anexosParaAnalisis.length || anexosCompletos.length,
        declaracionesData ? JSON.stringify(declaracionesData) : null
      ];

      if (tieneReglas) {
        query += `, reglasAplicadas`;
        valores.push(reglasAplicadas ? JSON.stringify(reglasAplicadas) : null);
      }

      if (tieneBonos) {
        query += `, bonosAplicados`;
        valores.push(bonosAplicados ? JSON.stringify(bonosAplicados) : null);
      }

      query += `) VALUES (${valores.map(() => '?').join(', ')})`;
      query += ` ON DUPLICATE KEY UPDATE
        nombre_completo = VALUES(nombre_completo),
        email = VALUES(email),
        puesto_postulado = VALUES(puesto_postulado),
        score = VALUES(score),
        calificacion = VALUES(calificacion),
        estado_evaluacion = VALUES(estado_evaluacion),
        apto = VALUES(apto),
        analisis = VALUES(analisis),
        razones = VALUES(razones),
        experiencia_relevante = VALUES(experiencia_relevante),
        habilidades_clave = VALUES(habilidades_clave),
        convocatoria_usada = VALUES(convocatoria_usada),
        totalAnexos = VALUES(totalAnexos),
        declaraciones = VALUES(declaraciones),
        fechaActualizacion = CURRENT_TIMESTAMP`;

      if (tieneReglas) {
        query += `, reglasAplicadas = VALUES(reglasAplicadas)`;
      }

      if (tieneBonos) {
        query += `, bonosAplicados = VALUES(bonosAplicados)`;
      }

      await pool.execute(query, valores);
      console.log(`✅ Reporte de IA guardado/actualizado para postulante ${postulanteId}, convocatoria ${convocatoriaId}`);
    } catch (dbError) {
      console.error('⚠️ Error al guardar reporte de IA en BD:', dbError.message);
      // Continuar aunque falle el guardado en BD
    }

    // Guardar reglas y bonos en el reporte si se calcularon
    let reglasBonosData = null;
    if (incluirReglasBonos && (reglasAplicadas || bonosAplicados)) {
      reglasBonosData = {
        reglasAplicadas,
        bonosAplicados
      };
    }

    // Preparar respuesta
    const respuesta = {
      score,
      estado_evaluacion,
      apto,
      analisis: analisisIA,
      razones,
      convocatoria_usada: convocatoriaData,
      totalAnexos: anexosParaAnalisis.length || anexosCompletos.length,
      declaraciones: declaracionesData,
      experiencia_relevante: experienciaRelevante,
      habilidades_clave: habilidadesClave,
      nivelCumplimiento: nivelCumplimiento || 'PENDIENTE',
      evaluacionRequisitos: analisisIA, // Alias para compatibilidad
      reglasAplicadas: reglasAplicadas,
      bonosAplicados: bonosAplicados
    };

    // Actualizar el reporte en BD con reglas y bonos si aplica
    if (reglasBonosData) {
      try {
        await pool.execute(
          `UPDATE reportes_ia 
           SET reglasAplicadas = ?, bonosAplicados = ?, fechaActualizacion = CURRENT_TIMESTAMP
           WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?`,
          [
            JSON.stringify(reglasAplicadas),
            JSON.stringify(bonosAplicados),
            postulanteId,
            convocatoriaId
          ]
        );
      } catch (dbError) {
        console.error('⚠️ Error al actualizar reglas/bonos en BD:', dbError.message);
      }
    }

    res.json(respuesta);

  } catch (error) {
    console.error('❌ Error al analizar anexos con convocatoria:', error);
    res.status(500).json({
      error: 'Error al analizar anexos',
      details: error.message
    });
  }
};

// Controlador para obtener todos los reportes de IA
export const obtenerReportesIA = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    // Asegurar que la tabla de reportes existe
    await ensureReportesIATable();

    // Obtener convocatoria ID del usuario actual (si está disponible)
    const convocatoriaId = req.query.convocatoriaId || req.params.convocatoriaId;

    // Primero, obtener todos los reportes de IA existentes
    let query = `
      SELECT r.* 
      FROM reportes_ia r
    `;
    let params = [];

    // Si hay convocatoriaId, filtrar por ella
    if (convocatoriaId) {
      query += ` WHERE r.IDCONVOCATORIA = ?`;
      params.push(convocatoriaId);
    }

    query += ` ORDER BY r.fechaCreacion DESC`;

    let [reportes] = await pool.execute(query, params);
    console.log(`📊 Total de reportes encontrados en BD: ${reportes.length}`);
    if (reportes.length > 0) {
      console.log(`📋 Primer reporte (ejemplo):`, {
        IDREPORTE: reportes[0].IDREPORTE,
        IDUSUARIO: reportes[0].IDUSUARIO,
        IDCONVOCATORIA: reportes[0].IDCONVOCATORIA,
        nombre_completo: reportes[0].nombre_completo,
        tieneAnalisis: !!reportes[0].analisis,
        analisisLength: reportes[0].analisis ? reportes[0].analisis.length : 0
      });
    }

    // Obtener usuarios con anexos completos que NO tienen reporte de IA aún
    // y generar reportes automáticamente para ellos
    let postulantesRegistrados = [];
    try {
      // Primero, obtener usuarios que tienen anexos completos
      await ensureAnexosCompletosTable();

      console.log('🔍 Buscando usuarios con anexos_completos sin reporte de IA...');

      // PRIMERO: Buscar directamente usuarios con anexos_completos que no tengan reporte
      // Usar ac.IDCONVOCATORIA de anexos_completos como fuente principal
      const [usuariosConAnexos] = await pool.execute(
        `SELECT
          ac.IDUSUARIO,
          ac.IDCONVOCATORIA,
          u.nombreCompleto,
          u.correo as email,
          u.documento,
          pr.convocatoriaId as pr_convocatoriaId,
          pr.estado,
          pr.expedienteSIGEA,
          MAX(ac.fechaCreacion) AS ultimaActualizacion
         FROM anexos_completos ac
         LEFT JOIN usuarios u ON ac.IDUSUARIO = u.IDUSUARIO
         LEFT JOIN postulantes_registrados pr ON ac.IDUSUARIO = pr.IDUSUARIO
         WHERE NOT EXISTS (
           SELECT 1 FROM reportes_ia ri 
           WHERE ri.IDUSUARIO = ac.IDUSUARIO
           ${convocatoriaId ? 'AND ri.IDCONVOCATORIA = ?' : ''}
         )
         ${convocatoriaId ? 'AND (ac.IDCONVOCATORIA = ? OR ac.IDCONVOCATORIA IS NULL)' : ''}
         GROUP BY ac.IDUSUARIO, ac.IDCONVOCATORIA, u.nombreCompleto, u.correo, u.documento, pr.convocatoriaId, pr.estado, pr.expedienteSIGEA
         ORDER BY ultimaActualizacion DESC
         LIMIT 50`,
        convocatoriaId ? [convocatoriaId, convocatoriaId] : []
      );

      console.log(`📊 Encontrados ${usuariosConAnexos.length} usuarios con anexos_completos sin reporte de IA`);
      postulantesRegistrados = usuariosConAnexos;

      // Si no hay resultados, intentar con postulantes registrados
      if (postulantesRegistrados.length === 0) {
        console.log('🔍 Intentando búsqueda alternativa: postulantes registrados...');
        const [postulantesAlt] = await pool.execute(
          `SELECT pr.IDUSUARIO, pr.convocatoriaId as IDCONVOCATORIA, u.nombreCompleto, u.correo as email, u.documento, pr.estado, pr.expedienteSIGEA
           FROM postulantes_registrados pr
           INNER JOIN usuarios u ON pr.IDUSUARIO = u.IDUSUARIO
           WHERE NOT EXISTS (
             SELECT 1 FROM reportes_ia ri 
             WHERE ri.IDUSUARIO = pr.IDUSUARIO 
             ${convocatoriaId ? 'AND ri.IDCONVOCATORIA = ?' : ''}
           )
           ${convocatoriaId ? 'AND pr.convocatoriaId = ?' : ''}
           ORDER BY pr.fechaRegistro DESC
           LIMIT 50`,
          convocatoriaId ? [convocatoriaId, convocatoriaId] : []
        );
        console.log(`📊 Búsqueda alternativa: ${postulantesAlt.length} postulantes encontrados`);
        if (postulantesAlt.length > 0) {
          postulantesRegistrados = postulantesAlt;
        }
      }

      console.log(`📊 Total de usuarios a procesar: ${postulantesRegistrados.length}`);

      // Para cada postulante registrado sin reporte, generar uno automáticamente
      for (const postulante of postulantesRegistrados) {
        try {
          const postulanteId = postulante.IDUSUARIO;
          // Usar IDCONVOCATORIA de anexos_completos o pr_convocatoriaId de postulantes_registrados
          let convocatoriaIdPostulante = postulante.IDCONVOCATORIA || postulante.pr_convocatoriaId || convocatoriaId;

          // Si no tiene convocatoria, intentar obtenerla desde postulantes_registrados o anexos_completos
          if (!convocatoriaIdPostulante) {
            try {
              // Primero intentar desde anexos_completos
              const [anexosData] = await pool.execute(
                'SELECT IDCONVOCATORIA FROM anexos_completos WHERE IDUSUARIO = ? AND IDCONVOCATORIA IS NOT NULL LIMIT 1',
                [postulanteId]
              );
              if (anexosData.length > 0 && anexosData[0].IDCONVOCATORIA) {
                convocatoriaIdPostulante = anexosData[0].IDCONVOCATORIA;
              } else {
                // Si no hay en anexos_completos, intentar desde postulantes_registrados
                const [prData] = await pool.execute(
                  'SELECT convocatoriaId FROM postulantes_registrados WHERE IDUSUARIO = ? AND convocatoriaId IS NOT NULL LIMIT 1',
                  [postulanteId]
                );
                if (prData.length > 0 && prData[0].convocatoriaId) {
                  convocatoriaIdPostulante = prData[0].convocatoriaId;
                }
              }
            } catch (err) {
              console.warn(`⚠️ Error al obtener convocatoria para postulante ${postulanteId}:`, err.message);
            }
          }

          // Si aún no tiene convocatoria, usar la primera convocatoria activa disponible
          if (!convocatoriaIdPostulante) {
            try {
              const [convocatoriasActivas] = await pool.execute(
                'SELECT IDCONVOCATORIA FROM convocatorias WHERE estado != "No Publicada" ORDER BY fechaCreacion DESC LIMIT 1'
              );
              if (convocatoriasActivas.length > 0) {
                convocatoriaIdPostulante = convocatoriasActivas[0].IDCONVOCATORIA;
                console.log(`ℹ️ Asignando convocatoria ${convocatoriaIdPostulante} al postulante ${postulanteId}`);
              } else {
                console.warn(`⚠️ Postulante ${postulanteId} no tiene convocatoria asignada y no hay convocatorias activas, omitiendo...`);
                continue;
              }
            } catch (err) {
              console.warn(`⚠️ Error al obtener convocatoria activa:`, err.message);
              continue;
            }
          }

          console.log(`🤖 Generando reporte de IA automático para postulante ${postulanteId}, convocatoria ${convocatoriaIdPostulante}`);

          // Verificar si tiene anexos completos
          const [anexosCompletos] = await pool.execute(
            `SELECT * FROM anexos_completos 
             WHERE IDUSUARIO = ? 
             ORDER BY fechaCreacion DESC`,
            [postulanteId]
          );

          console.log(`📄 Postulante ${postulanteId} tiene ${anexosCompletos.length} anexos completos`);

          if (anexosCompletos.length === 0) {
            console.log(`⚠️ Postulante ${postulanteId} no tiene anexos completos, omitiendo generación de reporte`);
            continue;
          }

          // Obtener convocatoria
          const [convocatorias] = await pool.execute(
            'SELECT * FROM convocatorias WHERE IDCONVOCATORIA = ?',
            [convocatoriaIdPostulante]
          );

          if (convocatorias.length === 0) {
            console.warn(`⚠️ Convocatoria ${convocatoriaIdPostulante} no encontrada para postulante ${postulanteId}`);
            continue;
          }

          const convocatoria = convocatorias[0];

          // Llamar al análisis de IA (sin hacer la petición HTTP completa, solo la lógica)
          // Esto creará y guardará el reporte automáticamente
          const { analizarAnexosConConvocatoria } = await import('../services/aiAnalysis.js');

          // Preparar datos para análisis (similar a analizarAnexosConConvocatoria)
          const parseJson = (value) => {
            if (!value) return [];
            if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
              } catch {
                return [];
              }
            }
            if (Buffer.isBuffer(value)) {
              try {
                const bufferString = value.toString('utf8');
                const parsed = JSON.parse(bufferString);
                return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
              } catch {
                return [];
              }
            }
            if (Array.isArray(value)) return value;
            if (typeof value === 'object') return [value];
            return [];
          };

          const anexosParaAnalisis = anexosCompletos.map(anexo => {
            const nombreCompleto = `${anexo.nombres || ''} ${anexo.apellidoPaterno || ''} ${anexo.apellidoMaterno || ''}`.trim() || postulante.nombreCompleto;

            return {
              IDANEXO: anexo.IDANEXO,
              tipoAnexo: 'Anexo 01',
              nombreArchivo: `Anexo_${anexo.IDANEXO}.pdf`,
              nombrePostulante: nombreCompleto,
              dniPostulante: anexo.dni || postulante.documento,
              formacionAcademica: parseJson(anexo.formacionAcademica),
              especializacion: parseJson(anexo.especializacion),
              experienciaLaboral: parseJson(anexo.experienciaLaboral),
              referenciasLaborales: parseJson(anexo.referenciasLaborales),
              idiomas: parseJson(anexo.idiomas),
              ofimatica: parseJson(anexo.ofimatica),
              colegioProfesional: anexo.colegioProfesional || null,
              colegioProfesionalHabilitado: anexo.colegioProfesionalHabilitado || 'NO',
              nColegiatura: anexo.nColegiatura || null,
              declaraciones: {
                infoVerdadera: Boolean(anexo.veracidadDatos),
                leyProteccionDatos: Boolean(anexo.leyProteccionDatos),
                datosConsignadosVerdaderos: Boolean(anexo.datosConsignadosVerdaderos),
                cumploRequisitosMinimos: Boolean(anexo.cumplirRequisitos),
                plenosDerechosCiviles: Boolean(anexo.plenosDerechosCiviles),
                noCondenaDolosa: Boolean(anexo.noCondenaDolosa),
                noInhabilitacion: Boolean(anexo.noEstarInhabilitado),
                noSentenciaCondenatoria: Boolean(anexo.noSentenciaCondenatoria),
                noAntecedentesPenales: Boolean(anexo.noAntecedentesPenales),
                noAntecedentesPoliciales: Boolean(anexo.noAntecedentesPoliciales),
                noAntecedentesJudiciales: Boolean(anexo.noAntecedentesJudiciales),
                noParientesUGEL: Boolean(anexo.noParientesUGEL),
              }
            };
          });

          // Obtener curriculum
          const [curriculums] = await pool.execute(
            `SELECT * FROM curriculum WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC LIMIT 1`,
            [postulanteId]
          );

          const curriculum = curriculums.length > 0 ? curriculums[0] : null;

          // Llamar al análisis de IA
          const datosCompletos = {
            convocatoria,
            anexos: anexosParaAnalisis,
            curriculum,
            postulante: {
              id: postulanteId,
              nombreCompleto: postulante.nombreCompleto,
              documento: postulante.documento,
              email: postulante.email,
              totalAnexos: anexosCompletos.length
            }
          };

          const { analizarTodosLosAnexos } = await import('../services/aiAnalysis.js');
          const analisisIA = await analizarTodosLosAnexos(datosCompletos);

          // Determinar score y estado (lógica similar a analizarAnexosConConvocatoria)
          let score = 0;
          let estado_evaluacion = 'pending';
          let apto = false;
          const razones = [];

          const anexoPrincipal = anexosCompletos[0];
          if (anexoPrincipal) {
            if (!anexoPrincipal.veracidadDatos) razones.push('Declaración de veracidad no marcada');
            if (!anexoPrincipal.leyProteccionDatos) razones.push('Declaración de protección de datos no marcada');
            if (!anexoPrincipal.cumplirRequisitos) razones.push('No cumple requisitos mínimos declarados');
          }

          const analisisLower = (analisisIA || '').toLowerCase();
          const analisisUpper = (analisisIA || '').toUpperCase();

          const scoreMatch = analisisIA?.match(/SCORE[:\s]*(\d+)/i);
          if (scoreMatch) {
            score = parseInt(scoreMatch[1]);
          }

          let nivelCumplimiento = 'PENDIENTE';
          if (analisisLower.includes('aprobado') || analisisLower.includes('cumple completamente') || analisisUpper.includes('APROBADO')) {
            nivelCumplimiento = 'APROBADO';
            if (!scoreMatch) score = 75;
            estado_evaluacion = 'approved';
            apto = true;
          } else if (analisisLower.includes('rechazado') || analisisLower.includes('no cumple') || analisisUpper.includes('RECHAZADO') || razones.length > 2) {
            nivelCumplimiento = 'RECHAZADO';
            if (!scoreMatch) score = 30;
            estado_evaluacion = 'rejected';
            apto = false;
          } else if (analisisLower.includes('parcial') || analisisUpper.includes('PARCIAL')) {
            nivelCumplimiento = 'PARCIAL';
            if (!scoreMatch) score = 50;
            estado_evaluacion = 'pending';
            apto = false;
          } else {
            if (!scoreMatch) score = 40;
            estado_evaluacion = 'pending';
            apto = false;
          }

          // Ajustar score
          if (anexosCompletos.length > 0) score += Math.min(20, anexosCompletos.length * 2);
          if (curriculum) score += 5;
          if (razones.length === 0) score += 5;
          score = Math.min(100, Math.max(0, score));

          // Extraer habilidades y experiencia
          const habilidadesClave = [];
          let experienciaRelevante = '';

          if (analisisIA) {
            const habilidadesMatch = analisisIA.match(/HABILIDADES[:\s]*(.+?)(?:\n\n|\n═|$)/is);
            if (habilidadesMatch) {
              const habilidadesTexto = habilidadesMatch[1];
              const habilidadesLista = habilidadesTexto.split(/\n|,|-/).filter(h => h.trim().length > 3);
              habilidadesClave.push(...habilidadesLista.slice(0, 10).map(h => h.trim()));
            }

            const expMatch = analisisIA.match(/EXPERIENCIA[:\s]*(.+?)(?:\n\n|\n═|ANÁLISIS|EVALUACIÓN|$)/is);
            if (expMatch) {
              experienciaRelevante = expMatch[1].substring(0, 500).trim();
            }
          }

          // No agregar texto por defecto si no hay habilidades
          // La sección se ocultará en el frontend si está vacía

          if (!experienciaRelevante) {
            experienciaRelevante = `Total de anexos: ${anexosCompletos.length}. Experiencia laboral presentada en los anexos.`;
          }

          // Guardar el reporte
          const convocatoriaData = {
            id: convocatoria.IDCONVOCATORIA,
            numero_cas: convocatoria.numeroCAS,
            area: convocatoria.area,
            puesto: convocatoria.puesto,
            requisitos: convocatoria.requisitos,
            experiencia: convocatoria.experiencia,
            licenciatura: convocatoria.licenciatura,
            habilidades: convocatoria.habilidades,
            expPublicaMin: convocatoria.expPublicaMin,
            expPublicaMax: convocatoria.expPublicaMax,
            sueldo: convocatoria.sueldo
          };

          const declaracionesData = anexosCompletos.length > 0 ? {
            infoVerdadera: Boolean(anexosCompletos[0].veracidadDatos),
            leyProteccionDatos: Boolean(anexosCompletos[0].leyProteccionDatos),
            datosConsignadosVerdaderos: Boolean(anexosCompletos[0].datosConsignadosVerdaderos),
            cumploRequisitosMinimos: Boolean(anexosCompletos[0].cumplirRequisitos),
            plenosDerechosCiviles: Boolean(anexosCompletos[0].plenosDerechosCiviles),
            noCondenaDolosa: Boolean(anexosCompletos[0].noCondenaDolosa),
            noInhabilitacion: Boolean(anexosCompletos[0].noEstarInhabilitado),
            noSentenciaCondenatoria: Boolean(anexosCompletos[0].noSentenciaCondenatoria),
            noAntecedentesPenales: Boolean(anexosCompletos[0].noAntecedentesPenales),
            noAntecedentesPoliciales: Boolean(anexosCompletos[0].noAntecedentesPoliciales),
            noAntecedentesJudiciales: Boolean(anexosCompletos[0].noAntecedentesJudiciales),
            noParientesUGEL: Boolean(anexosCompletos[0].noParientesUGEL),
          } : null;

          await pool.execute(
            `INSERT INTO reportes_ia (
              IDUSUARIO, IDCONVOCATORIA, nombre_completo, email, puesto_postulado,
              score, calificacion, estado_evaluacion, apto, analisis, razones,
              experiencia_relevante, habilidades_clave, convocatoria_usada, totalAnexos, declaraciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              nombre_completo = VALUES(nombre_completo),
              email = VALUES(email),
              puesto_postulado = VALUES(puesto_postulado),
              score = VALUES(score),
              calificacion = VALUES(calificacion),
              estado_evaluacion = VALUES(estado_evaluacion),
              apto = VALUES(apto),
              analisis = VALUES(analisis),
              razones = VALUES(razones),
              experiencia_relevante = VALUES(experiencia_relevante),
              habilidades_clave = VALUES(habilidades_clave),
              convocatoria_usada = VALUES(convocatoria_usada),
              totalAnexos = VALUES(totalAnexos),
              declaraciones = VALUES(declaraciones),
              fechaActualizacion = CURRENT_TIMESTAMP`,
            [
              postulanteId,
              convocatoriaIdPostulante,
              postulante.nombreCompleto || 'N/A',
              postulante.email || 'N/A',
              convocatoria.puesto || 'N/A',
              score,
              Number((score / 10).toFixed(1)),
              estado_evaluacion,
              apto,
              analisisIA,
              JSON.stringify(razones),
              experienciaRelevante,
              JSON.stringify(habilidadesClave),
              JSON.stringify(convocatoriaData),
              anexosCompletos.length,
              declaracionesData ? JSON.stringify(declaracionesData) : null
            ]
          );

          console.log(`✅ Reporte de IA generado automáticamente para postulante ${postulanteId}`);
        } catch (error) {
          console.error(`❌ Error generando reporte automático para postulante ${postulante.IDUSUARIO}:`, error.message);
          // Continuar con el siguiente postulante
        }
      }

      // Después de generar reportes automáticos, obtener todos los reportes nuevamente
      const [reportesActualizados] = await pool.execute(
        convocatoriaId
          ? `SELECT * FROM reportes_ia WHERE IDCONVOCATORIA = ? ORDER BY fechaCreacion DESC`
          : `SELECT * FROM reportes_ia ORDER BY fechaCreacion DESC`,
        convocatoriaId ? [convocatoriaId] : []
      );

      console.log(`✅ Total de reportes después de generación automática: ${reportesActualizados.length}`);

      // Usar los reportes actualizados
      reportes = reportesActualizados;
    } catch (error) {
      console.error('⚠️ Error al generar reportes automáticos:', error);
      console.error('⚠️ Stack trace:', error.stack);
      // Continuar con los reportes existentes
    }

    // Log de diagnóstico: contar anexos_completos en total
    try {
      const [totalAnexos] = await pool.execute('SELECT COUNT(*) as total FROM anexos_completos');
      const [totalReportes] = await pool.execute('SELECT COUNT(*) as total FROM reportes_ia');
      console.log(`📊 Diagnóstico: ${totalAnexos[0]?.total || 0} anexos_completos en BD, ${totalReportes[0]?.total || 0} reportes_ia en BD`);
    } catch (err) {
      console.warn('⚠️ Error en diagnóstico:', err.message);
    }

    // Procesar reportes para parsear JSON fields y enriquecer con anexos
    const reportesProcesados = await Promise.all(reportes.map(async (reporte) => {
      // Función mejorada para parsear JSON que también maneja Buffers
      const parseJson = (value) => {
        if (!value) return null;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        // Manejar Buffers (datos binarios de MySQL)
        if (Buffer.isBuffer(value)) {
          try {
            const bufferString = value.toString('utf8');
            // Intentar parsear como JSON
            try {
              return JSON.parse(bufferString);
            } catch {
              // Si no es JSON válido, devolver el string
              return bufferString;
            }
          } catch {
            return null;
          }
        }
        // Si es un objeto con estructura de Buffer (serializado)
        if (typeof value === 'object' && value !== null && value.type === 'Buffer' && Array.isArray(value.data)) {
          try {
            const buffer = Buffer.from(value.data);
            const bufferString = buffer.toString('utf8');
            // Intentar parsear como JSON
            try {
              return JSON.parse(bufferString);
            } catch {
              // Si no es JSON válido, devolver el string
              return bufferString;
            }
          } catch {
            return null;
          }
        }
        return value;
      };

      // Función para convertir valores a string de forma segura
      const parseString = (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (Buffer.isBuffer(value)) {
          try {
            return value.toString('utf8');
          } catch {
            return '';
          }
        }
        // Si es un objeto con estructura de Buffer (serializado)
        if (typeof value === 'object' && value !== null && value.type === 'Buffer' && Array.isArray(value.data)) {
          try {
            const buffer = Buffer.from(value.data);
            return buffer.toString('utf8');
          } catch {
            return '';
          }
        }
        return String(value);
      };

      // Obtener anexos completos del postulante (prioridad)
      let anexos = [];
      let anexosCompletos = [];
      try {
        // Primero intentar obtener anexos completos
        const [anexosCompletosData] = await pool.execute(
          `SELECT * FROM anexos_completos 
           WHERE IDUSUARIO = ? 
           ORDER BY fechaCreacion DESC`,
          [reporte.IDUSUARIO]
        );

        console.log(`📄 Reporte ${reporte.IDREPORTE} (Usuario ${reporte.IDUSUARIO}): ${anexosCompletosData.length} anexos_completos encontrados`);

        if (anexosCompletosData.length > 0) {
          // Usar anexos completos
          anexosCompletos = anexosCompletosData;

          // Función helper para parsear campos JSON
          const parseJsonField = (field) => {
            if (!field) return null;
            if (typeof field === 'string') {
              try {
                return JSON.parse(field);
              } catch {
                return field;
              }
            }
            if (Buffer.isBuffer(field)) {
              try {
                return JSON.parse(field.toString('utf8'));
              } catch {
                return null;
              }
            }
            return field;
          };

          anexos = anexosCompletosData.map(anexo => ({
            id: anexo.IDANEXO,
            nombre: `Anexo_${anexo.IDANEXO}.pdf`,
            url: `http://localhost:9000/ugel-talara/documentos/anexos-completos/${anexo.IDANEXO}/download`,
            tipo: 'Anexo 01',
            fechaCreacion: anexo.fechaCreacion,
            // Datos completos para el análisis (parsear JSON si es necesario)
            formacionAcademica: parseJsonField(anexo.formacionAcademica),
            especializacion: parseJsonField(anexo.especializacion),
            experienciaLaboral: parseJsonField(anexo.experienciaLaboral),
            referenciasLaborales: parseJsonField(anexo.referenciasLaborales),
            idiomas: parseJsonField(anexo.idiomas),
            ofimatica: parseJsonField(anexo.ofimatica),
            colegioProfesional: anexo.colegioProfesional,
            declaraciones: {
              veracidadDatos: Boolean(anexo.veracidadDatos),
              leyProteccionDatos: Boolean(anexo.leyProteccionDatos),
              cumplirRequisitos: Boolean(anexo.cumplirRequisitos)
            }
          }));
        } else {
          // Si no hay anexos completos, intentar obtener anexos básicos
          const [anexosData] = await pool.execute(
            `SELECT IDANEXO, nombreArchivo, fechaCreacion 
             FROM anexos 
             WHERE IDUSUARIO = ? 
             ORDER BY fechaCreacion DESC`,
            [reporte.IDUSUARIO]
          );
          console.log(`📄 Reporte ${reporte.IDREPORTE} (Usuario ${reporte.IDUSUARIO}): ${anexosData.length} anexos básicos encontrados`);
          anexos = anexosData.map(anexo => ({
            id: anexo.IDANEXO,
            nombre: anexo.nombreArchivo || `Anexo_${anexo.IDANEXO}.pdf`,
            url: `http://localhost:9000/ugel-talara/documentos/anexos/${anexo.IDANEXO}/download`,
            tipo: 'Anexo 01',
            fechaCreacion: anexo.fechaCreacion
          }));
        }
      } catch (error) {
        console.error(`❌ Error al obtener anexos para reporte ${reporte.IDREPORTE}:`, error);
        console.error(`❌ Stack trace:`, error.stack);
      }

      // Obtener curriculum del postulante
      let cv_url = null;
      try {
        const [curriculums] = await pool.execute(
          `SELECT IDCURRICULUM, nombreArchivo 
           FROM curriculum 
           WHERE IDUSUARIO = ? 
           ORDER BY fechaCreacion DESC 
           LIMIT 1`,
          [reporte.IDUSUARIO]
        );
        if (curriculums.length > 0) {
          cv_url = `/ugel-talara/documentos/curriculum/${curriculums[0].IDCURRICULUM}/download`;
        }
      } catch (error) {
        console.warn(`⚠️ Error al obtener curriculum para reporte ${reporte.IDREPORTE}:`, error.message);
      }

      const convocatoriaData = parseJson(reporte.convocatoria_usada);

      return {
        id: reporte.IDREPORTE,
        userId: reporte.IDUSUARIO,
        convocatoriaId: reporte.IDCONVOCATORIA,
        nombre_completo: reporte.nombre_completo,
        email: reporte.email,
        puesto_postulado: reporte.puesto_postulado,
        score: reporte.score || 0,
        calificacion: Number(reporte.calificacion) || 0,
        estado_evaluacion: reporte.estado_evaluacion || 'pending',
        apto: Boolean(reporte.apto),
        analisis: parseString(reporte.analisis) || '',
        razones: parseJson(reporte.razones) || [],
        motivo_rechazo: parseString(reporte.motivo_rechazo) || null,
        experiencia_relevante: parseString(reporte.experiencia_relevante) || '',
        habilidades_clave: parseJson(reporte.habilidades_clave) || [],
        convocatoria_usada: convocatoriaData,
        totalAnexos: reporte.totalAnexos || anexos.length,
        declaraciones: parseJson(reporte.declaraciones) || null,
        fechaCreacion: reporte.fechaCreacion,
        fechaActualizacion: reporte.fechaActualizacion,
        // Campos adicionales para compatibilidad con el frontend
        contenido: parseString(reporte.analisis) || '',
        area: convocatoriaData?.area || null,
        numero_cas: convocatoriaData?.numero_cas || null,
        // Anexos y CV
        anexos: anexos,
        anexosCompletos: anexosCompletos.length > 0 ? anexosCompletos : null,
        cv_url: cv_url,
        // Campos de reglas y bonos
        reglasAplicadas: parseJson(reporte.reglasAplicadas) || null,
        bonosAplicados: parseJson(reporte.bonosAplicados) || null,
        evaluacionRequisitos: reporte.analisis || null
      };
    }));

    console.log(`✅ Total de reportes procesados para enviar: ${reportesProcesados.length}`);
    if (reportesProcesados.length > 0) {
      console.log(`📋 Primer reporte procesado (ejemplo):`, {
        id: reportesProcesados[0].id,
        userId: reportesProcesados[0].userId,
        convocatoriaId: reportesProcesados[0].convocatoriaId,
        nombre_completo: reportesProcesados[0].nombre_completo,
        tieneAnalisis: !!reportesProcesados[0].analisis,
        tieneContenido: !!reportesProcesados[0].contenido,
        estado_evaluacion: reportesProcesados[0].estado_evaluacion,
        score: reportesProcesados[0].score
      });
    }

    res.json(reportesProcesados);
  } catch (error) {
    console.error('❌ Error al obtener reportes de IA:', error);
    res.status(500).json({
      error: 'Error al obtener reportes de IA',
      details: error.message
    });
  }
};

// Controlador para actualizar puntaje de un reporte de IA
export const actualizarPuntajeReporteIA = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const { reporteId } = req.params;
    const { score } = req.body;

    // Validaciones
    if (!reporteId || isNaN(reporteId)) {
      return res.status(400).json({ error: 'ID de reporte inválido' });
    }

    if (score === undefined || score === null || isNaN(score)) {
      return res.status(400).json({ error: 'Puntaje requerido' });
    }

    const scoreNum = parseFloat(score);
    if (scoreNum < 0 || scoreNum > 100) {
      return res.status(400).json({ error: 'El puntaje debe estar entre 0 y 100' });
    }

    // Asegurar que la tabla de reportes existe
    await ensureReportesIATable();

    // Verificar que el reporte existe
    const [reporteExistente] = await pool.execute(
      'SELECT IDREPORTE, IDUSUARIO, nombre_completo FROM reportes_ia WHERE IDREPORTE = ?',
      [reporteId]
    );

    if (reporteExistente.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    // Calcular valores derivados
    const calificacion = Number((scoreNum / 10).toFixed(1));
    const estado_evaluacion = scoreNum >= 60 ? 'approved' : (scoreNum < 50 ? 'rejected' : 'pending');
    const apto = scoreNum >= 60;

    // Actualizar el puntaje en la base de datos
    const [resultado] = await pool.execute(
      `UPDATE reportes_ia 
       SET score = ?, 
           calificacion = ?, 
           estado_evaluacion = ?, 
           apto = ?,
           fechaActualizacion = NOW()
       WHERE IDREPORTE = ?`,
      [scoreNum, calificacion, estado_evaluacion, apto, reporteId]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'No se pudo actualizar el reporte' });
    }

    console.log(`✅ Puntaje actualizado para reporte ${reporteId}: ${scoreNum}/100 (${reporteExistente[0].nombre_completo})`);

    res.json({
      success: true,
      message: 'Puntaje actualizado correctamente',
      data: {
        reporteId: parseInt(reporteId),
        score: scoreNum,
        calificacion,
        estado_evaluacion,
        apto,
        nombre_completo: reporteExistente[0].nombre_completo
      }
    });

  } catch (error) {
    console.error('❌ Error al actualizar puntaje del reporte:', error);
    res.status(500).json({
      error: 'Error al actualizar puntaje del reporte',
      details: error.message
    });
  }
};

// Controlador para generar PDF de reporte de IA
export const generarPDFReporteIA = async (req, res) => {
  try {
    const { reporteId } = req.params;
    const { reporte } = req.body || {};

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    // Asegurar que la tabla de reportes existe
    await ensureReportesIATable();

    // Obtener reporte de IA desde BD o usar el proporcionado en el body
    let reporteData = reporte;

    if (!reporteData) {
      const [reportes] = await pool.execute(
        'SELECT * FROM reportes_ia WHERE IDREPORTE = ?',
        [reporteId]
      );

      if (reportes.length === 0) {
        return res.status(404).json({ error: 'Reporte no encontrado' });
      }

      reporteData = reportes[0];
    }

    // Parsear campos JSON
    const parseJson = (value) => {
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      if (Buffer.isBuffer(value)) {
        try {
          return JSON.parse(value.toString('utf8'));
        } catch {
          return null;
        }
      }
      return value;
    };

    // Obtener datos adicionales del usuario (lugar de nacimiento, dirección, etc.)
    let datosUsuario = {};
    if (reporteData.IDUSUARIO) {
      try {
        const [usuarios] = await pool.execute(
          'SELECT lugarNacimiento, direccion, telefono, documento FROM usuarios WHERE IDUSUARIO = ?',
          [reporteData.IDUSUARIO]
        );
        if (usuarios.length > 0) {
          datosUsuario = usuarios[0];
        }
      } catch (error) {
        console.warn('No se pudieron obtener datos adicionales del usuario:', error.message);
      }
    }

    // Función mejorada para convertir Buffer a string
    const bufferToString = (value) => {
      if (!value) return '';
      
      // Si es un Buffer, convertir a string
      if (Buffer.isBuffer(value)) {
        return value.toString('utf8');
      }
      
      // Si es un objeto con type: 'Buffer', convertir el array de datos
      if (typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
        return Buffer.from(value.data).toString('utf8');
      }
      
      // Si es un string que parece JSON de Buffer, parsearlo
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (parsed.type === 'Buffer' && Array.isArray(parsed.data)) {
            return Buffer.from(parsed.data).toString('utf8');
          }
        } catch {
          // Si no es JSON, devolver el string tal cual
          return value;
        }
      }
      
      return String(value);
    };

    // Preparar datos para el PDF
    const datosPDF = {
      id: reporteData.id || reporteData.IDREPORTE,
      nombre_completo: reporteData.nombre_completo || 'N/A',
      email: reporteData.email || 'N/A',
      puesto_postulado: reporteData.puesto_postulado || 'N/A',
      calificacion: reporteData.calificacion || 0,
      score: reporteData.score || 0,
      estado_evaluacion: reporteData.estado_evaluacion || 'pending',
      experiencia_relevante: reporteData.experiencia_relevante || 'No disponible',
      habilidades_clave: parseJson(reporteData.habilidades_clave) || [],
      contenido: reporteData.analisis || reporteData.contenido || 'No disponible',
      convocatoria_usada: parseJson(reporteData.convocatoria_usada) || null,
      declaraciones: parseJson(reporteData.declaraciones) || null,
      evaluacionRequisitos: reporteData.analisis || reporteData.evaluacionRequisitos || 'No disponible',
      reglasAplicadas: parseJson(reporteData.reglasAplicadas) || null,
      bonosAplicados: parseJson(reporteData.bonosAplicados) || null,
      razones: parseJson(reporteData.razones) || [],
      apto: reporteData.apto || false,
      // Datos adicionales del usuario
      lugarNacimiento: bufferToString(datosUsuario.lugarNacimiento) || 'No especificado',
      direccion: bufferToString(datosUsuario.direccion) || 'No especificado',
      telefono: bufferToString(datosUsuario.telefono) || 'No especificado',
      documento: bufferToString(datosUsuario.documento) || 'No especificado'
    };

    // Generar PDF usando el servicio
    const { generarPDFReporteIA: generarPDFReporteIAService } = await import('../services/pdfGenerator.js');
    const pdfBuffer = await generarPDFReporteIAService(datosPDF);

    // Enviar PDF como respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_IA_${datosPDF.nombre_completo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Error al generar PDF de reporte de IA:', error);
    res.status(500).json({
      error: 'Error al generar PDF del reporte',
      details: error.message
    });
  }
};

// Controlador para análisis completo de anexos con URLs (para calificación masiva)
export const analizarAnexosCompleto = async (req, res) => {
  try {
    console.log('📥 Request recibido en /analyze-anexos-completo');
    console.log('📋 Body:', JSON.stringify(req.body, null, 2));
    console.log('🔑 Headers:', JSON.stringify(req.headers, null, 2));

    const { incluirCV, incluirConvocatorias, incluirReglasBonos, usarURLs } = req.body || {};

    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Error: Token de autenticación no proporcionado');
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('✅ Token de autenticación válido');

    // Obtener todos los postulantes con anexos completos
    await ensureAnexosCompletosTable();
    await ensureReportesIATable();
    console.log('✅ Tablas verificadas');

    const [postulantes] = await pool.execute(
      `SELECT DISTINCT IDUSUARIO, IDCONVOCATORIA 
       FROM anexos_completos 
       ORDER BY fechaCreacion DESC`
    );

    let totalAnalizados = 0;
    let totalErrores = 0;

    // Determinar la base URL dinámicamente desde el request
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:9000';
    const baseURL = process.env.BASE_URL || `${protocol}://${host}/ugel-talara`;

    console.log(`📊 Iniciando análisis completo para ${postulantes.length} postulantes...`);
    console.log(`🌐 Base URL: ${baseURL}`);

    // Procesar cada postulante
    for (const postulante of postulantes) {
      try {
        const postulanteId = postulante.IDUSUARIO;
        const convocatoriaId = postulante.IDCONVOCATORIA;

        console.log(`📄 Procesando postulante ${postulanteId}, convocatoria ${convocatoriaId}...`);

        // Construir URLs si se solicita
        let anexosUrls = [];
        let cvUrl = null;

        if (usarURLs) {
          // Obtener URLs de anexos
          const [anexos] = await pool.execute(
            `SELECT IDANEXO FROM anexos_completos WHERE IDUSUARIO = ? AND IDCONVOCATORIA = ?`,
            [postulanteId, convocatoriaId]
          );
          anexosUrls = anexos.map(anexo => `${baseURL}/documentos/anexos-completos/${anexo.IDANEXO}/download`);

          // Obtener URL de CV si se solicita
          if (incluirCV) {
            const [curriculums] = await pool.execute(
              `SELECT IDCURRICULUM FROM curriculum WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC LIMIT 1`,
              [postulanteId]
            );
            if (curriculums.length > 0) {
              cvUrl = `${baseURL}/documentos/curriculum/${curriculums[0].IDCURRICULUM}/download`;
            }
          }
        }

        // Obtener convocatoria completa si se solicita
        let convocatoriaCompleta = null;
        if (incluirConvocatorias) {
          const [convocatorias] = await pool.execute(
            'SELECT * FROM convocatorias WHERE IDCONVOCATORIA = ?',
            [convocatoriaId]
          );
          convocatoriaCompleta = convocatorias.length > 0 ? convocatorias[0] : null;
        }

        // Llamar directamente a analizarAnexosConConvocatoria creando objetos req/res simulados
        try {
          // Crear objeto req simulado para analizarAnexosConConvocatoria
          const reqSimulado = {
            params: {
              postulanteId: postulanteId.toString(),
              convocatoriaId: convocatoriaId.toString()
            },
            body: {
              cvUrl,
              anexosUrls,
              incluirCV: incluirCV || false,
              incluirReglasBonos: incluirReglasBonos || false,
              convocatoria: convocatoriaCompleta
            },
            headers: {
              authorization: authHeader
            }
          };

          // Crear objeto res simulado para capturar la respuesta
          let respuestaCapturada = null;
          let statusCode = 200;
          let errorResponse = null;

          const resSimulado = {
            json: function (data) {
              respuestaCapturada = data;
              return this;
            },
            status: function (code) {
              statusCode = code;
              return this;
            }
          };

          // Llamar directamente a analizarAnexosConConvocatoria
          await analizarAnexosConConvocatoria(reqSimulado, resSimulado);

          if (statusCode === 200 && respuestaCapturada) {
            console.log(`✅ Postulante ${postulanteId} analizado exitosamente (score: ${respuestaCapturada.score || 'N/A'})`);
            totalAnalizados++;
          } else {
            console.error(`❌ Error analizando postulante ${postulanteId}: status ${statusCode}`);
            totalErrores++;
          }
        } catch (error) {
          console.error(`❌ Error procesando postulante ${postulanteId}:`, error.message);
          if (error.stack) {
            console.error(`❌ Stack trace:`, error.stack);
          }
          totalErrores++;
        }

      } catch (error) {
        console.error(`❌ Error analizando postulante ${postulante.IDUSUARIO}:`, error.message);
        totalErrores++;
      }
    }

    console.log(`✅ Análisis completo finalizado: ${totalAnalizados} analizados, ${totalErrores} errores`);

    res.json({
      success: true,
      total: totalAnalizados,
      errores: totalErrores,
      message: `Análisis completado: ${totalAnalizados} postulantes procesados, ${totalErrores} errores`
    });

  } catch (error) {
    console.error('❌ Error en analizarAnexosCompleto:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      error: 'Error al realizar análisis completo',
      details: error.message
    });
  }
};

// Controlador para obtener candidatos con anexos completos (no CV)
export const obtenerCandidatosConCV = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    await ensureAnexosCompletosTable();

    // Obtener todos los usuarios que tienen anexos completos
    const [candidatos] = await pool.execute(
      `SELECT
        ac.IDUSUARIO AS id,
        u.nombreCompleto,
        u.correo AS email,
        u.documento,
        COUNT(ac.IDANEXO) AS totalAnexos,
        MAX(ac.fechaCreacion) AS ultimaActualizacion
      FROM anexos_completos ac
      INNER JOIN usuarios u ON ac.IDUSUARIO = u.IDUSUARIO
      GROUP BY ac.IDUSUARIO, u.nombreCompleto, u.correo, u.documento
      ORDER BY ultimaActualizacion DESC`
    );

    // Obtener información adicional de cada candidato (primer anexo para URL)
    const candidatosFormateados = await Promise.all(candidatos.map(async (candidato) => {
      // Obtener el primer anexo para la URL
      const [primerAnexo] = await pool.execute(
        `SELECT IDANEXO FROM anexos_completos WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC LIMIT 1`,
        [candidato.id]
      );

      return {
        id: candidato.id,
        IDUSUARIO: candidato.id,
        nombreCompleto: candidato.nombreCompleto,
        email: candidato.email,
        documento: candidato.documento,
        anexoId: primerAnexo.length > 0 ? primerAnexo[0].IDANEXO : null,
        pdfUrl: primerAnexo.length > 0
          ? `http://localhost:9000/ugel-talara/documentos/anexos-completos/${primerAnexo[0].IDANEXO}/download`
          : null,
        totalAnexos: candidato.totalAnexos,
        fechaCreacion: candidato.ultimaActualizacion
      };
    }));

    console.log(`📊 Encontrados ${candidatosFormateados.length} candidatos con anexos completos`);

    res.json(candidatosFormateados);
  } catch (error) {
    console.error('❌ Error al obtener candidatos con anexos completos:', error);
    res.status(500).json({
      error: 'Error al obtener candidatos con anexos completos',
      details: error.message
    });
  }
};

// Controlador para obtener un reporte de IA específico por ID
export const obtenerReporteIAPorId = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const { reporteId } = req.params;

    if (!reporteId) {
      return res.status(400).json({ error: 'ID de reporte requerido' });
    }

    // Asegurar que la tabla de reportes existe
    await ensureReportesIATable();

    const [reportes] = await pool.execute(
      `SELECT * FROM reportes_ia WHERE IDREPORTE = ?`,
      [reporteId]
    );

    if (reportes.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const reporte = reportes[0];

    // Parsear JSON fields
    const parseJson = (value) => {
      if (!value) return null;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    };

    const reporteProcesado = {
      id: reporte.IDREPORTE,
      userId: reporte.IDUSUARIO,
      convocatoriaId: reporte.IDCONVOCATORIA,
      nombre_completo: reporte.nombre_completo,
      email: reporte.email,
      puesto_postulado: reporte.puesto_postulado,
      score: reporte.score || 0,
      calificacion: Number(reporte.calificacion) || 0,
      estado_evaluacion: reporte.estado_evaluacion || 'pending',
      apto: Boolean(reporte.apto),
      analisis: reporte.analisis || '',
      razones: parseJson(reporte.razones) || [],
      motivo_rechazo: reporte.motivo_rechazo || null,
      experiencia_relevante: reporte.experiencia_relevante || '',
      habilidades_clave: parseJson(reporte.habilidades_clave) || [],
      convocatoria_usada: parseJson(reporte.convocatoria_usada) || null,
      totalAnexos: reporte.totalAnexos || 0,
      declaraciones: parseJson(reporte.declaraciones) || null,
      fechaCreacion: reporte.fechaCreacion,
      fechaActualizacion: reporte.fechaActualizacion,
      contenido: reporte.analisis || '',
      area: parseJson(reporte.convocatoria_usada)?.area || null,
      numero_cas: parseJson(reporte.convocatoria_usada)?.numero_cas || null,
      // Campos de reglas y bonos
      reglasAplicadas: parseJson(reporte.reglasAplicadas) || null,
      bonosAplicados: parseJson(reporte.bonosAplicados) || null,
      evaluacionRequisitos: reporte.analisis || null
    };

    res.json(reporteProcesado);
  } catch (error) {
    console.error('❌ Error al obtener reporte de IA:', error);
    res.status(500).json({
      error: 'Error al obtener reporte de IA',
      details: error.message
    });
  }
};

// Controlador para subir la imagen del certificado generado en el frontend
export const uploadCertificateImage = async (req, res) => {
  try {
    // Obtener ID del usuario del token
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_change_me';

    let decoded;
    try {
      decoded = jwt.default.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = decoded.id || decoded.IDUSUARIO;

    if (!userId) {
      return res.status(401).json({ error: 'ID de usuario no encontrado en el token' });
    }

    // Verificar que se haya subido un archivo
    if (!req.files || !req.files.certificateImage) {
      return res.status(400).json({ error: 'No se ha subido ninguna imagen' });
    }

    const file = req.files.certificateImage;

    // Verificar que sea una imagen
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'El archivo debe ser una imagen' });
    }

    // Verificar tamaño (máximo 10MB para la imagen)
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'La imagen es demasiado grande. Máximo 10MB.' });
    }

    const imageBuffer = file.data;

    // Asegurar que la columna imagenConstancia existe en postulantes_registrados
    try {
      const [columns] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'postulantes_registrados' 
         AND COLUMN_NAME = 'imagenConstancia'`
      );

      if (columns.length === 0) {
        await pool.execute(`
          ALTER TABLE postulantes_registrados 
          ADD COLUMN imagenConstancia LONGBLOB
        `);
        console.log('✅ Columna imagenConstancia agregada a postulantes_registrados');
      }
    } catch (schemaError) {
      console.error('⚠️ Error al verificar esquema de postulantes_registrados:', schemaError.message);
    }

    // Actualizar el registro del postulante
    // Primero buscar por userId (IDUSUARIO) - más confiable
    let [registros] = await pool.execute(
      `SELECT id, certificadoId FROM postulantes_registrados WHERE IDUSUARIO = ? ORDER BY fechaRegistro DESC LIMIT 1`,
      [userId]
    );

    // Si no se encuentra por IDUSUARIO, buscar por patrón de certificadoId
    if (registros.length === 0) {
      [registros] = await pool.execute(
        `SELECT id, certificadoId FROM postulantes_registrados WHERE certificadoId LIKE ? ORDER BY fechaRegistro DESC LIMIT 1`,
        [`CERT-${userId}-%`]
      );
    }

    if (registros.length === 0) {
      // Si no existe registro, intentar crearlo con datos mínimos
      console.log(`⚠️ No se encontró registro para usuario ${userId}, creando registro básico...`);
      
      try {
        const certificadoIdTemp = `CERT-${userId}-TEMP-${Date.now()}`;
        
        // Guardar imagen en archivo
        const nombreArchivo = `${certificadoIdTemp.replace(/[^a-zA-Z0-9-]/g, '_')}.png`;
        const rutaArchivo = path.join(__dirname, '../uploads/constancias', nombreArchivo);
        
        // Crear directorio si no existe
        const dirConstancias = path.join(__dirname, '../uploads/constancias');
        if (!fs.existsSync(dirConstancias)) {
          fs.mkdirSync(dirConstancias, { recursive: true });
        }
        
        // Guardar archivo
        fs.writeFileSync(rutaArchivo, imageBuffer);
        
        const [insertResult] = await pool.execute(
          `INSERT INTO postulantes_registrados (
            IDUSUARIO, certificadoId, nombreCompleto, dni, archivoConstancia, estado, fechaRegistro
          ) VALUES (?, ?, ?, ?, ?, 'Pendiente', NOW())`,
          [userId, certificadoIdTemp, 'Usuario', 'N/A', nombreArchivo]
        );
        
        console.log(`✅ Registro básico creado con ID: ${insertResult.insertId}, archivo: ${nombreArchivo}`);
        
        return res.json({
          success: true,
          message: 'Imagen de constancia guardada exitosamente (registro creado)',
          archivo: nombreArchivo
        });
      } catch (insertError) {
        console.error('❌ Error al crear registro básico:', insertError);
        return res.status(404).json({ 
          error: 'No se encontró registro de postulación para este usuario y no se pudo crear uno nuevo.' 
        });
      }
    }

    const registroId = registros[0].id;
    const certificadoId = registros[0].certificadoId;

    // Guardar imagen en archivo
    const nombreArchivo = `${certificadoId.replace(/[^a-zA-Z0-9-]/g, '_')}.png`;
    const rutaArchivo = path.join(__dirname, '../uploads/constancias', nombreArchivo);
    
    // Crear directorio si no existe
    const dirConstancias = path.join(__dirname, '../uploads/constancias');
    if (!fs.existsSync(dirConstancias)) {
      fs.mkdirSync(dirConstancias, { recursive: true });
    }
    
    // Guardar archivo
    fs.writeFileSync(rutaArchivo, imageBuffer);

    // Actualizar BD con el nombre del archivo
    await pool.execute(
      `UPDATE postulantes_registrados SET archivoConstancia = ? WHERE id = ?`,
      [nombreArchivo, registroId]
    );

    console.log(`✅ Constancia guardada en archivo: ${nombreArchivo} (Registro ID: ${registroId})`);

    res.json({
      success: true,
      message: 'Imagen de constancia guardada exitosamente',
      archivo: nombreArchivo
    });

  } catch (error) {
    console.error('❌ Error al guardar imagen de constancia:', error);
    res.status(500).json({
      error: 'Error al guardar la imagen de la constancia',
      details: error.message
    });
  }
};


// ============================================================
// FUNCIÓN PARA CORREGIR CURRICULUM IDS INCORRECTOS
// ============================================================

/**
 * Corregir curriculumId incorrectos en postulantes_registrados
 * GET /ugel-talara/documentos/corregir-curriculum-ids
 */
export const corregirCurriculumIds = async (req, res) => {
  try {
    console.log('🔧 Iniciando corrección de curriculumIds incorrectos...');
    
    // 1. Encontrar postulantes con curriculumId que no existen
    const [postulantesIncorrectos] = await pool.execute(`
      SELECT 
        pr.id,
        pr.nombreCompleto,
        pr.IDUSUARIO,
        pr.curriculumId as curriculumId_actual,
        c.IDCURRICULUM as curriculumId_correcto
      FROM postulantes_registrados pr
      LEFT JOIN curriculum c ON pr.IDUSUARIO = c.IDUSUARIO
      WHERE pr.curriculumId IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM curriculum 
        WHERE IDCURRICULUM = REPLACE(pr.curriculumId, 'CV-', '')
      )
    `);
    
    if (postulantesIncorrectos.length === 0) {
      console.log('✅ No se encontraron curriculumIds incorrectos');
      return res.json({
        success: true,
        message: 'No se encontraron curriculumIds incorrectos',
        corregidos: 0
      });
    }
    
    console.log(`📋 Encontrados ${postulantesIncorrectos.length} postulantes con curriculumId incorrecto`);
    
    // 2. Actualizar los curriculumId incorrectos
    const [result] = await pool.execute(`
      UPDATE postulantes_registrados pr
      INNER JOIN curriculum c ON pr.IDUSUARIO = c.IDUSUARIO
      SET pr.curriculumId = c.IDCURRICULUM
      WHERE pr.curriculumId IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM curriculum 
        WHERE IDCURRICULUM = REPLACE(pr.curriculumId, 'CV-', '')
      )
    `);
    
    console.log(`✅ Corregidos ${result.affectedRows} curriculumIds`);
    
    res.json({
      success: true,
      message: `Se corrigieron ${result.affectedRows} curriculumIds`,
      corregidos: result.affectedRows,
      detalles: postulantesIncorrectos.map(p => ({
        id: p.id,
        nombre: p.nombreCompleto,
        idAnterior: p.curriculumId_actual,
        idNuevo: p.curriculumId_correcto
      }))
    });
    
  } catch (error) {
    console.error('❌ Error al corregir curriculumIds:', error);
    res.status(500).json({
      success: false,
      error: 'Error al corregir curriculumIds',
      details: error.message
    });
  }
};
