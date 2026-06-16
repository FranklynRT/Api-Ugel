import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testTituloProfesional() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ugel_talara'
  });

  console.log('🧪 Probando campo tituloProfesional...\n');

  // Obtener todas las convocatorias
  const [rows] = await conn.execute(`
    SELECT 
      IDCONVOCATORIA,
      puesto,
      tituloProfesional,
      requisitosAcademicos,
      CASE 
        WHEN tituloProfesional = 'Sí' THEN '✅ Correcto'
        WHEN tituloProfesional = 'No' THEN '✅ Correcto'
        ELSE '❌ Necesita normalización'
      END as estado
    FROM convocatorias
    ORDER BY IDCONVOCATORIA
  `);

  console.log('📊 Estado de las convocatorias:');
  console.table(rows);

  // Verificar que todos los valores sean "Sí" o "No"
  const valoresIncorrectos = rows.filter(r => r.tituloProfesional !== 'Sí' && r.tituloProfesional !== 'No');
  
  if (valoresIncorrectos.length === 0) {
    console.log('\n✅ Todos los valores están correctamente normalizados');
  } else {
    console.log(`\n⚠️ ${valoresIncorrectos.length} valores necesitan normalización:`);
    console.table(valoresIncorrectos);
  }

  // Resumen
  const [summary] = await conn.execute(`
    SELECT 
      tituloProfesional,
      COUNT(*) as cantidad,
      GROUP_CONCAT(puesto SEPARATOR ', ') as puestos
    FROM convocatorias
    GROUP BY tituloProfesional
  `);

  console.log('\n📈 Resumen:');
  console.table(summary);

  await conn.end();
}

testTituloProfesional().catch(console.error);
