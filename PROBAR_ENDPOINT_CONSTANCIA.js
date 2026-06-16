/**
 * Script para probar el endpoint de constancias
 * Ejecutar con: node PROBAR_ENDPOINT_CONSTANCIA.js
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:9000/api/ugel-talara';

async function probarEndpoint() {
  try {
    console.log('🔍 Probando endpoint de constancias...\n');

    // IDs de postulantes a probar
    const postulantesIds = [19, 20];

    for (const id of postulantesIds) {
      console.log(`\n📊 Probando postulante ID: ${id}`);
      console.log('─'.repeat(60));

      const url = `${API_BASE_URL}/documentos/postulantes-registrados/${id}/certificado-imagen`;
      console.log(`URL: ${url}`);

      try {
        const response = await fetch(url, {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);

        if (response.ok) {
          const buffer = await response.buffer();
          console.log(`✅ Imagen recibida: ${buffer.length} bytes`);
          console.log(`   Tamaño: ${(buffer.length / 1024).toFixed(2)} KB`);
          
          // Verificar que sea un PNG válido
          const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
          console.log(`   Formato PNG válido: ${isPNG ? '✅ Sí' : '❌ No'}`);
        } else {
          const text = await response.text();
          console.log(`❌ Error: ${text}`);
        }
      } catch (error) {
        console.error(`❌ Error al hacer request:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ PRUEBA COMPLETADA');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error fatal:', error);
  }
}

// Ejecutar prueba
probarEndpoint();
