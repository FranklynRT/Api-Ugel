import fetch from 'node-fetch';

/**
 * Script de Prueba para Sistema de Evaluación CAS
 * Verifica que todos los endpoints funcionen correctamente
 */

const BASE_URL = 'http://localhost:9000/api';
const TEST_TOKEN = 'test_token_here'; // Reemplazar con token real

class TestSuite {
  constructor() {
    this.results = [];
    this.testData = {
      convocatoria: {
        area: 'Educación',
        puesto: 'Especialista en Educación',
        sueldo: 3500.00,
        requisitos: 'Título profesional en Educación o afines',
        experiencia: 'Mínimo 3 años de experiencia en gestión educativa',
        licenciatura: 'Licenciatura en Educación',
        habilidades: 'Gestión educativa, liderazgo pedagógico',
        numero_cas: 'CAS-TEST-2024',
        fecha_inicio: '2024-01-15',
        fecha_fin: '2024-02-15',
        descripcion: 'Convocatoria de prueba para testing',
        url_publica: 'test-educacion-especialista-cas-test-2024'
      },
      postulante: {
        nombre: 'Juan Pérez Test',
        dni: '12345678',
        email: 'juan.test@email.com',
        telefono: '987654321'
      }
    };
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Ejecutando: ${testName}`);
      const result = await testFunction();
      this.results.push({ test: testName, status: 'PASS', result });
      console.log(`✅ ${testName}: EXITOSO`);
      return result;
    } catch (error) {
      this.results.push({ test: testName, status: 'FAIL', error: error.message });
      console.log(`❌ ${testName}: FALLÓ - ${error.message}`);
      return null;
    }
  }

  async testHealthCheck() {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    console.log('📊 Estado del sistema:', data);
    return data;
  }

  async testCreateConvocatoria() {
    const response = await fetch(`${BASE_URL}/convocatorias/admin/crear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify(this.testData.convocatoria)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Error creando convocatoria: ${data.message || response.statusText}`);
    }

    this.testData.convocatoriaId = data.data.id;
    this.testData.convocatoriaUrl = data.data.url_publica;
    
    console.log('📝 Convocatoria creada:', data.data);
    return data;
  }

  async testGetConvocatoriaPublica() {
    const response = await fetch(`${BASE_URL}/convocatorias/public/${this.testData.convocatoriaUrl}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Error obteniendo convocatoria pública: ${data.message || response.statusText}`);
    }

    console.log('📋 Convocatoria pública:', data.data);
    return data;
  }

  async testPostularPorURL() {
    const response = await fetch(`${BASE_URL}/convocatorias/public/${this.testData.convocatoriaUrl}/postular`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.testData.postulante)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Error postulando: ${data.message || response.statusText}`);
    }

    this.testData.postulanteId = data.data.postulante_id;
    
    console.log('👤 Postulación realizada:', data.data);
    return data;
  }

  async testEvaluarPostulante() {
    const response = await fetch(`${BASE_URL}/evaluaciones/evaluar/${this.testData.convocatoriaId}/${this.testData.postulanteId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Error evaluando postulante: ${data.message || response.statusText}`);
    }

    console.log('🎯 Evaluación completada:', data.data);
    return data;
  }

  async testObtenerReporte() {
    const response = await fetch(`${BASE_URL}/evaluaciones/reporte/${this.testData.convocatoriaId}/${this.testData.postulanteId}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Error obteniendo reporte: ${data.message || response.statusText}`);
    }

    console.log('📊 Reporte obtenido:', data.data);
    return data;
  }

  async testEstadisticas() {
    const response = await fetch(`${BASE_URL}/evaluaciones/estadisticas/${this.testData.convocatoriaId}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Error obteniendo estadísticas: ${data.message || response.statusText}`);
    }

    console.log('📈 Estadísticas:', data.data);
    return data;
  }

  async testRanking() {
    const response = await fetch(`${BASE_URL}/evaluaciones/ranking/${this.testData.convocatoriaId}?limite=10`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Error obteniendo ranking: ${data.message || response.statusText}`);
    }

    console.log('🏆 Ranking:', data.data);
    return data;
  }

  async testListarConvocatorias() {
    const response = await fetch(`${BASE_URL}/convocatorias/public?limite=5`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Error listando convocatorias: ${data.message || response.statusText}`);
    }

    console.log('📋 Convocatorias activas:', data.data);
    return data;
  }

  async testGenerarPDF() {
    const response = await fetch(`${BASE_URL}/evaluaciones/reporte-pdf/${this.testData.convocatoriaId}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error generando PDF: ${errorData.message || response.statusText}`);
    }

    console.log('📄 PDF generado exitosamente');
    return { success: true, contentType: response.headers.get('content-type') };
  }

  async testExportarExcel() {
    const response = await fetch(`${BASE_URL}/evaluaciones/exportar-excel/${this.testData.convocatoriaId}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error exportando Excel: ${errorData.message || response.statusText}`);
    }

    console.log('📊 Excel exportado exitosamente');
    return { success: true, contentType: response.headers.get('content-type') };
  }

  async cleanup() {
    try {
      console.log('\n🧹 Limpiando datos de prueba...');
      
      // Aquí se podrían agregar llamadas para eliminar los datos de prueba
      // Por ejemplo, eliminar la convocatoria creada
      
      console.log('✅ Limpieza completada');
    } catch (error) {
      console.log('⚠️ Error en limpieza:', error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 Iniciando Suite de Pruebas - Sistema Evaluación CAS');
    console.log('=' .repeat(60));

    // Tests básicos
    await this.runTest('Health Check', () => this.testHealthCheck());
    
    // Tests de convocatorias
    await this.runTest('Crear Convocatoria', () => this.testCreateConvocatoria());
    await this.runTest('Obtener Convocatoria Pública', () => this.testGetConvocatoriaPublica());
    await this.runTest('Listar Convocatorias Activas', () => this.testListarConvocatorias());
    
    // Tests de postulación
    await this.runTest('Postular por URL', () => this.testPostularPorURL());
    
    // Tests de evaluación
    await this.runTest('Evaluar Postulante', () => this.testEvaluarPostulante());
    await this.runTest('Obtener Reporte', () => this.testObtenerReporte());
    await this.runTest('Obtener Estadísticas', () => this.testEstadisticas());
    await this.runTest('Obtener Ranking', () => this.testRanking());
    
    // Tests de exportación
    await this.runTest('Generar PDF', () => this.testGenerarPDF());
    await this.runTest('Exportar Excel', () => this.testExportarExcel());

    // Limpieza
    await this.cleanup();

    // Resumen final
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMEN DE PRUEBAS');
    console.log('=' .repeat(60));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`✅ Exitosas: ${passed}`);
    console.log(`❌ Fallidas: ${failed}`);
    console.log(`📊 Total: ${total}`);
    console.log(`🎯 Porcentaje de éxito: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ PRUEBAS FALLIDAS:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.test}: ${r.error}`));
    }

    console.log('\n' + '=' .repeat(60));
    
    if (failed === 0) {
      console.log('🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
      console.log('✅ El sistema está funcionando correctamente');
    } else {
      console.log('⚠️ Algunas pruebas fallaron. Revisar configuración.');
    }
  }
}

// Ejecutar pruebas
async function main() {
  const testSuite = new TestSuite();
  
  try {
    await testSuite.runAllTests();
  } catch (error) {
    console.error('💥 Error fatal en suite de pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default TestSuite;
