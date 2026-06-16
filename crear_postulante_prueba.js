// Script para crear un postulante de prueba con estado Pendiente
import { pool } from './src/database/conexion.js';

async function crearPostulantePrueba() {
  try {
    console.log('🔧 Creando postulante de prueba...\n');
    
    const codigoCertificado = `CERT-PRUEBA-${Date.now()}`;
    
    await pool.execute(`
      INSERT INTO postulantes_registrados (
        IDUSUARIO, certificadoId, nombreCompleto, apellidoPaterno, apellidoMaterno,
        dni, email, telefono, numeroCAS, puesto, area,
        convocatoriaId, anexoId, estado, fechaRegistro
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', NOW())
    `, [
      998, // IDUSUARIO de prueba
      codigoCertificado,
      'María López Rodríguez',
      'López',
      'Rodríguez',
      '87654321',
      'juan.perez@example.com',
      '987654321',
      'CAS-001-2025',
      'Especialista en Educación',
      'Área de Gestión Pedagógica',
      1, // convocatoriaId
      null, // anexoId
    ]);
    
    console.log('✅ Postulante de prueba creado exitosamente');
    console.log(`📋 Código: ${codigoCertificado}`);
    console.log('📋 Nombre: María López Rodríguez');
    console.log('📋 Estado: Pendiente');
    console.log('\n💡 Ahora deberías ver este postulante en Mesa de Partes (inicio.tsx)');
    console.log('💡 NO debería aparecer en Historial (historial.tsx) hasta que sea Registrado/Rechazado');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearPostulantePrueba();
