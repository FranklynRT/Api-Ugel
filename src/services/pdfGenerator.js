import PDFDocument from "pdfkit";
import fs from "fs";
import ExcelJS from 'exceljs';

export async function generarPDF(resultado) {
  const fileName = `reporte_${Date.now()}.pdf`;
  const path = `./reports/${fileName}`;
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(path));

  doc.fontSize(18).text("Reporte de Evaluación de Postulante", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(resultado, { align: "left" });

  doc.end();
  return path;
}

/**
 * Generar reporte PDF de evaluaciones CAS
 */
export async function generarReporteEvaluacionesCAS(evaluaciones, convocatoriaInfo) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 30,
      size: 'A4',
      layout: 'landscape'  // Horizontal para más espacio
    });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ENCABEZADO OFICIAL
    const pageWidth = doc.page.width;

    // Rectángulo superior azul
    doc.rect(0, 0, pageWidth, 60)
      .fill('#1e3a8a');

    // Título principal
    doc.fontSize(14)
      .fillColor('#ffffff')
      .text('AÑO DE LA RECUPERACIÓN Y CONSOLIDACIÓN DE LA ECONOMÍA PERUANA', 30, 15, {
        width: pageWidth - 60,
        align: 'center'
      });

    doc.fontSize(10)
      .text('RESULTADOS PRELIMINARES DE LA EVALUACIÓN CURRICULAR - PROCESO DE CONTRATACIÓN CAS', 30, 35, {
        width: pageWidth - 60,
        align: 'center'
      });

    doc.moveDown(2);

    // Información de la convocatoria
    const yInfo = 70;
    doc.fontSize(9)
      .fillColor('#000')
      .text('PROCESO DE CONTRATACIÓN CAS (NECESIDAD TRANSITORIA) N° ', 30, yInfo)
      .text(convocatoriaInfo?.numero_cas || 'N/A', 300, yInfo);

    doc.text('TÉCNICO EN PATRIMONIO', 30, yInfo + 12);
    doc.text(`FECHA: ${new Date().toLocaleDateString('es-PE')}`, 30, yInfo + 24);

    doc.fontSize(8)
      .text('INDICACIONES A TENER EN CUENTA:', 30, yInfo + 40);
    doc.fontSize(7)
      .text('Los/as postulantes que obtienen la condición de "APTO" deberán verificar la publicación del Rol de Entrevista y las consideraciones para su ejecución en la fecha establecida según el cronograma', 30, yInfo + 52, {
        width: pageWidth - 60
      });

    doc.moveDown(1);

    // Separar APTOS y NO APTOS
    const aptos = evaluaciones.filter(e => e.apto === true || e.estado_evaluacion === 'approved');
    const noAptos = evaluaciones.filter(e => e.apto === false || e.estado_evaluacion === 'rejected');

    // TABLA DE APTOS
    let tableTop = doc.y + 10;

    // Encabezado de tabla con bordes
    const colWidths = {
      n: 25,
      apellidos: 140,
      dni: 70,
      expediente: 70,
      fechaExp: 70,
      formacion: 50,
      expGeneral: 50,
      expEspecifica: 50,
      puntaje: 50,
      condicion: 60,
      observacion: 120
    };

    let xPos = 30;

    // Dibujar encabezados con bordes
    doc.fontSize(7)
      .fillColor('#000');

    // Fila de encabezados
    doc.rect(xPos, tableTop, colWidths.n, 30).stroke();
    doc.text('N°', xPos + 5, tableTop + 10);
    xPos += colWidths.n;

    doc.rect(xPos, tableTop, colWidths.apellidos, 30).stroke();
    doc.text('APELLIDOS Y NOMBRES(*)', xPos + 5, tableTop + 10);
    xPos += colWidths.apellidos;

    doc.rect(xPos, tableTop, colWidths.dni, 30).stroke();
    doc.text('DNI', xPos + 15, tableTop + 10);
    xPos += colWidths.dni;

    doc.rect(xPos, tableTop, colWidths.expediente, 30).stroke();
    doc.text('N° EXPEDIENTE', xPos + 5, tableTop + 10);
    xPos += colWidths.expediente;

    doc.rect(xPos, tableTop, colWidths.fechaExp, 30).stroke();
    doc.text('FECHA DE EXP.', xPos + 5, tableTop + 10);
    xPos += colWidths.fechaExp;

    doc.rect(xPos, tableTop, colWidths.formacion, 30).stroke();
    doc.text('FORMACIÓN ACADÉMICA', xPos + 2, tableTop + 5, { width: colWidths.formacion - 4, align: 'center' });
    xPos += colWidths.formacion;

    doc.rect(xPos, tableTop, colWidths.expGeneral, 30).stroke();
    doc.text('EXPERIENCIA GENERAL', xPos + 2, tableTop + 5, { width: colWidths.expGeneral - 4, align: 'center' });
    xPos += colWidths.expGeneral;

    doc.rect(xPos, tableTop, colWidths.expEspecifica, 30).stroke();
    doc.text('EXPERIENCIA ESPECÍFICA', xPos + 2, tableTop + 5, { width: colWidths.expEspecifica - 4, align: 'center' });
    xPos += colWidths.expEspecifica;

    doc.rect(xPos, tableTop, colWidths.puntaje, 30).stroke();
    doc.text('PUNTAJE', xPos + 5, tableTop + 10);
    xPos += colWidths.puntaje;

    doc.rect(xPos, tableTop, colWidths.condicion, 30).stroke();
    doc.text('CONDICIÓN FINAL DE LA EVALUACIÓN', xPos + 2, tableTop + 5, { width: colWidths.condicion - 4, align: 'center' });
    xPos += colWidths.condicion;

    doc.rect(xPos, tableTop, colWidths.observacion, 30).stroke();
    doc.text('OBSERVACIÓN', xPos + 5, tableTop + 10);

    let currentY = tableTop + 30;
    const rowHeight = 25;

    // Renderizar APTOS
    aptos.forEach((evaluacion, index) => {
      xPos = 30;

      // Dibujar celdas con bordes
      doc.fontSize(7).fillColor('#000');

      // N°
      doc.rect(xPos, currentY, colWidths.n, rowHeight).stroke();
      doc.text((index + 1).toString(), xPos + 8, currentY + 8);
      xPos += colWidths.n;

      // Apellidos y nombres
      doc.rect(xPos, currentY, colWidths.apellidos, rowHeight).stroke();
      const nombre = limpiarTexto(evaluacion.nombre_completo || evaluacion.postulante_nombre || 'N/A');
      doc.text(nombre.substring(0, 30), xPos + 3, currentY + 8, { width: colWidths.apellidos - 6 });
      xPos += colWidths.apellidos;

      // DNI
      doc.rect(xPos, currentY, colWidths.dni, rowHeight).stroke();
      doc.text(evaluacion.documento || evaluacion.postulante_dni || 'N/A', xPos + 10, currentY + 8);
      xPos += colWidths.dni;

      // N° Expediente
      doc.rect(xPos, currentY, colWidths.expediente, rowHeight).stroke();
      doc.text(evaluacion.expediente || '10778-2025', xPos + 5, currentY + 8);
      xPos += colWidths.expediente;

      // Fecha Exp
      doc.rect(xPos, currentY, colWidths.fechaExp, rowHeight).stroke();
      doc.text(evaluacion.fecha_expediente || '27/08/2025', xPos + 5, currentY + 8);
      xPos += colWidths.fechaExp;

      // Formación
      doc.rect(xPos, currentY, colWidths.formacion, rowHeight).stroke();
      doc.text(evaluacion.formacion_puntaje || '??', xPos + 15, currentY + 8);
      xPos += colWidths.formacion;

      // Exp General
      doc.rect(xPos, currentY, colWidths.expGeneral, rowHeight).stroke();
      doc.text(evaluacion.exp_general_puntaje || '??', xPos + 15, currentY + 8);
      xPos += colWidths.expGeneral;

      // Exp Específica
      doc.rect(xPos, currentY, colWidths.expEspecifica, rowHeight).stroke();
      doc.text(evaluacion.exp_especifica_puntaje || '30', xPos + 15, currentY + 8);
      xPos += colWidths.expEspecifica;

      // Puntaje
      doc.rect(xPos, currentY, colWidths.puntaje, rowHeight).stroke();
      doc.text((evaluacion.score || evaluacion.puntuacion_total || '75').toString(), xPos + 15, currentY + 8);
      xPos += colWidths.puntaje;

      // Condición
      doc.rect(xPos, currentY, colWidths.condicion, rowHeight).stroke();
      doc.fillColor('#10b981').text('APTO', xPos + 15, currentY + 8);
      doc.fillColor('#000');
      xPos += colWidths.condicion;

      // Observación
      doc.rect(xPos, currentY, colWidths.observacion, rowHeight).stroke();
      doc.text('', xPos + 5, currentY + 8);

      currentY += rowHeight;
    });

    // Espacio entre secciones
    currentY += 20;

    // Título NO APTOS
    doc.fontSize(10)
      .fillColor('#ef4444')
      .text('POSTULANTES NO APTOS', 30, currentY);

    currentY += 20;

    // Renderizar NO APTOS
    noAptos.forEach((evaluacion, index) => {
      xPos = 30;

      doc.fontSize(7).fillColor('#000');

      // N°
      doc.rect(xPos, currentY, colWidths.n, rowHeight).stroke();
      doc.text((index + 1).toString(), xPos + 8, currentY + 8);
      xPos += colWidths.n;

      // Apellidos y nombres
      doc.rect(xPos, currentY, colWidths.apellidos, rowHeight).stroke();
      const nombre = limpiarTexto(evaluacion.nombre_completo || evaluacion.postulante_nombre || 'N/A');
      doc.text(nombre.substring(0, 30), xPos + 3, currentY + 8, { width: colWidths.apellidos - 6 });
      xPos += colWidths.apellidos;

      // DNI
      doc.rect(xPos, currentY, colWidths.dni, rowHeight).stroke();
      doc.text(evaluacion.documento || evaluacion.postulante_dni || 'N/A', xPos + 10, currentY + 8);
      xPos += colWidths.dni;

      // N° Expediente
      doc.rect(xPos, currentY, colWidths.expediente, rowHeight).stroke();
      doc.text('-', xPos + 25, currentY + 8);
      xPos += colWidths.expediente;

      // Fecha Exp
      doc.rect(xPos, currentY, colWidths.fechaExp, rowHeight).stroke();
      doc.text('-', xPos + 25, currentY + 8);
      xPos += colWidths.fechaExp;

      // Formación
      doc.rect(xPos, currentY, colWidths.formacion, rowHeight).stroke();
      doc.text('-', xPos + 20, currentY + 8);
      xPos += colWidths.formacion;

      // Exp General
      doc.rect(xPos, currentY, colWidths.expGeneral, rowHeight).stroke();
      doc.text('-', xPos + 20, currentY + 8);
      xPos += colWidths.expGeneral;

      // Exp Específica
      doc.rect(xPos, currentY, colWidths.expEspecifica, rowHeight).stroke();
      doc.text('-', xPos + 20, currentY + 8);
      xPos += colWidths.expEspecifica;

      // Puntaje
      doc.rect(xPos, currentY, colWidths.puntaje, rowHeight).stroke();
      doc.text('-', xPos + 20, currentY + 8);
      xPos += colWidths.puntaje;

      // Condición
      doc.rect(xPos, currentY, colWidths.condicion, rowHeight).stroke();
      doc.fillColor('#ef4444').text('NO APTO', xPos + 10, currentY + 8);
      doc.fillColor('#000');
      xPos += colWidths.condicion;

      // Observación
      doc.rect(xPos, currentY, colWidths.observacion, rowHeight).stroke();
      const observacion = limpiarTexto(evaluacion.razones || 'No cumple requisitos mínimos');
      doc.text(observacion.substring(0, 40), xPos + 3, currentY + 5, { width: colWidths.observacion - 6, lineGap: 1 });

      currentY += rowHeight;
    });

    // Nota al final
    currentY += 20;

    doc.fontSize(8)
      .fillColor('#000')
      .text('NOTA:', 30, currentY, { continued: true })
      .text(' NO APTO/A: al luego de la verificación de la documentación sustentatoria remitida, la/el postulante no acredita de manera fehaciente el cumplimiento de uno (01) o más de los requisitos mínimos exigidos en el perfil del puesto al cual postula, mismo que se declara NO APTO.', { width: pageWidth - 60 });

    doc.end();
  });
}

