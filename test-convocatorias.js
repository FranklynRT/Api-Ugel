// Script para verificar qué campos devuelve el endpoint de convocatorias
import http from 'http';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
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
    req.end();
  });
}

async function testConvocatorias() {
  console.log('🧪 Probando endpoint de convocatorias...\n');

  try {
    console.log('📍 GET /ugel-talara/convocatorias');
    const response = await makeRequest('/ugel-talara/convocatorias');
    console.log('📥 Status:', response.status);
    
    const data = response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      console.log(`✅ ${data.length} convocatoria(s) encontrada(s)\n`);
      
      // Mostrar la primera convocatoria con TODOS sus campos
      console.log('📋 Primera convocatoria (TODOS los campos):');
      console.log(JSON.stringify(data[0], null, 2));
      
      console.log('\n📋 Campos específicos de la primera convocatoria:');
      console.log('- IDCONVOCATORIA:', data[0].IDCONVOCATORIA);
      console.log('- puesto:', data[0].puesto);
      console.log('- tituladoTecnico:', data[0].tituladoTecnico);
      console.log('- tituloProfesional:', data[0].tituloProfesional);
      console.log('- requisitosAcademicos:', data[0].requisitosAcademicos);
      console.log('- requisitos:', data[0].requisitos);
      console.log('- licenciatura:', data[0].licenciatura);
      
      // Buscar específicamente la convocatoria "Analista de datos"
      const analistaDatos = data.find(c => 
        c.puesto && c.puesto.toLowerCase().includes('analista')
      );
      
      if (analistaDatos) {
        console.log('\n📋 Convocatoria "Analista de datos":');
        console.log('- IDCONVOCATORIA:', analistaDatos.IDCONVOCATORIA);
        console.log('- puesto:', analistaDatos.puesto);
        console.log('- tituladoTecnico:', analistaDatos.tituladoTecnico);
        console.log('- tituloProfesional:', analistaDatos.tituloProfesional);
        console.log('- requisitosAcademicos:', analistaDatos.requisitosAcademicos);
        console.log('- requisitos:', analistaDatos.requisitos);
      }
    } else {
      console.log('⚠️ No hay convocatorias o el formato es incorrecto');
      console.log('Datos recibidos:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConvocatorias();
