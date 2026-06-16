// Script para probar el endpoint de guardar nota manual
import http from 'http';

const API_BASE_URL = 'http://localhost:9000';

// Datos de prueba
const testData = {
  candidatoId: 1, // Cambiar por un ID real de tu base de datos
  notaManual: 75,
  estado: 'aprobado',
  evaluadoPor: 'Test Script',
  notaFormacionAcademica: 30,
  notaExperienciaGeneral: 25,
  notaExperienciaEspecifica: 20,
  expedienteSIGEA: '10778-2025',
  fechaExpediente: '2025-01-15'
};

// Token de autenticación - DEBES REEMPLAZAR ESTO CON UN TOKEN VÁLIDO
const TOKEN = 'TU_TOKEN_AQUI'; // Obtén esto del localStorage del navegador

function makeRequest(path, method = 'POST', body = null, token = null) {
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

    // Agregar token si existe
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          statusText: res.statusMessage, 
          data: data,
          json: () => {
            try {
              return JSON.parse(data);
            } catch {
              return { error: 'No se pudo parsear JSON', raw: data };
            }
          }
        });
      });
    });

    req.on('error', (error) => reject(error));
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testGuardarNota() {
  console.log('🧪 Probando endpoint de guardar nota manual...\n');

  // Test 1: Sin autenticación (debe fallar con 403)
  try {
    console.log('1️⃣ Probando sin autenticación (debe fallar)...');
    const response = await makeRequest('/api/evaluaciones/guardar-nota-manual', 'POST', testData);
    console.log('📥 Status:', response.status, response.statusText);
    
    if (response.status === 403) {
      console.log('✅ Correcto: Requiere autenticación\n');
    } else {
      console.log('⚠️ Inesperado: Debería requerir autenticación\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message, '\n');
  }

  // Test 2: Con autenticación (si tienes un token)
  if (TOKEN && TOKEN !== 'TU_TOKEN_AQUI') {
    try {
      console.log('2️⃣ Probando con autenticación...');
      console.log('📤 Datos a enviar:', testData);
      
      const response = await makeRequest('/api/evaluaciones/guardar-nota-manual', 'POST', testData, TOKEN);
      console.log('📥 Status:', response.status, response.statusText);
      
      const result = response.json();
      console.log('📄 Respuesta:', result);
      
      if (response.status === 200) {
        console.log('✅ Nota guardada exitosamente\n');
      } else {
        console.log('❌ Error al guardar nota\n');
      }
    } catch (error) {
      console.error('❌ Error:', error.message, '\n');
    }
  } else {
    console.log('⚠️ No se proporcionó un token válido. Para probar con autenticación:');
    console.log('   1. Abre el navegador y ve a la aplicación');
    console.log('   2. Abre la consola del navegador (F12)');
    console.log('   3. Escribe: localStorage.getItem("token")');
    console.log('   4. Copia el token y reemplaza "TU_TOKEN_AQUI" en este script\n');
  }

  console.log('🏁 Pruebas completadas');
  console.log('\n💡 Instrucciones:');
  console.log('   1. Asegúrate de que el servidor esté corriendo (npm start en la carpeta Api)');
  console.log('   2. Verifica que la tabla POSTULANTES_REGISTRADOS tenga las columnas de notas');
  console.log('   3. Ejecuta el script SQL: AGREGAR_COLUMNAS_NOTAS.sql');
  console.log('   4. Prueba desde el frontend ingresando notas y haciendo clic en Guardar');
}

testGuardarNota();
