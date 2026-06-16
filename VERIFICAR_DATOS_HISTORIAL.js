import { pool } from './src/database/conexion.js';

const verificarDatos = async () => {
  try {
    console.log('🔍 Verificando datos en historial_tramites...\n');
    
    const [rows] = await pool.execute('SELECT * FROM historial_tramites');
    
    console.log(`📊 Total de registros: ${rows.length}\n`);
    
    if (rows.length > 0) {
      console.log('📋 Registros encontrados:');
      rows.forEach((row, index) => {
        console.log(`\n${index + 1}. ${row.nombreCompleto}`);
        console.log(`   ID: ${row.id}`);
        console.log(`   PostulanteId: ${row.postulanteId}`);
        console.log(`   CertificadoId: ${row.certificadoId}`);
        console.log(`   DNI: ${row.dni}`);
        console.log(`   Estado: ${row.estado}`);
        console.log(`   Fecha: ${row.fechaAccion}`);
      });
    } else {
      console.log('⚠️ No hay registros en la tabla');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

verificarDatos();
