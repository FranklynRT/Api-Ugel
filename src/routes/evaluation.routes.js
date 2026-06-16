import express from 'express';
// import EvaluationController from '../controllers/evaluationController.js';
import { verifyToken as authMiddleware } from '../authMiddleware.js';
import {
  generarReporteExcelEvaluaciones,
  analizarPostulanteConIA,
  analizarConvocatoriaConIA
} from '../controllers/reports.controller.js';
import ExcelJS from 'exceljs';

const router = express.Router();

/**
 * Función para asegurar que la tabla de evaluaciones manuales existe
 */
async function asegurarTablaEvaluacionesManuales(pool) {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS EVALUACIONES_MANUALES_CV (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        CANDIDATOID INT NOT NULL,
        NOTAMANUAL DECIMAL(5,2) NOT NULL,
        ESTADO VARCHAR(50) NOT NULL,
        EVALUADOPOR VARCHAR(255),
        FECHAEVALUACION DATETIME DEFAULT CURRENT_TIMESTAMP,
        TIENECOLEGIATURA ENUM('si', 'no') DEFAULT 'no',
        INDEX idx_candidato (CANDIDATOID),
        INDEX idx_estado (ESTADO),
        INDEX idx_fecha (FECHAEVALUACION)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Agregar columna TIENECOLEGIATURA si no existe (para migraciones)
    try {
      await pool.query(`
        SELECT TIENECOLEGIATURA FROM EVALUACIONES_MANUALES_CV LIMIT 1
      `);
    } catch (error) {
      console.log('⚠️ Columna TIENECOLEGIATURA no existe, agregándola...');
      await pool.query(`
        ALTER TABLE EVALUACIONES_MANUALES_CV 
        ADD COLUMN TIENECOLEGIATURA ENUM('si', 'no') DEFAULT 'no' AFTER FECHAEVALUACION
      `);
      console.log('✅ Columna TIENECOLEGIATURA agregada');
    }

    console.log('✅ Tabla EVALUACIONES_MANUALES_CV verificada/creada');
  } catch (error) {
    console.error('❌ Error al crear tabla EVALUACIONES_MANUALES_CV:', error);
  }
}

/**
 * Rutas para Evaluación Automática CAS
 * Rutas comentadas temporalmente - archivo evaluationController.js está vacío
 */

// router.post('/evaluar/:convocatoriaId/:postulanteId', 
//   authMiddleware, 
//   EvaluationController.evaluarPostulante
// );

// router.post('/evaluar-convocatoria/:convocatoriaId', 
//   authMiddleware, 
//   EvaluationController.evaluarConvocatoriaCompleta
// );

// router.get('/reporte/:convocatoriaId/:postulanteId', 
//   authMiddleware, 
//   EvaluationController.obtenerReporteEvaluacion
// );

// router.get('/reporte-pdf/:convocatoriaId', 
//   authMiddleware, 
//   EvaluationController.generarReportePDF
// );

// router.get('/estadisticas/:convocatoriaId', 
//   authMiddleware, 
//   EvaluationController.obtenerEstadisticasEvaluaciones
// );

// Ruta para generar reporte Excel de evaluaciones (IA)
router.get('/reporte-excel/:convocatoriaId',
  generarReporteExcelEvaluaciones
);

// === RUTAS PARA ANÁLISIS CON IA ===

// Analizar un postulante específico con IA
router.post('/analizar-postulante/:postulanteId/:convocatoriaId',
  authMiddleware,
  analizarPostulanteConIA
);

// Analizar todos los postulantes de una convocatoria con IA
router.post('/analizar-convocatoria/:convocatoriaId',
  authMiddleware,
  analizarConvocatoriaConIA
);

// === NUEVAS RUTAS PARA EVALUACIONES MANUALES DE CV ===

