import { pool } from './src/database/conexion.js';

const agregarColumnas = async () => {
  try {
    console.log('🔧 Agregando columnas a historial_postulaciones...\n');

    const columnas = [
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

    for (const col of columnas) {
      try {
        await pool.execute(`ALTER TABLE historial_postulaciones ADD COLUMN ${col.nombre} ${col.tipo}`);
        console.log(`✅ Columna ${col.nombre} agregada`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`ℹ️ Columna ${col.nombre} ya existe`);
        } else {
          console.error(`❌ Error al agregar ${col.nombre}:`, error.message);
        }
      }
    }

    console.log('\n✅ Proceso completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

agregarColumnas();
