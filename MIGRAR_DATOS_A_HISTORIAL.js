import { pool } from './src/database/conexion.js';

/**
 * Script para migrar datos de postulantes_registrados a historial_tramites
 */
const migrarDatosAHistorial = async () => {
  try {
    console.log('🔄 Iniciando migración de datos a historial_tramites...');

    // Obtener todos los postulantes registrados con estado Registrado o Rechazado
    const [postulantes] = await pool.execute(`
      SELECT * FROM postulantes_registrados 
      WHERE estado IN ('Registrado', 'Rechazado')
    `);

    console.log(`📊 Encontrados ${postulantes.length} postulantes para migrar`);

    if (postulantes.length === 0) {
      console.log('ℹ️ No hay postulantes para migrar');
      process.exit(0);
    }

    let migrados = 0;
    let errores = 0;

    for (const p of postulantes) {
      try {
        // Verificar si ya existe en el historial (usar el ID del postulante y certificado)
        const [existe] = await pool.execute(
          'SELECT id FROM historial_tramites WHERE postulanteId = ?',
          [p.id]
        );

        if (existe.length > 0) {
          console.log(`⏭️ Postulante ${p.nombreCompleto} ya existe en historial, omitiendo...`);
          continue;
        }

        // Insertar en historial_tramites
        await pool.execute(`
          INSERT INTO historial_tramites (
            postulanteId, certificadoId, nombreCompleto, apellidoPaterno, apellidoMaterno,
            dni, email, telefono, numeroCAS, puesto, area,
            convocatoriaId, anexoId, curriculumId, expedienteSIGEA,
            estado, motivoRechazo, fechaAccion, usuarioAccion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          p.id,
          p.certificadoId,
          p.nombreCompleto,
          p.apellidoPaterno || null,
          p.apellidoMaterno || null,
          p.dni,
          p.email || null,
          p.telefono || null,
          p.numeroCAS || null,
          p.puesto || null,
          p.area || null,
          p.convocatoriaId || null,
          p.anexoId || null,
          p.curriculumId || null,
          p.expedienteSIGEA || null,
          p.estado,
          p.estado === 'Rechazado' ? 'Migrado desde postulantes_registrados' : null,
          p.fechaActualizacion || p.fechaRegistro || new Date(),
          'Sistema - Migración'
        ]);

        migrados++;
        console.log(`✅ Migrado: ${p.nombreCompleto} (${p.estado})`);
      } catch (error) {
        errores++;
        console.error(`❌ Error al migrar ${p.nombreCompleto}:`, error.message);
      }
    }

    console.log('\n📊 Resumen de migración:');
    console.log(`   ✅ Migrados exitosamente: ${migrados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📋 Total procesados: ${postulantes.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
};

// Ejecutar migración
migrarDatosAHistorial();