// Guardar nota manual de evaluación de CV
router.post('/guardar-nota-manual', authMiddleware, async (req, res) => {
  try {
    const { 
      candidatoId, 
      notaManual, 
      estado, 
      evaluadoPor, 
      tieneColegiatura,
      notaFormacionAcademica,
      notaExperienciaGeneral,
      notaExperienciaEspecifica,
      expedienteSIGEA,
      fechaExpediente
    } = req.body;
    const pool = req.app.get('pool');

    console.log('📝 Guardando evaluación manual:', {
      candidatoId,
      notaManual,
      estado,
      notaFormacionAcademica,
      notaExperienciaGeneral,
      notaExperienciaEspecifica,
      expedienteSIGEA,
      fechaExpediente
    });

    // Asegurar que la tabla existe
    await asegurarTablaEvaluacionesManuales(pool);

    // Verificar si ya existe una evaluación para este candidato
    const checkQuery = `
      SELECT * FROM EVALUACIONES_MANUALES_CV 
      WHERE CANDIDATOID = ?
    `;
    const [existing] = await pool.query(checkQuery, [candidatoId]);

    const colegiaturaValue = tieneColegiatura === true || tieneColegiatura === 'si' ? 'si' : 'no';

    if (existing.length > 0) {
      // Actualizar evaluación existente
      const updateQuery = `
        UPDATE EVALUACIONES_MANUALES_CV 
        SET NOTAMANUAL = ?, ESTADO = ?, EVALUADOPOR = ?, FECHAEVALUACION = NOW(), TIENECOLEGIATURA = ?
        WHERE CANDIDATOID = ?
      `;
      await pool.query(updateQuery, [notaManual, estado, evaluadoPor, colegiaturaValue, candidatoId]);
      console.log('✅ Evaluación actualizada en BD');
    } else {
      // Insertar nueva evaluación
      const insertQuery = `
        INSERT INTO EVALUACIONES_MANUALES_CV 
        (CANDIDATOID, NOTAMANUAL, ESTADO, EVALUADOPOR, FECHAEVALUACION, TIENECOLEGIATURA)
        VALUES (?, ?, ?, ?, NOW(), ?)
      `;
      await pool.query(insertQuery, [candidatoId, notaManual, estado, evaluadoPor, colegiaturaValue]);
      console.log('✅ Nueva evaluación insertada en BD');
    }

    // Actualizar también las notas individuales y datos de expediente en la tabla POSTULANTES_REGISTRADOS
    if (notaFormacionAcademica !== undefined || notaExperienciaGeneral !== undefined || 
        notaExperienciaEspecifica !== undefined || expedienteSIGEA !== undefined || 
        fechaExpediente !== undefined) {
      try {
        const updatePostulanteQuery = `
          UPDATE POSTULANTES_REGISTRADOS 
          SET 
            notaFormacionAcademica = COALESCE(?, notaFormacionAcademica),
            notaExperienciaGeneral = COALESCE(?, notaExperienciaGeneral),
            notaExperienciaEspecifica = COALESCE(?, notaExperienciaEspecifica),
            expedienteSIGEA = COALESCE(?, expedienteSIGEA),
            fechaExpediente = COALESCE(?, fechaExpediente)
          WHERE id = ?
        `;
        await pool.query(updatePostulanteQuery, [
          notaFormacionAcademica || null,
          notaExperienciaGeneral || null,
          notaExperienciaEspecifica || null,
          expedienteSIGEA || null,
          fechaExpediente || null,
          candidatoId
        ]);
        console.log('✅ Notas individuales y datos de expediente actualizados en POSTULANTES_REGISTRADOS');
      } catch (error) {
        console.warn('⚠️ No se pudieron actualizar los datos en POSTULANTES_REGISTRADOS:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'Nota guardada exitosamente',
      candidatoId,
      notaManual,
      estado,
      tieneColegiatura: colegiaturaValue
    });
  } catch (error) {
    console.error('Error al guardar nota manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar la nota',
      error: error.message
    });
  }
});

// Obtener todas las notas manuales
router.get('/notas-manuales', authMiddleware, async (req, res) => {
  try {
    const pool = req.app.get('pool');

    const query = `
      SELECT 
        CANDIDATOID as candidatoId,
        NOTAMANUAL as notaManual,
        ESTADO as estado,
        EVALUADOPOR as evaluadoPor,
        FECHAEVALUACION as fechaEvaluacion,
        TIENECOLEGIATURA as tieneColegiatura
      FROM EVALUACIONES_MANUALES_CV
    `;

    const [notas] = await pool.query(query);
    res.json(notas);
  } catch (error) {
    console.error('Error al obtener notas manuales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las notas',
      error: error.message
    });
  }
});

