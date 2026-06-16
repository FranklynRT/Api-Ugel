// Script de prueba para el endpoint de actualización de puntajes
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001/ugel-talara';
const TOKEN = 'tu_token_aqui'; // Reemplazar con un token válido

async function testActualizarPuntaje() {
  try {
    console.log('🧪 Iniciando prueba del endpoint de actualización de puntajes...');
    
    // Primero obtener reportes existentes
    console.log('📋 Obteniendo reportes existentes...');
    const reportesResponse = await fetch(`${BASE_URL}/documentos/reportes-ia`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    if (!reportesResponse.ok) {
      throw new Error(`Error al obtener reportes: ${reportesResponse.status}`);
    }
    
    const reportes = await reportesResponse.json();
    console.log(`✅ Obtenidos ${reportes.length} reportes`);
    
    if (reportes.length === 0) {
      console.log('⚠️ No hay reportes para probar');
      return;
    }
    
    // Tomar el primer reporte para prueba
    const reporte = reportes[0];
    console.log(`🎯 Probando con reporte ID: ${reporte.id} (${reporte.nombre_completo})`);
    console.log(`📊 Puntaje actual: ${reporte.score || 'N/A'}`);
    
    // Probar actualización de puntaje
    const nuevoPuntaje = 85;
    console.log(`🔄 Actualizando puntaje a: ${nuevoPuntaje}`);
    
    const updateResponse = await fetch(`${BASE_URL}/documentos/reportes-ia/${reporte.id}/score`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ score: nuevoPuntaje })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Error al actualizar puntaje: ${updateResponse.status} - ${errorText}`);
    }
    
    const resultado = await updateResponse.json();
    console.log('✅ Puntaje actualizado exitosamente:', resultado);
    
    // Verificar que se actualizó correctamente
    console.log('🔍 Verificando actualización...');
    const verificacionResponse = await fetch(`${BASE_URL}/documentos/reportes-ia`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    if (verificacionResponse.ok) {
      const reportesActualizados = await verificacionResponse.json();
      const reporteActualizado = reportesActualizados.find(r => r.id === reporte.id);
      
      if (reporteActualizado) {
        console.log('✅ Verificación exitosa:');
        console.log(`   - Puntaje: ${reporteActualizado.score}`);
        console.log(`   - Calificación: ${reporteActualizado.calificacion}`);
        console.log(`   - Estado: ${reporteActualizado.estado_evaluacion}`);
        console.log(`   - Apto: ${reporteActualizado.apto}`);
      }
    }
    
    console.log('🎉 Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
  testActualizarPuntaje();
}

module.exports = { testActualizarPuntaje };