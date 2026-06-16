import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function actualizarTituloCompleto() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ugel_talara'
  });

  console.log('🔄 Actualizando títulos profesionales con texto completo...\n');

  // Para "Analista de datos", copiar el texto de requisitosAcademicos a tituloProfesional
  await conn.execute(`
    UPDATE convocatorias 
    SET tituloProfesional = requisitosAcademicos 
    WHERE IDCONVOCATORIA = 14 
    AND requisitosAcademicos IS NOT NULL 
    AND requisitosAcademicos != ''
  `);

  console.log('✅ Título actualizado para Analista de datos\n');

  // Para "Secretaria", dejar como "No requiere título profesional"
  await conn.execute(`
    UPDATE convocatorias 
    SET tituloProfesional = 'No requiere título profesional' 
    WHERE IDCONVOCATORIA = 15
  `);

  console.log('✅ Título actualizado para Secretaria\n');

  // Mostrar resultados
  const [rows] = await conn.execute(`
    SELECT 
      IDCONVOCATORIA,
      puesto,
      tituloProfesional,
      requisitosAcademicos
    FROM convocatorias
    ORDER BY IDCONVOCATORIA
  `);

  console.log('📊 Estado actualizado:');
  console.table(rows);

  await conn.end();
  console.log('\n✅ Actualización completada');
}

actualizarTituloCompleto().catch(console.error);
