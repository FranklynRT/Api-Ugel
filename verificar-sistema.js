/**
 * Script de Verificación del Sistema de Evaluaciones Manuales
 * Ejecutar: node verificar-sistema.js
 */

console.log('🔍 Verificando Sistema de Evaluaciones Manuales...\n');

// 1. Verificar ExcelJS
console.log('1️⃣ Verificando ExcelJS...');
try {
  const ExcelJS = require('exceljs');
  console.log('   ✅ ExcelJS instalado correctamente');
  console.log(`   📦 Versión: ${ExcelJS.version || 'N/A'}\n`);
} catch (error) {
  console.log('   ❌ ExcelJS NO está instalado');
  console.log('   💡 Solución: npm install exceljs\n');
  process.exit(1);
}

// 2. Verificar conexión a BD
console.log('2️⃣ Verificando conexión a Base de Datos...');
const mysql = require('mysql2/promise');

async function verificarBD() {
  let connection;
  try {
    // Configuración de conexión (ajusta según tu configuración)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ugel_talara'
    });
    
    console.log('   ✅ Conexión a BD exitosa\n');
    
    // 3. Verificar tabla EVALUACIONES_MANUALES_CV
    console.log('3️⃣ Verificando tabla EVALUACIONES_MANUALES_CV...');
    try {
      const [rows] = await connection.query('SELECT COUNT(*) as count FROM EVALUACIONES_MANUALES_CV');
      console.log('   ✅ Tabla existe');
      console.log(`   📊 Registros: ${rows[0].count}\n`);
    } catch (error) {
      console.log('   ❌ Tabla NO existe');
      console.log('   💡 Solución: Ejecutar Api/database/create_evaluaciones_manuales_cv.sql\n');
      await connection.end();
      process.exit(1);
    }
    
    // 4. Verificar tabla POSTULANTES_REGISTRADOS
    console.log('4️⃣ Verificando tabla POSTULANTES_REGISTRADOS...');
    try {
      const [rows] = await connection.query('SELECT COUNT(*) as count FROM POSTULANTES_REGISTRADOS');
      console.log('   ✅ Tabla existe');
      console.log(`   📊 Registros: ${rows[0].count}\n`);
    } catch (error) {
      console.log('   ⚠️  Tabla POSTULANTES_REGISTRADOS no existe o está vacía');
      console.log('   💡 Esto es normal si aún no hay postulantes registrados\n');
    }
    
    // 5. Verificar estructura de la tabla
    console.log('5️⃣ Verificando estructura de EVALUACIONES_MANUALES_CV...');
    const [columns] = await connection.query('DESCRIBE EVALUACIONES_MANUALES_CV');
    const expectedColumns = ['IDEVALUACION', 'CANDIDATOID', 'NOTAMANUAL', 'ESTADO', 'EVALUADOPOR', 'FECHAEVALUACION', 'OBSERVACIONES'];
    const actualColumns = columns.map(col => col.Field);
    
    let allColumnsExist = true;
    expectedColumns.forEach(col => {
      if (actualColumns.includes(col)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} - FALTA`);
        allColumnsExist = false;
      }
    });
    
    if (!allColumnsExist) {
      console.log('\n   ⚠️  Faltan columnas. Ejecuta el script SQL nuevamente.\n');
      await connection.end();
      process.exit(1);
    }
    
    console.log('\n✅ TODAS LAS VERIFICACIONES PASARON EXITOSAMENTE\n');
    console.log('🎉 El sistema está listo para usar!\n');
    console.log('📝 Próximos pasos:');
    console.log('   1. Iniciar el servidor backend');
    console.log('   2. Abrir la aplicación frontend');
    console.log('   3. Evaluar candidatos');
    console.log('   4. Exportar Excel\n');
    
    await connection.end();
    process.exit(0);
    
  } catch (error) {
    console.log('   ❌ Error de conexión a BD');
    console.log(`   💡 Error: ${error.message}`);
    console.log('   💡 Verifica tu configuración de BD en .env\n');
    if (connection) await connection.end();
    process.exit(1);
  }
}

verificarBD();
