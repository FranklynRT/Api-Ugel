/**
 * Script para migrar constancias de la base de datos a archivos
 * Ejecutar con: node MIGRAR_CONSTANCIAS_A_ARCHIVOS.js
 */

import { pool } from './src/database/conexion.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONSTANCIAS_DIR = path.join(__dirname, 'uploads/constancias');

// Crear directorio si no existe
if (!fs.existsSync(CONSTANCIAS_DIR)) {
  fs.mkdirSync(CONSTANCIAS_DIR, { recursive: true });
  console.log('✅ Carpeta de constancias creada:', CONSTANCIAS_DIR);
}

async function migrarConstancias() {
  try {
    console.log('🔄 Iniciando migración de constancias...\n');

    // Obtener todos los postulantes con imagenConstancia
    const [postulantes] = await pool.execute(`
      SELECT id, certificadoId, imagenConstancia 
      FROM postulantes_registrados 
      WHERE imagenConstancia IS NOT NULL
    `);

    console.log(`📊 Encontrados ${postulantes.length} postulantes con constancias en BD\n`);

    let migrados = 0;
    let errores = 0;
    let yaExisten = 0;

    for (const postulante of postulantes) {
      try {
        const { id, certificadoId, imagenConstancia } = postulante;
        
        // Generar nombre de archivo
        const nombreArchivo = `${certificadoId.replace(/[^a-zA-Z0-9-]/g, '_')}.png`;
        const rutaArchivo = path.join(CONSTANCIAS_DIR, nombreArchivo);

        // Verificar si ya existe el archivo
        if (fs.existsSync(rutaArchivo)) {
          console.log(`⏭️  Ya existe: ${nombreArchivo}`);
          yaExisten++;
          
          // Actualizar BD con el nombre del archivo
          await pool.execute(
            'UPDATE postulantes_registrados SET archivoConstancia = ? WHERE id = ?',
            [nombreArchivo, id]
          );
          continue;
        }

        // Guardar archivo
        fs.writeFileSync(rutaArchivo, imagenConstancia);

        // Actualizar BD con el nombre del archivo
        await pool.execute(
          'UPDATE postulantes_registrados SET archivoConstancia = ? WHERE id = ?',
          [nombreArchivo, id]
        );

        console.log(`✅ Migrado: ${nombreArchivo} (ID: ${id})`);
        migrados++;

      } catch (error) {
        console.error(`❌ Error al migrar ID ${postulante.id}:`, error.message);
        errores++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Migrados exitosamente: ${migrados}`);
    console.log(`⏭️  Ya existían: ${yaExisten}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📁 Total procesados: ${postulantes.length}`);
    console.log('='.repeat(60));

    // Opcional: Limpiar columna imagenConstancia después de migrar
    if (migrados > 0 || yaExisten > 0) {
      console.log('\n⚠️  ¿Deseas limpiar la columna imagenConstancia de la BD?');
      console.log('   (Esto liberará espacio pero las imágenes estarán solo en archivos)');
      console.log('   Para hacerlo, ejecuta este SQL en phpMyAdmin:');
      console.log('   UPDATE postulantes_registrados SET imagenConstancia = NULL WHERE archivoConstancia IS NOT NULL;');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal en la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrarConstancias();
