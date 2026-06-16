const { spawn } = require('child_process');

console.log('🚀 Iniciando API UGEL Talara con Ngrok...');
console.log('');

// Verificar si ngrok está instalado
const { exec } = require('child_process');

exec('ngrok --version', (error) => {
  if (error) {
    console.log('📦 Instalando ngrok...');
    console.log('');
    
    // Instalar ngrok
    const npmInstall = spawn('npm', ['install', '-g', 'ngrok'], {
      stdio: 'inherit'
    });

    npmInstall.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Ngrok instalado!');
        startServer();
      } else {
        console.error('❌ Error instalando ngrok');
      }
    });
  } else {
    startServer();
  }
});

function startServer() {
  console.log('🌐 Iniciando servidor local...');
  
  // Iniciar servidor en segundo plano
  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true
  });

  server.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  server.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  // Iniciar ngrok inmediatamente
  console.log('');
  console.log('✅ Servidor iniciado en http://localhost:9000');
  console.log('');
  console.log('🌍 Iniciando túnel público con ngrok...');
  console.log('');
  console.log('📝 Tu API estará disponible en: https://xxxx.ngrok.io');
  console.log('📊 Dashboard: http://localhost:4040');
  console.log('');
  console.log('⚠️  Presiona Ctrl+C para detener');
  console.log('');

  // Iniciar ngrok
  const ngrok = spawn('ngrok', ['http', '9000'], {
    stdio: 'inherit'
  });

  // Limpieza al salir
  process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo servidor...');
    server.kill();
    ngrok.kill();
    process.exit();
  });
}