/**
 * Generar reporte detallado de un postulante específico
 */
export async function generarReporteDetalladoPostulante(evaluacionCompleta) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Encabezado
    doc.fontSize(20)
      .fillColor('#1a365d')
      .text('REPORTE DETALLADO DE EVALUACIÓN CAS', { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(10)
      .fillColor('#666')
      .text(`Generado el: ${new Date().toLocaleDateString('es-PE')}`, { align: 'center' });

    doc.moveDown(1);

    // Información del postulante
    doc.fontSize(14)
      .fillColor('#2d3748')
      .text('INFORMACIÓN DEL POSTULANTE', { underline: true });

    doc.moveDown(0.3);
    doc.fontSize(10)
      .fillColor('#000')
      .text(`Nombre: ${evaluacionCompleta.postulante_nombre || 'N/A'}`)
      .text(`DNI: ${evaluacionCompleta.postulante_dni || 'N/A'}`)
      .text(`Convocatoria: ${evaluacionCompleta.convocatoria_area} - ${evaluacionCompleta.convocatoria_puesto}`)
      .text(`Fecha de evaluación: ${new Date(evaluacionCompleta.fecha_evaluacion).toLocaleDateString('es-PE')}`);

    doc.moveDown(1);

    // Resultados por fase
    doc.fontSize(14)
      .fillColor('#2d3748')
      .text('EVALUACIÓN POR FASES', { underline: true });

    doc.moveDown(0.5);

    // Fase 1
    doc.fontSize(12)
      .fillColor('#000')
      .text('FASE 1 - REQUISITOS ACADÉMICOS', { underline: true });

    doc.fontSize(10)
      .text(`Cumple perfil mínimo: ${evaluacionCompleta.fase1_cumple ? 'SÍ' : 'NO'}`)
      .text(`Puntuación: ${evaluacionCompleta.fase1_puntuacion}/20`);

    doc.moveDown(0.5);

    // Fase 2
    doc.fontSize(12)
      .text('FASE 2 - EXPERIENCIA GENERAL', { underline: true });

    doc.fontSize(10)
      .text(`Cumple experiencia mínima: ${evaluacionCompleta.fase2_cumple ? 'SÍ' : 'NO'}`)
      .text(`Puntuación: ${evaluacionCompleta.fase2_puntuacion}/20`);

    doc.moveDown(0.5);

    // Fase 3
    doc.fontSize(12)
      .text('FASE 3 - EXPERIENCIA ESPECÍFICA', { underline: true });

    doc.fontSize(10)
      .text(`Cumple experiencia específica: ${evaluacionCompleta.fase3_cumple ? 'SÍ' : 'NO'}`)
      .text(`Puntuación: ${evaluacionCompleta.fase3_puntuacion}/30`);

    doc.moveDown(1);

    // Resumen final
    doc.fontSize(14)
      .fillColor('#2d3748')
      .text('RESUMEN FINAL', { underline: true });

    doc.moveDown(0.3);
    doc.fontSize(12)
      .fillColor('#000')
      .text(`Puntuación total: ${evaluacionCompleta.puntuacion_total} puntos`)
      .text(`Estado: ${evaluacionCompleta.estado_final}`);

    // Reporte detallado de IA
    if (evaluacionCompleta.reporte_detallado) {
      doc.addPage();
      doc.fontSize(14)
        .fillColor('#2d3748')
        .text('REPORTE DETALLADO DE IA', { underline: true });

      doc.moveDown(0.5);
      doc.fontSize(10)
        .fillColor('#000')
        .text(evaluacionCompleta.reporte_detallado, {
          align: 'left',
          width: 500
        });
    }

    doc.end();
  });
}

