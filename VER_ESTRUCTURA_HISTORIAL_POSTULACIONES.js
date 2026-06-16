import { pool } from './src/database/conexion.js';

const verEstructura = async () => {
  try {
    console.log('📋 Estructura de historial_postulaciones:\n');
    const [columns] = await pool.execute('DESCRIBE historial_postulaciones');
    console.table(columns);
    
    console.log('\n📊 Datos en la tabla:\n');
    const [rows] = await pool.execute('SELECT * FROM historial_postulaciones LIMIT 5');
    console.log(`Total de registros: ${rows.length}`);
    if (rows.length > 0) {
      console.log('\nPrimeros registros:');
      console.table(rows);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

verEstructura();
