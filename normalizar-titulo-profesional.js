import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ugel_talara',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function normalizarTituloProfesional() {
  let connection;
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión establecida\n');

    // Ver el estado actual
    console.log('📊 Estado actual de los datos:');
    console.log('='.repeat(80));
    const [rows] = await connection.execute(`
      SELECT 
        IDCONVOCATORIA,
        puesto,
        tituloProfesional,
        LENGTH(tituloProfesional) as longitud,
        CASE 
          WHEN tituloProfesional IS NULL THEN 'NULL'
          WHEN LENGTH(tituloProfesional) > 10 THEN 'DESCRIPCIÓN LARGA'
          ELSE 'VALOR CORTO'
        END as tipo_valor
      FROM convocatorias
      ORDER BY IDCONVOCATORIA
    `);
    
    console.table(rows);

    // Normalizar los valores
    console.log('\n🔄 Normalizando valores...');
    const [result] = await connection.execute(`
      UPDATE convocatorias
      SET tituloProfesional = CASE
        WHEN tituloProfesional IS NULL OR TRIM(tituloProfesional) = '' THEN 'No'
        WHEN LENGTH(tituloProfesional) > 10 AND (
          LOWER(tituloProfesional) LIKE '%título%' OR
          LOWER(tituloProfesional) LIKE '%titulo%' OR
          LOWER(tituloProfesional) LIKE '%profesional%' OR
          LOWER(tituloProfesional) LIKE '%licenciatura%' OR
          LOWER(tituloProfesional) LIKE '%grado%' OR
          LOWER(tituloProfesional) LIKE '%universitario%' OR
          LOWER(tituloProfesional) LIKE '%técnico%' OR
          LOWER(tituloProfesional) LIKE '%tecnico%'
        ) THEN 'Sí'
        WHEN LENGTH(tituloProfesional) > 10 THEN 'No'
        WHEN LOWER(TRIM(tituloProfesional)) IN ('sí', 'si', 'yes', '1', 'true') THEN 'Sí'
        WHEN LOWER(TRIM(tituloProfesional)) IN ('no', 'not', '0', 'false') THEN 'No'
        ELSE 'No'
      END
      WHERE tituloProfesional IS NOT NULL
    `);

    console.log(`✅ ${result.affectedRows} registros actualizados\n`);

    // Actualizar valores NULL
    const [nullResult] = await connection.execute(`
      UPDATE convocatorias
      SET tituloProfesional = 'No'
      WHERE tituloProfesional IS NULL
    `);

    if (nullResult.affectedRows > 0) {
      console.log(`✅ ${nullResult.affectedRows} valores NULL actualizados a "No"\n`);
    }

    // Verificar los cambios
    console.log('📊 Estado después de la normalización:');
    console.log('='.repeat(80));
    const [updatedRows] = await connection.execute(`
      SELECT 
        IDCONVOCATORIA,
        puesto,
        tituloProfesional,
        requisitosAcademicos
      FROM convocatorias
      ORDER BY IDCONVOCATORIA
    `);
    
    console.table(updatedRows);

    // Mostrar resumen
    console.log('\n📈 Resumen de valores:');
    console.log('='.repeat(80));
    const [summary] = await connection.execute(`
      SELECT 
        tituloProfesional,
        COUNT(*) as cantidad
      FROM convocatorias
      GROUP BY tituloProfesional
      ORDER BY tituloProfesional
    `);
    
    console.table(summary);

    console.log('\n✅ Normalización completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la normalización:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar el script
normalizarTituloProfesional()
  .then(() => {
    console.log('\n✅ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
