import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function actualizar() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ugel_talara'
  });

  await conn.execute(`UPDATE convocatorias SET tituloProfesional = 'Sí' WHERE IDCONVOCATORIA = 14`);
  console.log('✅ Registro actualizado: Analista de datos ahora requiere título profesional');
  
  const [rows] = await conn.execute(`SELECT IDCONVOCATORIA, puesto, tituloProfesional, requisitosAcademicos FROM convocatorias WHERE IDCONVOCATORIA = 14`);
  console.table(rows);
  
  await conn.end();
}

actualizar().catch(console.error);
