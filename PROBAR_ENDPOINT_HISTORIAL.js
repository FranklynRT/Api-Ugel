import fetch from 'node-fetch';

const probarEndpoint = async () => {
  try {
    console.log('🔍 Probando endpoint del historial...\n');
    
    const url = 'http://localhost:9000/ugel-talara/historial/historial-tramites';
    console.log(`📡 URL: ${url}\n`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Respuesta exitosa:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('\n❌ Error en la respuesta:');
      console.log(text);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

probarEndpoint();
