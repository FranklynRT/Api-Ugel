/**
 * Script para probar el guardado de constancias
 * Ejecutar con: node PROBAR_CONSTANCIA.js
 */

import { pool } from './src/database/conexion.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONSTANCIAS_DIR = path.join(__dirname, 'uploads/constancias');

async function probarConstancia() {
  try {
    console.log('🔍 Verificando sistema de constancias...\n');

    // 1. Verificar que la carpeta existe
    if (!fs.existsSync(CONSTANCIAS_DIR)) {
      console.log('📁 Creando carpeta de constancias...');
      fs.mkdirSync(CONSTANCIAS_DIR, { recursive: true });
      console.log('✅ Carpeta creada:', CONSTANCIAS_DIR);
    } else {
      console.log('✅ Carpeta existe:', CONSTANCIAS_DIR);
    }

    // 2. Verificar columna archivoConstancia
    console.log('\n🔍 Verificando columna archivoConstancia...');
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'postulantes_registrados' 
        AND COLUMN_NAME = 'archivoConstancia'
    `);

    if (columns.length === 0) {
      console.log('⚠️  Columna archivoConstancia NO existe. Creándola...');
      await pool.execute(`
        ALTER TABLE postulantes_registrados
        ADD COLUMN archivoConstancia VARCHAR(255) AFTER expedienteSIGEA
      `);
      console.log('✅ Columna archivoConstancia creada');
    } else {
      console.log('✅ Columna archivoConstancia existe');
    }

    // 3. Ver postulantes en la BD
    console.log('\n📊 Postulantes en la base de datos:');
    const [postulantes] = await pool.execute(`
      SELECT id, certificadoId, nombreCompleto, dni, archivoConstancia, 
             CASE 
               WHEN imagenConstancia IS NOT NULL THEN 'SI' 
               ELSE 'NO' 
             END as tiene_blob
      FROM postulantes_registrados
      ORDER BY id DESC
      LIMIT 5
    `);

    if (postulantes.length === 0) {
      console.log('⚠️  No hay postulantes registrados');
    } else {
      console.table(postulantes);
    }

    // 4. Crear una constancia de prueba
    console.log('\n🎨 Creando constancia de prueba...');
    
    // Crear un PNG simple de prueba (1x1 pixel transparente)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);

    const nombreArchivoPrueba = 'PRUEBA-TEST-' + Date.now() + '.png';
    const rutaArchivoPrueba = path.join(CONSTANCIAS_DIR, nombreArchivoPrueba);
    
    fs.writeFileSync(rutaArchivoPrueba, pngBuffer);
    console.log('✅ Archivo de prueba creado:', nombreArchivoPrueba);

    // 5. Verificar que se guardó
    if (fs.existsSync(rutaArchivoPrueba)) {
      const stats = fs.statSync(rutaArchivoPrueba);
      console.log('✅ Archivo verificado:', stats.size, 'bytes');
    }

    // 6. Listar archivos en la carpeta
    console.log('\n📁 Archivos en la carpeta constancias:');
    const archivos = fs.readdirSync(CONSTANCIAS_DIR);
    if (archivos.length === 0) {
      console.log('⚠️  Carpeta vacía');
    } else {
      archivos.forEach(archivo => {
        const rutaCompleta = path.join(CONSTANCIAS_DIR, archivo);
        const stats = fs.statSync(rutaCompleta);
        console.log(`  - ${archivo} (${stats.size} bytes)`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ PRUEBA COMPLETADA');
    console.log('='.repeat(60));
    console.log('\n📝 INSTRUCCIONES:');
    console.log('1. Verifica que la carpeta existe: Api/uploads/constancias/');
    console.log('2. Verifica que el archivo de prueba se creó');
    console.log('3. Intenta generar una constancia desde el frontend');
    console.log('4. Revisa los logs del servidor para ver si hay errores');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar prueba
probarConstancia();
