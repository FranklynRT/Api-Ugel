import { pool } from './src/database/conexion.js';

const verificarTabla = async () => {
  try {
    const [columns] = await pool.execute('DESCRIBE historial_tramites');
    console.log('📋 Estructura de la tabla historial_tramites:');
    console.table(columns);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

verificarTabla();
