import { pool } from './src/database/conexion.js';

const migrar = async () => {
  try {
    console.log('🔄 Migrando datos a historial_postulaciones...\n');

    // Obtener postulantes registrados o rechazados
    const [postulantes] = await pool.execute(`
      SELECT * FROM postulantes_registrados 
      WHERE estado IN ('Registrado', 'Rechazado')
    `);

    console.log(`📊 Encontrados ${postulantes.length} postulantes para migrar\n`);

    let migrados = 0;
    for (const p of postulantes) {
      try {
        await pool.execute(`
          INSERT INTO historial_postulaciones (
            usuario_id, convocatoria_id, anexo_id, curriculum_id,
            certificado_id, nombre_completo, apellido_paterno, apellido_materno,
            dni, email, telefono, numero_cas, puesto, area,
            expediente_sigea, estado, motivo_rechazo, fecha_accion, usuario_accion, accion, detalles
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          p.IDUSUARIO || null,
          p.convocatoriaId || null,
          p.anexoId || null,
          p.curriculumId || null,
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
          p.expedienteSIGEA || null,
          p.estado,
          p.estado === 'Rechazado' ? 'Migrado desde postulantes_registrados' : null,
          p.fechaActualizacion || p.fechaRegistro || new Date(),
          'Sistema - Migración',
          p.estado,
          `Postulante ${p.estado.toLowerCase()} - Migrado desde postulantes_registrados`
        ]);
        
        migrados++;
        console.log(`✅ ${migrados}. ${p.nombreCompleto} (${p.estado})`);
      } catch (error) {
        console.error(`❌ Error al migrar ${p.nombreCompleto}:`, error.message);
      }
    }

    console.log(`\n✅ Migración completada: ${migrados}/${postulantes.length} registros`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

migrar();
