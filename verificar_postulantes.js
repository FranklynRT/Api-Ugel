// Script para verificar postulantes en la base de datos
import { pool } from './src/database/conexion.js';

async function verificarPostulantes() {
  try {
    console.log('🔍 Verificando postulantes en la base de datos...\n');
    
    // Contar total de postulantes
    const [total] = await pool.execute('SELECT COUNT(*) as total FROM postulantes_registrados');
    console.log(`📊 Total de postulantes: ${total[0].total}`);
    
    // Contar por estado
    const [porEstado] = await pool.execute(`
      SELECT estado, COUNT(*) as total 
      FROM postulantes_registrados 
      GROUP BY estado
    `);
    console.log('\n📊 Postulantes por estado:');
    porEstado.forEach(row => {
      console.log(`   ${row.estado || 'NULL'}: ${row.total}`);
    });
    
    // Mostrar últimos 5 postulantes
    const [ultimos] = await pool.execute(`
      SELECT id, certificadoId, nombreCompleto, estado, fechaRegistro, fechaActualizacion
      FROM postulantes_registrados 
      ORDER BY fechaRegistro DESC 
      LIMIT 5
    `);
    console.log('\n📋 Últimos 5 postulantes registrados:');
    ultimos.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.nombreCompleto} - Estado: ${p.estado || 'NULL'} - Fecha: ${p.fechaRegistro}`);
    });
    
    // Verificar si hay postulantes pendientes
    const [pendientes] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM postulantes_registrados 
      WHERE estado = 'Pendiente' OR estado IS NULL
    `);
    console.log(`\n⏳ Postulantes pendientes: ${pendientes[0].total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verificarPostulantes();