/**
 * Función ULTRA MEJORADA para limpiar texto de caracteres especiales
 */
function limpiarTexto(texto) {
  if (!texto) return '';

  let textoLimpio = String(texto);

  // PASO 1: Eliminar TODOS los caracteres problemáticos conocidos
  textoLimpio = textoLimpio
    // Eliminar %P%, %%%,  y todas las variaciones de %
    .replace(/%P%/g, '')
    .replace(/%%%+/g, '')
    .replace(/% % %/g, ' ')
    .replace(/%[A-Za-z0-9]/g, '')
    .replace(/%/g, '')

    // Eliminar Ø=Ü y todas sus variaciones
    .replace(/Ø=Ü[a-zA-Z0-9¡¼½Ì]*/g, '')
    .replace(/Ø=Ü/g, '')
    .replace(/Ø/g, '')

    // Eliminar símbolos extraños
    .replace(/[þãÜ¡¼½Ì]/g, '')
    .replace(/& þ/g, '')
    .replace(/& b/g, '')
    .replace(/\+P/g, '•')
    .replace(/!9þ/g, '')

    // Eliminar símbolos de cruz y otros
    .replace(/'L/g, '')
    .replace(/ L /g, ' ')
    .replace(/I'/g, '')
    .replace(/I /g, ' ')

    // Eliminar emojis y símbolos especiales que causan problemas
    .replace(/[️⃣]/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Símbolos varios
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats

    // Eliminar caracteres de control y no imprimibles
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .replace(/[\u0000-\u001F]/g, '')
    .replace(/[\u007F-\u009F]/g, '')

    // Limpiar líneas de separación
    .replace(/═+/g, '\n' + '-'.repeat(60) + '\n')
    .replace(/─+/g, '\n' + '-'.repeat(60) + '\n')
    .replace(/\*\*+/g, '')
    .replace(/\*\*/g, '')

    // Limpiar espacios múltiples
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{3,}/g, '  ')
    .replace(/\t/g, '  ')

    // Normalizar caracteres especiales del español
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã"/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã'/g, 'Ñ')

    .trim();

  return textoLimpio;
}

/**
 * Generar PDF de reporte de IA
 */
export async function generarPDFReporteIA(reporteData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Encabezado con diseño mejorado
    // Rectángulo de fondo para el título
    doc.rect(0, 0, doc.page.width, 120)
      .fill('#1e40af');

    doc.fontSize(24)
      .fillColor('#ffffff')
      .text('REPORTE DE EVALUACIÓN', 50, 30, { align: 'center' });

    doc.fontSize(20)
      .fillColor('#93c5fd')
      .text('Análisis con Inteligencia Artificial', 50, 60, { align: 'center' });

    doc.fontSize(10)
      .fillColor('#e0e7ff')
      .text(`Generado: ${new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })} - ${new Date().toLocaleTimeString('es-PE')}`, 50, 95, { align: 'center' });

    doc.moveDown(3);

    // Información del candidato con diseño mejorado
    const yInicio = 140;

    // Caja de información del candidato
    doc.rect(40, yInicio, doc.page.width - 80, 180)
      .fillAndStroke('#f8fafc', '#cbd5e1');

    doc.fontSize(14)
      .fillColor('#1e40af')
      .text('DATOS DEL CANDIDATO', 60, yInicio + 15, { underline: true });

    doc.moveDown(0.5);

    // Función auxiliar para limpiar y convertir datos (incluyendo Buffers)
    const limpiarDato = (value) => {
      if (!value) return 'No especificado';
      
      // Si es un objeto con type: 'Buffer', convertir
      if (typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
        const texto = Buffer.from(value.data).toString('utf8');
        return limpiarTexto(texto);
      }
      
      // Si es un string, limpiar
      if (typeof value === 'string') {
        return limpiarTexto(value);
      }
      
      return limpiarTexto(String(value));
    };

    // Datos personales en dos columnas
    const yDatos = yInicio + 45;
    const colIzq = 60;
    const colDer = 320;

    doc.fontSize(10)
      .fillColor('#374151');

    // Columna izquierda
    doc.text('Nombre Completo:', colIzq, yDatos, { continued: false });
    doc.fillColor('#000').text(limpiarDato(reporteData.nombre_completo), colIzq, yDatos + 15, { width: 240 });

    doc.fillColor('#374151').text('DNI:', colIzq, yDatos + 35, { continued: false });
    doc.fillColor('#000').text(limpiarDato(reporteData.documento), colIzq, yDatos + 50);

    doc.fillColor('#374151').text('Lugar de Nacimiento:', colIzq, yDatos + 70, { continued: false });
    doc.fillColor('#000').text(limpiarDato(reporteData.lugarNacimiento), colIzq, yDatos + 85, { width: 240 });

    // Columna derecha
    doc.fillColor('#374151').text('Email:', colDer, yDatos, { continued: false });
    doc.fillColor('#000').text(limpiarDato(reporteData.email), colDer, yDatos + 15, { width: 240 });

    doc.fillColor('#374151').text('Teléfono:', colDer, yDatos + 35, { continued: false });
    doc.fillColor('#000').text(limpiarDato(reporteData.telefono), colDer, yDatos + 50);

    doc.fillColor('#374151').text('Dirección:', colDer, yDatos + 70, { continued: false });
    doc.fillColor('#000').text(limpiarDato(reporteData.direccion), colDer, yDatos + 85, { width: 240 });

    doc.moveDown(3);

    // Información sobre declaraciones juradas
    doc.fontSize(10)
      .fillColor('#374151')
      .text('Las declaraciones juradas son documentos de carácter legal mediante los cuales el postulante manifiesta bajo juramento la veracidad de la información proporcionada. Estas declaraciones son fundamentales para el proceso de selección.', 70, doc.y, {
        width: 470,
        lineGap: 3,
        align: 'justify'
      });

    doc.text('El postulante declara: (1) que la información proporcionada es verdadera y verificable, (2) que autoriza el tratamiento de sus datos personales conforme a la Ley de Protección de Datos Personales, (3) que cumple con todos los requisitos mínimos establecidos, (4) que goza de plenos derechos civiles, (5) que no tiene condena por delito doloso, y (6) que no está inhabilitado para el ejercicio de la función pública.', 70, doc.y, {
      width: 470,
      lineGap: 3,
      align: 'justify'
    });

    doc.text('Cualquier falsedad en las declaraciones juradas constituye causal de descalificación automática y puede dar lugar a acciones legales correspondientes.', 70, doc.y, {
      width: 470,
      lineGap: 3,
      align: 'justify'
    });

    // NOTA: Se omite el análisis corto de IA para mostrar solo el análisis extenso
    // El análisis detallado ya se mostró en las secciones anteriores

    // SECCIÓN ADICIONAL: Análisis Detallado de Requisitos
    doc.addPage();
    doc.rect(40, 40, doc.page.width - 80, 40)
      .fillAndStroke('#dbeafe', '#3b82f6');
    doc.fontSize(18)
      .fillColor('#1e40af')
      .text('ANALISIS DETALLADO DE REQUISITOS', 50, 52, { align: 'center' });

    doc.moveDown(2);

    // Análisis de Formación Académica
    doc.fontSize(14)
      .fillColor('#2563eb')
      .text('1. FORMACION ACADEMICA', 60, doc.y);
    doc.moveDown(0.5);
    doc.fontSize(10)
      .fillColor('#374151')
      .text('Requisito: Según convocatoria', 70, doc.y, { width: 470 });
    doc.text('Presentado: Verificar documentación adjunta', 70, doc.y, { width: 470 });
    doc.text('Evaluación: Revisar títulos y certificados', 70, doc.y, { width: 470 });
    doc.moveDown(1);

    // Análisis de Experiencia
    doc.fontSize(14)
      .fillColor('#2563eb')
      .text('2. EXPERIENCIA LABORAL', 60, doc.y);
    doc.moveDown(0.5);
    doc.fontSize(10)
      .fillColor('#374151')
      .text('Experiencia General: Según CV adjunto', 70, doc.y, { width: 470 });
    doc.text('Experiencia Específica: Verificar certificados', 70, doc.y, { width: 470 });
    doc.text('Experiencia en Sector Público: Revisar constancias', 70, doc.y, { width: 470 });
    doc.moveDown(1);

    // Análisis de Competencias
    doc.fontSize(14)
      .fillColor('#2563eb')
      .text('3. COMPETENCIAS Y HABILIDADES', 60, doc.y);
    doc.moveDown(0.5);
    doc.fontSize(10)
      .fillColor('#374151')
      .text('Competencias Técnicas: Según perfil del puesto', 70, doc.y, { width: 470 });
    doc.text('Competencias Blandas: Evaluar en entrevista', 70, doc.y, { width: 470 });
    doc.text('Conocimientos Específicos: Verificar certificaciones', 70, doc.y, { width: 470 });
    doc.moveDown(1);

    // Análisis de Documentación
    doc.fontSize(14)
      .fillColor('#2563eb')
      .text('4. DOCUMENTACION PRESENTADA', 60, doc.y);
    doc.moveDown(0.5);
    doc.fontSize(10)
      .fillColor('#374151')
      .text('CV Actualizado: ' + (reporteData.cv_url ? 'Sí' : 'No'), 70, doc.y, { width: 470 });
    doc.text('Anexos Completos: ' + (reporteData.totalAnexos ? `${reporteData.totalAnexos} documentos` : 'No especificado'), 70, doc.y, { width: 470 });
    doc.text('Declaraciones Juradas: ' + (reporteData.declaraciones ? 'Completas' : 'Pendiente'), 70, doc.y, { width: 470 });

    // Habilidades clave con diseño mejorado
    if (reporteData.habilidades_clave && Array.isArray(reporteData.habilidades_clave) && reporteData.habilidades_clave.length > 0) {
      doc.addPage();

      doc.fontSize(16)
        .fillColor('#1e40af')
        .text('HABILIDADES CLAVE IDENTIFICADAS', 50, 50);

      doc.moveDown(0.5);

      // Mostrar habilidades como badges
      let xPos = 60;
      let yPos = 90;

      reporteData.habilidades_clave.forEach((habilidad, index) => {
        const habilidadLimpia = limpiarTexto(habilidad);
        const anchoTexto = doc.widthOfString(habilidadLimpia) + 20;

        // Si no cabe en la línea, pasar a la siguiente
        if (xPos + anchoTexto > doc.page.width - 60) {
          xPos = 60;
          yPos += 35;
        }

        // Dibujar badge
        doc.roundedRect(xPos, yPos, anchoTexto, 25, 5)
          .fillAndStroke('#dbeafe', '#3b82f6');

        doc.fontSize(10)
          .fillColor('#1e40af')
          .text(habilidadLimpia, xPos + 10, yPos + 7);

        xPos += anchoTexto + 10;
      });
    }

    // Experiencia relevante con diseño mejorado
    if (reporteData.experiencia_relevante) {
      if (!reporteData.habilidades_clave || reporteData.habilidades_clave.length === 0) {
        doc.addPage();
      }

      const yExp = reporteData.habilidades_clave && reporteData.habilidades_clave.length > 0 ? 200 : 50;

      doc.fontSize(16)
        .fillColor('#1e40af')
        .text('EXPERIENCIA RELEVANTE', 50, yExp);

      doc.moveDown(0.5);

      // Limpiar texto de experiencia
      const expTexto = limpiarTexto(reporteData.experiencia_relevante);

      doc.fontSize(10)
        .fillColor('#374151')
        .text(expTexto, 60, yExp + 30, {
          align: 'left',
          width: 480,
          lineGap: 3
        });
    }

    // Declaraciones juradas con diseño mejorado
    if (reporteData.declaraciones) {
      doc.addPage();

      doc.fontSize(16)
        .fillColor('#1e40af')
        .text('DECLARACIONES JURADAS', 50, 50);

      doc.moveDown(0.5);

      const decl = reporteData.declaraciones;
      const declaraciones = [
        { key: 'infoVerdadera', label: 'Información Verdadera' },
        { key: 'leyProteccionDatos', label: 'Ley de Protección de Datos' },
        { key: 'cumploRequisitosMinimos', label: 'Cumple Requisitos Mínimos' },
        { key: 'plenosDerechosCiviles', label: 'Plenos Derechos Civiles' },
        { key: 'noCondenaDolosa', label: 'No Condena Dolosa' },
        { key: 'noInhabilitacion', label: 'No Inhabilitación' }
      ];

      let yDecl = 90;

      declaraciones.forEach((declaracion) => {
        const cumple = decl[declaracion.key];

        // Dibujar checkbox
        doc.rect(60, yDecl, 15, 15)
          .fillAndStroke(cumple ? '#10b981' : '#ef4444', '#374151');

        if (cumple) {
          doc.fontSize(12)
            .fillColor('#ffffff')
            .text('✓', 63, yDecl + 1);
        }

        doc.fontSize(10)
          .fillColor(cumple ? '#065f46' : '#991b1b')
          .text(declaracion.label, 85, yDecl + 2);

        yDecl += 30;
      });
    }

    // Reglas aplicadas
    if (reporteData.reglasAplicadas) {
      doc.moveDown(0.5);
      doc.fontSize(12)
        .fillColor('#2d3748')
        .text('REGLAS APLICADAS', { underline: true });

      doc.moveDown(0.3);
      doc.fontSize(10)
        .fillColor('#000');

      const reglas = reporteData.reglasAplicadas;
      if (reglas.requisitosMinimos) doc.text(`Requisitos Mínimos: ${reglas.requisitosMinimos}`);
      if (reglas.experienciaRequerida) doc.text(`Experiencia Requerida: ${reglas.experienciaRequerida}`);
      if (reglas.tituloRequerido) doc.text(`Título Requerido: ${reglas.tituloRequerido}`);
    }

    // Bonos aplicados
    if (reporteData.bonosAplicados && Array.isArray(reporteData.bonosAplicados) && reporteData.bonosAplicados.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(12)
        .fillColor('#2d3748')
        .text('BONOS APLICADOS', { underline: true });

      doc.moveDown(0.3);
      doc.fontSize(10)
        .fillColor('#000');

      reporteData.bonosAplicados.forEach((bono, idx) => {
        doc.text(`${idx + 1}. ${bono.tipo || 'Bono'}: ${bono.descripcion || 'N/A'} - Puntos: ${bono.puntos || 0}`);
      });
    }

    // Razones con diseño mejorado
    if (reporteData.razones && Array.isArray(reporteData.razones) && reporteData.razones.length > 0) {
      doc.addPage();

      doc.fontSize(16)
        .fillColor('#1e40af')
        .text('RAZONES Y OBSERVACIONES', 50, 50);

      doc.moveDown(0.5);

      reporteData.razones.forEach((razon, idx) => {
        const razonLimpia = limpiarTexto(razon);
        // Caja para cada razón
        const yRazon = doc.y;
        doc.rect(50, yRazon, doc.page.width - 100, 40)
          .fillAndStroke('#fef2f2', '#fca5a5');

        doc.fontSize(10)
          .fillColor('#991b1b')
          .text(`${idx + 1}. ${razonLimpia}`, 60, yRazon + 12, { width: doc.page.width - 120 });

        doc.moveDown(1.5);
      });
    }

    // SECCIÓN ADICIONAL: Evaluación de Cumplimiento
    doc.addPage();
    doc.rect(40, 40, doc.page.width - 80, 40)
      .fillAndStroke('#fef3c7', '#fbbf24');
    doc.fontSize(18)
      .fillColor('#92400e')
      .text('EVALUACION DE CUMPLIMIENTO', 50, 52, { align: 'center' });

    doc.moveDown(2);

    // Tabla de cumplimiento
    const criterios = [
      { nombre: 'Formación Académica', cumple: reporteData.score >= 60 },
      { nombre: 'Experiencia Laboral', cumple: reporteData.score >= 60 },
      { nombre: 'Documentación Completa', cumple: reporteData.declaraciones ? true : false },
      { nombre: 'Requisitos Mínimos', cumple: reporteData.score >= 60 },
      { nombre: 'Declaraciones Juradas', cumple: reporteData.declaraciones ? true : false }
    ];

    criterios.forEach((criterio, idx) => {
      const yPos = doc.y;
      const color = criterio.cumple ? '#10b981' : '#ef4444';
      const simbolo = criterio.cumple ? 'SI' : 'NO';

      doc.rect(60, yPos, doc.page.width - 120, 30)
        .fillAndStroke(criterio.cumple ? '#d1fae5' : '#fee2e2', color);

      doc.fontSize(11)
        .fillColor('#374151')
        .text(criterio.nombre, 70, yPos + 8, { width: 300 });

      doc.fontSize(11)
        .fillColor(color)
        .text(simbolo, doc.page.width - 120, yPos + 8, { width: 50, align: 'center' });

      doc.moveDown(1);
    });

    // SECCIÓN ADICIONAL: Observaciones del Sistema
    doc.moveDown(2);
    doc.fontSize(14)
      .fillColor('#2563eb')
      .text('OBSERVACIONES DEL SISTEMA', 60, doc.y);
    doc.moveDown(0.5);

    doc.fontSize(10)
      .fillColor('#374151')
      .text('- Este análisis ha sido generado automáticamente mediante Inteligencia Artificial.', 70, doc.y, { width: 470 });
    doc.text('- Se recomienda realizar una revisión manual de toda la documentación.', 70, doc.y, { width: 470 });
    doc.text('- Los puntajes son referenciales y deben ser validados por el comité.', 70, doc.y, { width: 470 });
    doc.text('- Cualquier discrepancia debe ser reportada al área de Recursos Humanos.', 70, doc.y, { width: 470 });
    doc.text('- La decisión final corresponde al comité de evaluación.', 70, doc.y, { width: 470 });

    // Página final: Resumen y Recomendaciones
    doc.addPage();

    // Título de resumen
    doc.rect(0, 0, doc.page.width, 80)
      .fill('#1e40af');

    doc.fontSize(22)
      .fillColor('#ffffff')
      .text('RESUMEN EJECUTIVO', 50, 25, { align: 'center' });

    doc.moveDown(3);

    // Cuadro de veredicto final
    const yVeredicto = 120;
    const colorVeredicto = reporteData.apto ? '#10b981' : '#ef4444';
    const textoVeredicto = reporteData.apto ? 'CANDIDATO APTO' : 'CANDIDATO NO APTO';

    doc.rect(100, yVeredicto, doc.page.width - 200, 80)
      .fillAndStroke(reporteData.apto ? '#d1fae5' : '#fee2e2', colorVeredicto);

    doc.fontSize(20)
      .fillColor(colorVeredicto)
      .text(textoVeredicto, 100, yVeredicto + 15, {
        width: doc.page.width - 200,
        align: 'center'
      });

    doc.fontSize(14)
      .fillColor('#374151')
      .text(`Score Final: ${reporteData.score || 0}/100`, 100, yVeredicto + 50, {
        width: doc.page.width - 200,
        align: 'center'
      });

    // Recomendaciones para el comité
    doc.moveDown(3);
    doc.fontSize(16)
      .fillColor('#1e40af')
      .text('RECOMENDACIONES PARA EL COMITE', 50, doc.y);

    doc.moveDown(0.5);

    const recomendaciones = [];

    if (reporteData.apto) {
      recomendaciones.push('- Se recomienda APROBAR al candidato para la siguiente etapa del proceso.');
      recomendaciones.push('- Verificar documentación original en entrevista personal.');
      recomendaciones.push('- Confirmar referencias laborales antes de la contratación.');
    } else {
      recomendaciones.push('- Se recomienda RECHAZAR la postulación del candidato.');
      recomendaciones.push('- El candidato no cumple con los requisitos mínimos establecidos.');
      recomendaciones.push('- Revisar manualmente si existen circunstancias especiales.');
    }

    recomendaciones.forEach((rec, idx) => {
      doc.fontSize(11)
        .fillColor('#374151')
        .text(`${idx + 1}. ${rec}`, 60, doc.y, {
          width: 480,
          lineGap: 5
        });
      doc.moveDown(0.3);
    });

    // Información adicional
    doc.moveDown(1);
    doc.fontSize(16)
      .fillColor('#1e40af')
      .text('ℹ️ INFORMACIÓN ADICIONAL', 50, doc.y);

    doc.moveDown(0.5);

    doc.fontSize(10)
      .fillColor('#64748b')
      .text('Este reporte ha sido generado automáticamente mediante Inteligencia Artificial.', 60, doc.y, {
        width: 480,
        lineGap: 3
      });

    doc.text('Se recomienda realizar una revisión manual de la documentación antes de tomar decisiones finales.', 60, doc.y, {
      width: 480,
      lineGap: 3
    });

    doc.text('Para consultas o aclaraciones, contactar al área de Recursos Humanos.', 60, doc.y, {
      width: 480,
      lineGap: 3
    });

    // NUEVA SECCIÓN: ANÁLISIS COMPLETO DE INTELIGENCIA ARTIFICIAL
    if (reporteData.evaluacionRequisitos || reporteData.contenido) {
      doc.addPage();

      // Título principal con diseño destacado
      doc.rect(0, 0, doc.page.width, 100)
        .fill('#1e40af');

      doc.fontSize(24)
        .fillColor('#ffffff')
        .text('ANALISIS COMPLETO', 50, 25, { align: 'center' });

      doc.fontSize(18)
        .fillColor('#93c5fd')
        .text('Evaluacion Detallada por Inteligencia Artificial', 50, 55, { align: 'center' });

      doc.moveDown(3);

      // Contenedor del análisis
      let analisisTexto = limpiarTexto(reporteData.evaluacionRequisitos || reporteData.contenido);

      // Eliminar emojis y caracteres especiales que causan problemas en el PDF
      analisisTexto = analisisTexto
        .replace(/[📋🎁📄⚖️💼✓✅❌⚠️→]/g, '') // Eliminar emojis
        .replace(/═+/g, '---') // Reemplazar separadores
        .replace(/[^\x00-\x7F]/g, ''); // Eliminar caracteres no ASCII

      // Dividir el análisis en líneas y procesarlas
      const lineas = analisisTexto.split('\n');
      let yPos = 120;

      lineas.forEach((linea, index) => {
        // Verificar si necesitamos una nueva página
        if (yPos > doc.page.height - 100) {
          doc.addPage();
          yPos = 50;
        }

        const lineaLimpia = linea.trim();

        // Detectar títulos con separadores
        if (lineaLimpia.startsWith('---') || lineaLimpia.startsWith('===')) {
          // Línea separadora - dibujar línea decorativa
          doc.moveTo(50, yPos + 5)
            .lineTo(doc.page.width - 50, yPos + 5)
            .stroke('#cbd5e1');
          yPos += 15;
        }
        // Detectar títulos principales (EVALUACION, BONIFICACIONES, etc.)
        else if (lineaLimpia.match(/^(EVALUACION|BONIFICACIONES|DOCUMENTACION|VEREDICTO|HABILIDADES)/i)) {
          doc.fontSize(14)
            .fillColor('#1e40af')
            .text(lineaLimpia, 50, yPos, { width: doc.page.width - 100 });
          yPos += 25;
        }
        // Detectar subtítulos (líneas que empiezan con espacios o guiones)
        else if (lineaLimpia.match(/^[\s-]+(Experiencia|Titulo|Habilidades|CONADIS|Licenciado|Declaraciones|Nepotismo|Estado|Puntaje|Razon|Recomendacion)/i)) {
          doc.fontSize(10)
            .fillColor('#374151')
            .text(lineaLimpia, 70, yPos, { width: doc.page.width - 120 });
          yPos += 18;
        }
        // Detectar líneas de cumplimiento o totales
        else if (lineaLimpia.match(/CUMPLIMIENTO:|TOTAL|Puntaje|Score|Estado:/i)) {
          doc.fontSize(11)
            .fillColor('#2563eb')
            .text(lineaLimpia, 60, yPos, { width: doc.page.width - 110 });
          yPos += 22;
        }
        // Detectar recomendaciones
        else if (lineaLimpia.match(/Recomendación:|Razón:|Acción:/i)) {
          doc.fontSize(11)
            .fillColor('#7c3aed')
            .text(lineaLimpia, 60, yPos, { width: doc.page.width - 110 });
          yPos += 22;
        }
        // Texto normal
        else if (lineaLimpia.length > 0) {
          doc.fontSize(10)
            .fillColor('#374151')
            .text(lineaLimpia, 60, yPos, { width: doc.page.width - 110, lineGap: 2, align: 'justify' });
          yPos += 18;
        }
        // Línea vacía
        else {
          yPos += 10;
        }
      });
    }

    // Pie de página
    doc.addPage();
    doc.moveDown(2);
    doc.fontSize(8)
      .fillColor('#94a3b8')
      .text('─'.repeat(80), 50, doc.y, { align: 'center' });

    // Pie de página simple
    doc.moveDown(2);
    doc.fontSize(9)
      .fillColor('#64748b')
      .text(`Documento generado el ${new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 50, doc.y, { align: 'center' });

    doc.fontSize(8)
      .fillColor('#94a3b8')
      .text('UGEL Talara - Sistema de Evaluacion de Personal', 50, doc.y, { align: 'center' });

    doc.end();
  });
}

/**
 * Generar Excel de evaluaciones CAS con formato oficial
 */
export async function generarExcelEvaluacionesCAS(evaluaciones, convocatoriaInfo) {
  const workbook = new ExcelJS.Workbook();

  // Log para debug
  console.log('🔍 Generando Excel con', evaluaciones.length, 'evaluaciones');
  if (evaluaciones.length > 0) {
    console.log('📋 Primera evaluación:', {
      nombre: evaluaciones[0].nombre_completo,
      dni: evaluaciones[0].documento,
      apto: evaluaciones[0].apto,
      score: evaluaciones[0].score,
      estado: evaluaciones[0].estado_evaluacion
    });
  }

  // Separar APTOS y NO APTOS primero
  // Considerar APTO si: apto es true/1, estado es 'approved', o score >= 60
  const aptos = evaluaciones.filter(e => {
    const score = e.score || e.calificacion || 0;
    return e.apto === true || e.apto === 1 || e.estado_evaluacion === 'approved' || score >= 60;
  });

  // Considerar NO APTO si: apto es false/0, estado es 'rejected', o score < 60
  const noAptos = evaluaciones.filter(e => {
    const score = e.score || e.calificacion || 0;
    return e.apto === false || e.apto === 0 || e.estado_evaluacion === 'rejected' || score < 60;
  });

  console.log(`✅ APTOS: ${aptos.length}, ❌ NO APTOS: ${noAptos.length}`);

  // ========== HOJA 1: TODOS (APTOS Y NO APTOS) ==========
  const worksheet = workbook.addWorksheet('Todos los Postulantes');

  // Configurar página para impresión
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    }
  };

  // FILA 1: ENCABEZADO CON LOGOS (simulado con texto)
  worksheet.mergeCells('A1:K1');
  const headerCell = worksheet.getCell('A1');
  headerCell.value = '¡AÑO DE LA RECUPERACIÓN Y CONSOLIDACIÓN DE LA ECONOMÍA PERUANA!';
  headerCell.font = { bold: true, size: 12, name: 'Arial' };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  // FILA 2: TÍTULO PRINCIPAL
  worksheet.mergeCells('A2:K2');
  const titleCell = worksheet.getCell('A2');
  titleCell.value = `RESULTADOS PRELIMINARES DE LA EVALUACIÓN CURRICULAR - PROCESO DE CONTRATACIÓN CAS DETERMINADO (NECESIDAD TRANSITORIO) N° ${convocatoriaInfo?.numero_cas || '021-2025-UGEL-T'}`;
  titleCell.font = { bold: true, size: 11, name: 'Arial' };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  titleCell.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
  worksheet.getRow(2).height = 35;

  // FILA 3: PROCESO DE CONTRATACIÓN
  worksheet.mergeCells('A3:K3');
  const procesoCell = worksheet.getCell('A3');
  procesoCell.value = `PROCESO DE CONTRATACIÓN CAS (NECESIDAD TRANSITORIO) N° ${convocatoriaInfo?.numero_cas || '021-2025-UGEL-T'}`;
  procesoCell.font = { bold: true, size: 10, name: 'Arial' };
  procesoCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(3).height = 18;

  // FILA 4: PUESTO
  worksheet.mergeCells('A4:K4');
  const puestoCell = worksheet.getCell('A4');
  puestoCell.value = convocatoriaInfo?.puesto || 'TÉCNICO EN PATRIMONIO';
  puestoCell.font = { bold: true, size: 10, name: 'Arial' };
  puestoCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(4).height = 18;

  // FILA 5: FECHA
  worksheet.mergeCells('A5:K5');
  const fechaCell = worksheet.getCell('A5');
  fechaCell.value = `FECHA: ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  fechaCell.font = { bold: false, size: 10, name: 'Arial' };
  fechaCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(5).height = 18;

  // FILA 6: INDICACIONES
  worksheet.mergeCells('A6:K6');
  const indicacionTitleCell = worksheet.getCell('A6');
  indicacionTitleCell.value = 'INDICACIONES A TENER EN CUENTA:';
  indicacionTitleCell.font = { bold: true, size: 10, name: 'Arial' };
  indicacionTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(6).height = 18;

  // FILA 7: TEXTO DE INDICACIONES
  worksheet.mergeCells('A7:K7');
  const indicacionCell = worksheet.getCell('A7');
  indicacionCell.value = 'Los/as postulantes que obtienen la condición de "APTO" deberán verificar la publicación del Rol de Entrevista y las consideraciones para su ejecución en la fecha establecida según el cronograma';
  indicacionCell.font = { size: 9, name: 'Arial' };
  indicacionCell.alignment = { wrapText: true, horizontal: 'left', vertical: 'top' };
  worksheet.getRow(7).height = 30;

  // FILA 8: ESPACIO
  worksheet.getRow(8).height = 5;

  // FILA 9: ENCABEZADOS DE TABLA
  const headerRow = 9;
  const headers = [
    { col: 'A', text: 'N°', width: 5 },
    { col: 'B', text: 'APELLIDOS Y NOMBRES(*)', width: 35 },
    { col: 'C', text: 'DNI', width: 12 },
    { col: 'D', text: 'N° EXPEDIENTE', width: 15 },
    { col: 'E', text: 'FECHA DE EXP.', width: 13 },
    { col: 'F', text: 'FORMACIÓN ACADÉMICA', width: 13 },
    { col: 'G', text: 'EXPERIENCIA GENERAL', width: 13 },
    { col: 'H', text: 'EXPERIENCIA ESPECÍFICA', width: 13 },
    { col: 'I', text: 'PUNTAJE', width: 10 },
    { col: 'J', text: 'CONDICIÓN FINAL DE LA EVALUACIÓN', width: 18 },
    { col: 'K', text: 'OBSERVACIÓN', width: 40 }
  ];

  headers.forEach(header => {
    const cell = worksheet.getCell(`${header.col}${headerRow}`);
    cell.value = header.text;
    cell.font = { bold: true, size: 9, name: 'Arial' };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
    worksheet.getColumn(header.col).width = header.width;
  });

  worksheet.getRow(headerRow).height = 35;

  // DATOS DE APTOS
  let currentRow = headerRow + 1;

  aptos.forEach((evaluacion, index) => {
    const row = worksheet.getRow(currentRow);

    // Formatear fecha si existe
    let fechaFormateada = '-';
    if (evaluacion.fecha_expediente) {
      try {
        const fecha = new Date(evaluacion.fecha_expediente);
        if (!isNaN(fecha.getTime())) {
          fechaFormateada = fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch (e) {
        fechaFormateada = String(evaluacion.fecha_expediente).substring(0, 10);
      }
    }

    row.getCell('A').value = index + 1;
    row.getCell('B').value = limpiarTexto(evaluacion.nombre_completo || evaluacion.postulante_nombre || 'N/A');
    row.getCell('C').value = evaluacion.documento || evaluacion.postulante_dni || evaluacion.dni || 'N/A';
    row.getCell('D').value = evaluacion.expediente || evaluacion.expedienteSIGEA || evaluacion.numeroCAS || '-';
    row.getCell('E').value = fechaFormateada;
    row.getCell('F').value = evaluacion.formacion_puntaje || '-';
    row.getCell('G').value = evaluacion.exp_general_puntaje || '-';
    row.getCell('H').value = evaluacion.exp_especifica_puntaje || '-';
    row.getCell('I').value = evaluacion.score || evaluacion.puntuacion_total || evaluacion.calificacion || '-';
    row.getCell('J').value = 'APTO';
    row.getCell('K').value = '';

    // Estilo de la fila
    row.eachCell((cell) => {
      cell.font = { size: 9, name: 'Arial' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Alineación izquierda para nombres
    row.getCell('B').alignment = { vertical: 'middle', horizontal: 'left' };

    // Sin color de fondo para APTO (solo texto)
    row.getCell('J').font = { bold: false, size: 9, name: 'Arial' };

    row.height = 18;
    currentRow++;
  });

  // Espacio entre secciones
  currentRow += 1;

  // DATOS DE NO APTOS (sin título separado, directamente en la tabla)
  noAptos.forEach((evaluacion, index) => {
    const row = worksheet.getRow(currentRow);

    // Procesar razones (puede ser JSON, string o null)
    let razonesTexto = 'No cumple con el requisito mínimo de formación académica, grado y/o nivel de estudios';
    if (evaluacion.razones) {
      if (typeof evaluacion.razones === 'string') {
        try {
          const razonesObj = JSON.parse(evaluacion.razones);
          if (Array.isArray(razonesObj)) {
            razonesTexto = razonesObj.join(', ');
          } else if (typeof razonesObj === 'object') {
            razonesTexto = Object.values(razonesObj).join(', ');
          } else {
            razonesTexto = String(razonesObj);
          }
        } catch (e) {
          razonesTexto = evaluacion.razones;
        }
      } else if (Array.isArray(evaluacion.razones)) {
        razonesTexto = evaluacion.razones.join(', ');
      } else if (typeof evaluacion.razones === 'object') {
        razonesTexto = Object.values(evaluacion.razones).join(', ');
      }
    } else if (evaluacion.motivo_rechazo) {
      razonesTexto = evaluacion.motivo_rechazo;
    }

    row.getCell('A').value = aptos.length + index + 1;
    row.getCell('B').value = limpiarTexto(evaluacion.nombre_completo || evaluacion.postulante_nombre || 'N/A');
    row.getCell('C').value = evaluacion.documento || evaluacion.postulante_dni || evaluacion.dni || 'N/A';
    row.getCell('D').value = '-';
    row.getCell('E').value = '-';
    row.getCell('F').value = '-';
    row.getCell('G').value = '-';
    row.getCell('H').value = '-';
    row.getCell('I').value = '-';
    row.getCell('J').value = 'NO APTO';
    row.getCell('K').value = limpiarTexto(razonesTexto).substring(0, 100);

    // Estilo de la fila
    row.eachCell((cell) => {
      cell.font = { size: 9, name: 'Arial' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Alineación izquierda para nombres y observaciones
    row.getCell('B').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('K').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    // Sin color de fondo para NO APTO (solo texto)
    row.getCell('J').font = { bold: false, size: 9, name: 'Arial' };

    row.height = 18;
    currentRow++;
  });

  // Agregar filas vacías para completar la tabla
  for (let i = 0; i < 3; i++) {
    const row = worksheet.getRow(currentRow);
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(col => {
      const cell = row.getCell(col);
      cell.value = '';
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    row.height = 18;
    currentRow++;
  }

  // NOTA AL FINAL
  currentRow += 1;
  worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
  const notaTitleCell = worksheet.getCell(`A${currentRow}`);
  notaTitleCell.value = 'NOTA:';
  notaTitleCell.font = { bold: true, size: 9, name: 'Arial' };
  notaTitleCell.alignment = { horizontal: 'left', vertical: 'top' };
  worksheet.getRow(currentRow).height = 15;

  currentRow++;
  worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
  const notaCell = worksheet.getCell(`A${currentRow}`);
  notaCell.value = 'NO APTO/A: al luego de la verificación de la documentación sustentatoria remitida, la/el postulante no acredita de manera fehaciente el cumplimiento de uno (01) o más de los requisitos mínimos exigidos en el perfil del puesto al cual postula, mismo que se declara NO APTO.';
  notaCell.font = { bold: false, size: 9, name: 'Arial' };
  notaCell.alignment = { wrapText: true, horizontal: 'left', vertical: 'top' };
  worksheet.getRow(currentRow).height = 35;

  // ========== HOJA 2: SOLO APTOS ==========
  const worksheetAptos = workbook.addWorksheet('Solo APTOS');

  // Configurar página para impresión
  worksheetAptos.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.5,
      right: 0.5,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    }
  };

  // ENCABEZADO HOJA 2
  worksheetAptos.mergeCells('A1:K1');
  const headerCell2 = worksheetAptos.getCell('A1');
  headerCell2.value = '¡AÑO DE LA RECUPERACIÓN Y CONSOLIDACIÓN DE LA ECONOMÍA PERUANA!';
  headerCell2.font = { bold: true, size: 12, name: 'Arial' };
  headerCell2.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheetAptos.getRow(1).height = 30;

  worksheetAptos.mergeCells('A2:K2');
  const titleCell2 = worksheetAptos.getCell('A2');
  titleCell2.value = `POSTULANTES APTOS - PROCESO DE CONTRATACIÓN CAS N° ${convocatoriaInfo?.numero_cas || '021-2025-UGEL-T'}`;
  titleCell2.font = { bold: true, size: 11, name: 'Arial' };
  titleCell2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  titleCell2.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };
  titleCell2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF90EE90' }
  };
  worksheetAptos.getRow(2).height = 35;

  worksheetAptos.mergeCells('A3:K3');
  const puestoCell2 = worksheetAptos.getCell('A3');
  puestoCell2.value = `PUESTO: ${convocatoriaInfo?.puesto || 'TÉCNICO EN PATRIMONIO'}`;
  puestoCell2.font = { bold: true, size: 10, name: 'Arial' };
  puestoCell2.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheetAptos.getRow(3).height = 18;

  worksheetAptos.mergeCells('A4:K4');
  const totalAptosCell = worksheetAptos.getCell('A4');
  totalAptosCell.value = `TOTAL DE POSTULANTES APTOS: ${aptos.length}`;
  totalAptosCell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF006400' } };
  totalAptosCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheetAptos.getRow(4).height = 18;

  worksheetAptos.getRow(5).height = 5;

  // ENCABEZADOS DE TABLA HOJA 2
  const headerRow2 = 6;
  headers.forEach(header => {
    const cell = worksheetAptos.getCell(`${header.col}${headerRow2}`);
    cell.value = header.text;
    cell.font = { bold: true, size: 9, name: 'Arial' };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF90EE90' }
    };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
    worksheetAptos.getColumn(header.col).width = header.width;
  });

  worksheetAptos.getRow(headerRow2).height = 35;

  // DATOS DE APTOS EN HOJA 2
  let currentRow2 = headerRow2 + 1;

  aptos.forEach((evaluacion, index) => {
    const row = worksheetAptos.getRow(currentRow2);

    // Formatear fecha si existe
    let fechaFormateada = '-';
    if (evaluacion.fecha_expediente) {
      try {
        const fecha = new Date(evaluacion.fecha_expediente);
        if (!isNaN(fecha.getTime())) {
          fechaFormateada = fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch (e) {
        fechaFormateada = String(evaluacion.fecha_expediente).substring(0, 10);
      }
    }

    row.getCell('A').value = index + 1;
    row.getCell('B').value = limpiarTexto(evaluacion.nombre_completo || evaluacion.postulante_nombre || 'N/A');
    row.getCell('C').value = evaluacion.documento || evaluacion.postulante_dni || evaluacion.dni || 'N/A';
    row.getCell('D').value = evaluacion.expediente || evaluacion.expedienteSIGEA || evaluacion.numeroCAS || '-';
    row.getCell('E').value = fechaFormateada;
    row.getCell('F').value = evaluacion.formacion_puntaje || '-';
    row.getCell('G').value = evaluacion.exp_general_puntaje || '-';
    row.getCell('H').value = evaluacion.exp_especifica_puntaje || '-';
    row.getCell('I').value = evaluacion.score || evaluacion.puntuacion_total || evaluacion.calificacion || '-';
    row.getCell('J').value = 'APTO';
    row.getCell('K').value = '';

    // Estilo de la fila
    row.eachCell((cell) => {
      cell.font = { size: 9, name: 'Arial' };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Alineación izquierda para nombres
    row.getCell('B').alignment = { vertical: 'middle', horizontal: 'left' };

    // Resaltar APTO en verde claro
    row.getCell('J').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF90EE90' }
    };
    row.getCell('J').font = { bold: true, size: 9, name: 'Arial', color: { argb: 'FF006400' } };

    row.height = 18;
    currentRow2++;
  });

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export default {
  generarPDF,
  generarReporteEvaluacionesCAS,
  generarReporteDetalladoPostulante,
  generarPDFReporteIA,
  generarExcelEvaluacionesCAS
};