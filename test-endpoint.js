// Script de prueba para verificar el endpoint de análisis
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:9000/ugel-talara';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'; // Reemplazar con un token real

async function testEndpoint() {
  console.log('🧪 Probando endpoint de análisis de anexos...\n');

  // Test 1: Verificar que el servidor esté corriendo
  try {
    const healthRes = await fetch('http://localhost:9000/api/health');
    const health = await healthRes.json();
    console.log('✅ Servidor corriendo:', health.message);
  } catch (err) {
    console.error('❌ Servidor no responde:', err.message);
    return;
  }

  // Test 2: Probar el endpoint de análisis
  const postulanteId = 22;
  const convocatoriaId = 1;
  const url = `${BASE_URL}/documentos/anexos/analizar/${postulanteId}/${convocatoriaId}`;
  
  console.log('\n📡 Probando:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        cvUrl: null,
        anexosUrls: [],
        convocatoria: null,
        incluirCV: true,
        incluirReglasBonos: true
      })
    });

    console.log('📊 Status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Respuesta exitosa:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
  } catch (err) {
    console.error('❌ Error en la petición:', err.message);
  }
}

testEndpoint();
