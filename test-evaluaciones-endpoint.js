// Script para probar el endpoint de evaluaciones
import http from 'http';

const API_BASE_URL = 'http://localhost:9000';

function makeRequest(path, method = 'POST', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, statusText: res.statusMessage, text: () => data });
      });
    });

    req.on('error', (error) => reject(error));
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testEndpoint() {
  console.log('🧪 Probando endpoint de evaluaciones...\n');

  // Test 1: Verificar que el servidor está corriendo
  try {
    console.log('1️⃣ Verificando que el servidor está corriendo...');
    const healthResponse = await makeRequest('/api/health', 'GET');
    if (healthResponse.status === 200) {
      console.log('✅ Servidor está corriendo\n');
    } else {
      console.log('⚠️ Servidor responde pero con error:', healthResponse.status, '\n');
    }
  } catch (error) {
    console.error('❌ Servidor NO está corriendo. Por favor inicia el servidor con: npm start\n');
    return;
  }

  // Test 2: Verificar ruta de evaluaciones (sin autenticación)
  try {
    console.log('2️⃣ Probando ruta /ugel-talara/evaluaciones/guardar-nota-manual...');
    const response = await makeRequest('/ugel-talara/evaluaciones/guardar-nota-manual', 'POST', {
      candidatoId: 1,
      notaManual: 75,
      estado: 'aprobado',
      evaluadoPor: 'Test'
    });

    console.log('📥 Status:', response.status, response.statusText);

    if (response.status === 401 || response.status === 403) {
      console.log('✅ Ruta existe pero requiere autenticación (esto es correcto)\n');
    } else if (response.status === 404) {
      console.log('❌ Ruta NO encontrada (404)');
      console.log('   Posibles causas:');
      console.log('   - El servidor necesita reiniciarse');
      console.log('   - Las rutas no se cargaron correctamente');
      console.log('   - Hay un error en el archivo de rutas\n');
    } else {
      const data = response.text();
      console.log('📄 Respuesta:', data, '\n');
    }
  } catch (error) {
    console.error('❌ Error al probar ruta:', error.message, '\n');
  }

  // Test 3: Verificar ruta alternativa /api/evaluaciones
  try {
    console.log('3️⃣ Probando ruta alternativa /api/evaluaciones/guardar-nota-manual...');
    const response = await makeRequest('/api/evaluaciones/guardar-nota-manual', 'POST', {
      candidatoId: 1,
      notaManual: 75,
      estado: 'aprobado',
      evaluadoPor: 'Test'
    });

    console.log('📥 Status:', response.status, response.statusText);

    if (response.status === 401 || response.status === 403) {
      console.log('✅ Ruta alternativa existe y requiere autenticación\n');
    } else if (response.status === 404) {
      console.log('❌ Ruta alternativa tampoco encontrada\n');
    } else {
      const data = response.text();
      console.log('📄 Respuesta:', data, '\n');
    }
  } catch (error) {
    console.error('❌ Error al probar ruta alternativa:', error.message, '\n');
  }

  console.log('🏁 Pruebas completadas');
  console.log('\n💡 Solución recomendada:');
  console.log('   1. Detén el servidor (Ctrl+C)');
  console.log('   2. Reinicia con: npm start');
  console.log('   3. Vuelve a probar el endpoint desde el frontend');
}

testEndpoint();