// Generar reporte Excel de evaluaciones manuales
router.get('/reporte-excel-manual/:convocatoriaId', async (req, res) => {
  try {
    const { convocatoriaId } = req.params;
    const pool = req.app.get('pool');

    console.log('📊 Generando reporte Excel manual para convocatoria:', convocatoriaId);

    // Verificar que la tabla existe
    try {
      await pool.query('SELECT 1 FROM EVALUACIONES_MANUALES_CV LIMIT 1');
    } catch (tableError) {
      console.error('❌ Tabla EVALUACIONES_MANUALES_CV no existe');
      return res.status(500).json({
        success: false,
        message: 'La tabla de evaluaciones manuales no existe. Por favor ejecuta el script SQL de creación.',
        error: 'TABLE_NOT_EXISTS'
      });
    }

    // Obtener evaluaciones manuales con datos de postulantes
    const query = `
      SELECT 
        p.id,
        p.nombreCompleto,
        p.dni,
        p.email,
        p.telefono,
        p.puesto,
        p.area,
        em.NOTAMANUAL as notaManual,
        em.ESTADO as estado,
        em.EVALUADOPOR as evaluadoPor,
        em.FECHAEVALUACION as fechaEvaluacion,
        em.TIENECOLEGIATURA as tieneColegiatura
      FROM POSTULANTES_REGISTRADOS p
      LEFT JOIN EVALUACIONES_MANUALES_CV em ON p.id = em.CANDIDATOID
      WHERE p.convocatoriaId = ?
      ORDER BY em.NOTAMANUAL DESC, p.nombreCompleto ASC
    `;

    const [evaluaciones] = await pool.query(query, [convocatoriaId]);

    console.log(`✅ Encontradas ${evaluaciones.length} evaluaciones`);

    // Crear workbook de Excel con formato oficial UGEL
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resultados Evaluación');

    // Configurar anchos de columna
    worksheet.columns = [
      { width: 5 },   // N°
      { width: 35 },  // APELLIDOS Y NOMBRES
      { width: 12 },  // DNI
      { width: 15 },  // N° EXPEDIENTE
      { width: 15 },  // FECHA DE EXP.
      { width: 15 },  // FORMACIÓN ACADÉMICA
      { width: 15 },  // EXPERIENCIA GENERAL
      { width: 15 },  // EXPERIENCIA ESPECÍFICA
      { width: 12 },  // PUNTAJE
      { width: 20 },  // CONDICIÓN FINAL
      { width: 40 }   // OBSERVACIÓN
    ];

    // FILA 1: Título principal
    worksheet.mergeCells('A1:K1');
    const titleRow = worksheet.getCell('A1');
    titleRow.value = 'AÑO DE LA RECUPERACIÓN Y CONSOLIDACIÓN DE LA ECONOMÍA PERUANA';
    titleRow.font = { bold: true, size: 11 };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 20;

    // FILA 2: Vacía
    worksheet.getRow(2).height = 5;

    // FILA 3: Título del documento
    worksheet.mergeCells('A3:K3');
    const docTitle = worksheet.getCell('A3');
    docTitle.value = `RESULTADOS PRELIMINARES DE LA EVALUACIÓN CURRICULAR - PROCESO DE CONTRATACIÓN CAS DETERMINADO (NECESIDAD TRANSITORIO) N° 021-2025-UGEL-T`;
    docTitle.font = { bold: true, size: 10 };
    docTitle.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    worksheet.getRow(3).height = 30;

    // FILA 4: Proceso
    worksheet.mergeCells('A4:K4');
    const proceso = worksheet.getCell('A4');
    proceso.value = 'PROCESO DE CONTRATACIÓN CAS (NECESIDAD TRANSITORIO) N° 021-2025-UGEL-T';
    proceso.font = { bold: true, size: 9 };
    proceso.alignment = { horizontal: 'left', vertical: 'middle' };

    // FILA 5: Puesto (obtener del primer candidato)
    worksheet.mergeCells('A5:K5');
    const puesto = worksheet.getCell('A5');
    puesto.value = evaluaciones[0]?.puesto || 'TÉCNICO EN PATRIMONIO';
    puesto.font = { bold: true, size: 9 };
    puesto.alignment = { horizontal: 'left', vertical: 'middle' };

    // FILA 6: Fecha
    worksheet.mergeCells('A6:K6');
    const fecha = worksheet.getCell('A6');
    fecha.value = `FECHA: ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    fecha.font = { bold: true, size: 9 };
    fecha.alignment = { horizontal: 'left', vertical: 'middle' };

    // FILA 7: Indicaciones
    worksheet.mergeCells('A7:K7');
    const indicaciones = worksheet.getCell('A7');
    indicaciones.value = 'INDICACIONES A TENER EN CUENTA';
    indicaciones.font = { bold: true, size: 9 };
    indicaciones.alignment = { horizontal: 'left', vertical: 'middle' };

    // FILA 8: Nota explicativa
    worksheet.mergeCells('A8:K8');
    const nota = worksheet.getCell('A8');
    nota.value = 'Los/as postulantes que obtienen la condición de "APTO" deberán verificar la publicación del Rol de Entrevista y las consideraciones para su ejecución en la fecha establecida según el cronograma';
    nota.font = { size: 8 };
    nota.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    worksheet.getRow(8).height = 30;

    // FILA 9: Vacía
    worksheet.getRow(9).height = 5;

    // FILA 10: Encabezados de tabla
    const headerRow = worksheet.getRow(10);
    headerRow.values = [
      'N°',
      'APELLIDOS Y NOMBRES(*)',
      'DNI',
      'N° EXPEDIENTE',
      'FECHA DE EXP.',
      'FORMACIÓN ACADÉMICA',
      'EXPERIENCIA GENERAL',
      'EXPERIENCIA ESPECÍFICA',
      'PUNTAJE',
      'CONDICIÓN FINAL DE LA EVALUACIÓN',
      'OBSERVACIÓN'
    ];

    // Estilo del encabezado
    headerRow.font = { bold: true, size: 9 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.height = 40;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Agregar datos de evaluaciones
    evaluaciones.forEach((ev, index) => {
      const row = worksheet.addRow([
        index + 1,
        ev.nombreCompleto || 'N/A',
        ev.dni || 'N/A',
        ev.expedienteSIGEA || '10778-2025',
        ev.fechaEvaluacion ? new Date(ev.fechaEvaluacion).toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE'),
        '-', // Formación académica
        '-', // Experiencia general
        '-', // Experiencia específica
        ev.notaManual || 0,
        ev.notaManual >= 50 ? 'APTO' : 'NO APTO',
        ev.notaManual < 50 ? 'NO cumple con el requisito mínimo de formación académica' : ''
      ]);

      // Estilo de las celdas
      row.font = { size: 9 };
      row.alignment = { horizontal: 'center', vertical: 'middle' };
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Colorear PUNTAJE según valor
      const puntajeCell = row.getCell(9);
      if (ev.notaManual >= 50) {
        puntajeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF92D050' }
        };
        puntajeCell.font = { bold: true, size: 9 };
      } else if (ev.notaManual > 0) {
        puntajeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' }
        };
      }

      // Colorear CONDICIÓN FINAL
      const condicionCell = row.getCell(10);
      if (ev.notaManual >= 50) {
        condicionCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF92D050' }
        };
        condicionCell.font = { bold: true, size: 9 };
      } else {
        condicionCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' }
        };
      }

      // Alinear observación a la izquierda
      row.getCell(11).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    });

    // Agregar nota al final
    const lastRow = worksheet.lastRow.number + 2;
    worksheet.mergeCells(`A${lastRow}:K${lastRow}`);
    const notaFinal = worksheet.getCell(`A${lastRow}`);
    notaFinal.value = 'NOTA:\nNO APTO/A: al luego de la verificación de la documentación sustentatoria remitida, la/el postulante no acredita de manera fehaciente el cumplimiento de uno (01) o más de los requisitos mínimos exigidos en el perfil del puesto al cual postula, mismo que se declara NO APTO.';
    notaFinal.font = { bold: true, size: 8 };
    notaFinal.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    worksheet.getRow(lastRow).height = 40;

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Evaluaciones_CV_Manual_${convocatoriaId}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('Error al generar reporte Excel manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el reporte',
      error: error.message
    });
  }
});

export default router;
