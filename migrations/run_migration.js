/**
 * Script para ejecutar la migración de agregar estado 'Archivado'
 * Ejecutar con: node Api/migrations/run_migration.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    // Crear conexión
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ugel_talara',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Conectado a la base de datos');

    // Verificar estado actual
    console.log('\n📊 Verificando estructura actual...');
    const [currentStructure] = await connection.execute(
      `SELECT COLUMN_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'postulantes_registrados' 
         AND COLUMN_NAME = 'estado'`
    );

    if (currentStructure.length > 0) {
      console.log('Estado actual del ENUM:', currentStructure[0].COLUMN_TYPE);
      
      // Verificar si ya tiene 'Archivado'
      if (currentStructure[0].COLUMN_TYPE.includes("'Archivado'")) {
        console.log('✅ El estado "Archivado" ya existe en el ENUM');
        console.log('ℹ️  No es necesario ejecutar la migración');
        return;
      }
    }

    // Ejecutar migración
    console.log('\n🔄 Ejecutando migración...');
    await connection.execute(
      `ALTER TABLE postulantes_registrados
       MODIFY COLUMN estado ENUM('Registrado', 'Pendiente', 'En proceso', 'Rechazado', 'Archivado') DEFAULT 'Pendiente'`
    );

    console.log('✅ Migración ejecutada correctamente');

    // Verificar resultado
    console.log('\n📊 Verificando resultado...');
    const [newStructure] = await connection.execute(
      `SELECT COLUMN_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'postulantes_registrados' 
         AND COLUMN_NAME = 'estado'`
    );

    if (newStructure.length > 0) {
      console.log('Nueva estructura del ENUM:', newStructure[0].COLUMN_TYPE);
    }

    // Mostrar estadísticas
    console.log('\n📈 Estadísticas actuales:');
    const [stats] = await connection.execute(
      `SELECT estado, COUNT(*) as total 
       FROM postulantes_registrados 
       GROUP BY estado`
    );

    console.table(stats);

    console.log('\n✅ Migración completada exitosamente');
    console.log('ℹ️  Ahora puedes archivar postulantes y los datos se guardarán permanentemente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar migración
runMigration()
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
