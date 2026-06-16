import { pool } from './src/database/conexion.js';

const recrearTabla = async () => {
  try {
    console.log('🗑️ Eliminando tabla historial_tramites antigua...');
    await pool.execute('DROP TABLE IF EXISTS historial_tramites');
    console.log('✅ Tabla eliminada');

    console.log('🔨 Creando nueva tabla historial_tramites con estructura correcta...');
    await pool.execute(`
      CREATE TABLE historial_tramites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        postulanteId INT NOT NULL,
        certificadoId VARCHAR(255),
        nombreCompleto VARCHAR(255) NOT NULL,
        apellidoPaterno VARCHAR(100),
        apellidoMaterno VARCHAR(100),
        dni VARCHAR(20),
        email VARCHAR(255),
        telefono VARCHAR(20),
        numeroCAS VARCHAR(50),
        puesto VARCHAR(255),
        area VARCHAR(255),
        convocatoriaId INT,
        anexoId INT,
        curriculumId INT,
        expedienteSIGEA VARCHAR(100),
        estado ENUM('Registrado', 'Rechazado', 'Archivado') NOT NULL,
        motivoRechazo TEXT,
        fechaAccion DATETIME NOT NULL,
        usuarioAccion VARCHAR(255),
        INDEX idx_postulanteId (postulanteId),
        INDEX idx_estado (estado),
        INDEX idx_fechaAccion (fechaAccion),
        INDEX idx_dni (dni)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla creada correctamente con estructura camelCase');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

recrearTabla();
