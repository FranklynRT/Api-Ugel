import { pool } from '../database/conexion.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Obtener o generar constancia de postulación
 * GET /ugel-talara/documentos/postulantes-registrados/:id/certificado-imagen
 */
export const obtenerConstanciaPostulante = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Obteniendo constancia para postulante ID: ${id}`);

    // Obtener datos del postulante
    const [postulantes] = await pool.execute(
      'SELECT * FROM postulantes_registrados WHERE id = ?',
      [id]
    );

    if (postulantes.length === 0) {
      console.error(`❌ Postulante ${id} no encontrado`);
      return res.status(404).json({
        success: false,
        error: 'Postulante no encontrado'
      });
    }

    const postulante = postulantes[0];
    console.log(`✅ Postulante encontrado: ${postulante.nombreCompleto}`);

    // Obtener información de convocatoria
    let convocatoria = null;
    if (postulante.convocatoriaId) {
      const [convocatorias] = await pool.execute(
        'SELECT * FROM convocatorias WHERE IDCONVOCATORIA = ?',
        [postulante.convocatoriaId]
      );
      if (convocatorias.length > 0) {
        convocatoria = convocatorias[0];
      }
    }

    // Definir carpeta de constancias
    const constanciasDir = path.join(process.cwd(), 'uploads', 'constancias');
    
    // Crear carpeta si no existe
    if (!fs.existsSync(constanciasDir)) {
      fs.mkdirSync(constanciasDir, { recursive: true });
      console.log(`📁 Carpeta creada: ${constanciasDir}`);
    }

    // Nombre del archivo
    const certificadoId = postulante.certificadoId || `CERT-${id}`;
    const dni = postulante.dni || 'sin-dni';
    const fileName = `constancia_${certificadoId.replace(/[^a-zA-Z0-9-]/g, '_')}_${dni}.png`;
    const filePath = path.join(constanciasDir, fileName);

    let imagenBuffer = null;
    let constanciaGenerada = false;

    console.log(`📂 Buscando constancia en: ${filePath}`);
    console.log(`💾 Tiene imagen en BD: ${postulante.imagenConstancia ? 'SÍ' : 'NO'}`);
    console.log(`📁 Archivo existe en disco: ${fs.existsSync(filePath) ? 'SÍ' : 'NO'}`);

    // 1. Intentar leer desde disco (más rápido)
    if (fs.existsSync(filePath)) {
      console.log(`✅ Constancia encontrada en disco: ${fileName}`);
      console.log(`📊 Tamaño del archivo: ${fs.statSync(filePath).size} bytes`);
      imagenBuffer = fs.readFileSync(filePath);
      
      // Si no está en BD, guardarla
      if (!postulante.imagenConstancia) {
        console.log(`💾 Guardando constancia en BD desde disco...`);
        try {
          await pool.execute(
            'UPDATE postulantes_registrados SET imagenConstancia = ?, archivoConstancia = ? WHERE id = ?',
            [imagenBuffer, fileName, id]
          );
          console.log(`✅ Constancia guardada en BD`);
        } catch (updateError) {
          console.warn(`⚠️ No se pudo actualizar BD:`, updateError.message);
        }
      }
    }
    // 2. Intentar obtener desde BD
    else if (postulante.imagenConstancia) {
      console.log(`✅ Constancia encontrada en BD`);
      console.log(`📊 Tamaño en BD: ${postulante.imagenConstancia.length} bytes`);
      imagenBuffer = postulante.imagenConstancia;
      
      // Guardar en disco para futuras consultas
      try {
        fs.writeFileSync(filePath, imagenBuffer);
        console.log(`💾 Constancia guardada en disco desde BD: ${fileName}`);
      } catch (saveError) {
        console.warn(`⚠️ No se pudo guardar en disco:`, saveError.message);
      }
    }
    // 3. Generar nueva constancia SOLO si no existe
    else {
      console.log(`🎨 Generando nueva constancia (no existe en disco ni BD)...`);
      constanciaGenerada = true;
      
      try {
        // Verificar si canvas está disponible
        let canvasModule;
        try {
          canvasModule = await import('canvas');
          console.log('✅ Módulo canvas disponible');
        } catch (canvasError) {
          console.warn('⚠️ Canvas no disponible:', canvasError.message);
          console.log('📝 Usando fallback HTML...');
          
          // Generar HTML y retornar
          const htmlConstancia = generarConstanciaHTML(postulante, convocatoria, certificadoId);
          return res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Constancia de Postulación</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .constancia { max-width: 800px; margin: 0 auto; border: 3px solid #154c79; padding: 40px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { text-align: center; color: #154c79; margin-bottom: 30px; }
                .title { font-size: 24px; font-weight: bold; margin: 20px 0; text-align: center; }
                .content { line-height: 1.8; }
                .nombre { font-size: 20px; font-weight: bold; color: #154c79; margin: 20px 0; text-align: center; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
                .codigo { background: #f3f4f6; padding: 10px; margin-top: 30px; text-align: center; font-family: monospace; border: 1px solid #ddd; }
                @media print { body { margin: 0; background: white; } }
              </style>
            </head>
            <body>
              ${htmlConstancia}
              <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #154c79; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
                  🖨️ Imprimir Constancia
                </button>
              </div>
            </body>
            </html>
          `);
        }
        
        // Si canvas está disponible, generar imagen
        imagenBuffer = await generarConstanciaConCanvas(postulante, convocatoria, certificadoId, canvasModule);
        
        console.log(`✅ Constancia generada con canvas (${imagenBuffer.length} bytes)`);
        
        // Guardar en disco PRIMERO
        try {
          fs.writeFileSync(filePath, imagenBuffer);
          console.log(`💾 Constancia guardada en disco: ${filePath}`);
          console.log(`📊 Tamaño del archivo: ${fs.statSync(filePath).size} bytes`);
        } catch (diskError) {
          console.error(`❌ Error al guardar en disco:`, diskError);
          throw diskError;
        }
        
        // Guardar en BD DESPUÉS
        try {
          await pool.execute(
            'UPDATE postulantes_registrados SET imagenConstancia = ?, archivoConstancia = ? WHERE id = ?',
            [imagenBuffer, fileName, id]
          );
          console.log(`💾 Constancia guardada en BD para postulante ${id}`);
        } catch (dbError) {
          console.error(`❌ Error al guardar en BD:`, dbError);
          // No fallar si BD falla, el archivo en disco es suficiente
        }
        
      } catch (canvasError) {
        console.error(`❌ Error con canvas:`, canvasError.message);
        
        // Fallback: Generar constancia HTML simple
        console.log(`📝 Generando constancia HTML como fallback...`);
        const htmlConstancia = generarConstanciaHTML(postulante, convocatoria, certificadoId);
        
        return res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Constancia de Postulación</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .constancia { max-width: 800px; margin: 0 auto; border: 3px solid #154c79; padding: 40px; }
              .header { text-align: center; color: #154c79; margin-bottom: 30px; }
              .title { font-size: 24px; font-weight: bold; margin: 20px 0; }
              .content { line-height: 1.8; }
              .nombre { font-size: 20px; font-weight: bold; color: #154c79; margin: 20px 0; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
              .codigo { background: #f3f4f6; padding: 10px; margin-top: 30px; text-align: center; font-family: monospace; }
            </style>
          </head>
          <body>
            ${htmlConstancia}
          </body>
          </html>
        `);
      }
    }

    // Servir la imagen
    if (imagenBuffer) {
      console.log(`✅ Sirviendo constancia (${imagenBuffer.length} bytes)`);
      
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': imagenBuffer.length,
        'Cache-Control': 'public, max-age=86400', // Cache por 1 día
      });
      res.end(imagenBuffer);
    } else {
      throw new Error('No se pudo generar la constancia');
    }

  } catch (error) {
    console.error('❌ Error al obtener constancia:', error);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Error al obtener constancia',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Generar constancia con Canvas
 */
async function generarConstanciaConCanvas(postulante, convocatoria, certificadoId, canvasModule) {
  const { createCanvas } = canvasModule;
  const canvas = createCanvas(1200, 848);
  const ctx = canvas.getContext('2d');
  
  // Fondo blanco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1200, 848);
  
  // Marco decorativo
  ctx.strokeStyle = '#154c79';
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, 1160, 808);
  
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 1136, 784);
  
  // Encabezado
  let y = 110;
  ctx.fillStyle = '#154c79';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('UNIDAD DE GESTIÓN EDUCATIVA LOCAL TALARA', 600, y);
  
  y += 35;
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('★ ★ ★   EXCELENCIA Y TRANSPARENCIA   ★ ★ ★', 600, y);
  
  // Título
  y += 90;
  ctx.fillStyle = '#154c79';
  ctx.font = 'bold 56px Arial';
  ctx.fillText('CONSTANCIA DE POSTULACIÓN', 600, y);
  
  // Línea decorativa
  y += 25;
  ctx.fillStyle = '#154c79';
  ctx.fillRect(350, y, 500, 3);
  
  // Texto introductorio
  y += 70;
  ctx.fillStyle = '#374151';
  ctx.font = 'normal 22px Arial';
  ctx.fillText('La Unidad de Gestión Educativa Local Talara hace constar que:', 600, y);
  
  // Nombre del postulante - CON APELLIDOS
  y += 70;
  const nombreCompleto = postulante.nombreCompleto || '';
  const apellidoPaterno = postulante.apellidoPaterno || '';
  const apellidoMaterno = postulante.apellidoMaterno || '';
  const nombreCompletoConApellidos = `${nombreCompleto} ${apellidoPaterno} ${apellidoMaterno}`.trim().toUpperCase() || 'POSTULANTE';
  
  ctx.fillStyle = '#154c79';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(nombreCompletoConApellidos, 600, y);
  
  // DNI
  y += 45;
  ctx.fillStyle = '#4b5563';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(`Identificado(a) con DNI N° ${postulante.dni || 'N/A'}`, 600, y);
  
  // Texto de postulación
  y += 70;
  ctx.fillStyle = '#374151';
  ctx.font = 'normal 24px Arial';
  ctx.fillText('Ha completado satisfactoriamente su inscripción en el proceso de selección', 600, y);
  
  // Convocatoria
  y += 35;
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#154c79';
  const nombreConvocatoria = convocatoria ? 
    (convocatoria.puesto || convocatoria.area || convocatoria.titulo || 'CONVOCATORIA CAS') : 
    'CONVOCATORIA CAS';
  ctx.fillText(nombreConvocatoria.toUpperCase(), 600, y);
  
  // Número CAS
  if (convocatoria && (convocatoria.numeroCAS || convocatoria.numeroCas)) {
    y += 35;
    ctx.font = 'normal 20px Arial';
    ctx.fillStyle = '#4b5563';
    ctx.fillText(`N° CAS: ${convocatoria.numeroCAS || convocatoria.numeroCas}`, 600, y);
  }
  
  // Fecha
  const footerY = 668;
  ctx.fillStyle = '#374151';
  ctx.font = 'italic 18px Arial';
  const fecha = new Date().toLocaleDateString('es-PE', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  ctx.fillText('Talara, ' + fecha, 600, footerY);
  
  // Código - MUY AGRANDADO
  const codigoY = footerY + 60;
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(150, codigoY - 45, 900, 90);
  ctx.strokeStyle = '#154c79';
  ctx.lineWidth = 4;
  ctx.strokeRect(150, codigoY - 45, 900, 90);
  
  ctx.fillStyle = '#154c79';
  ctx.font = 'bold 36px monospace';
  ctx.fillText(`CÓDIGO: ${certificadoId}`, 600, codigoY + 15);
  
  // Nota
  const notaY = 788;
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('IMPORTANTE: Adjunte esta constancia en su expediente para Mesa de Partes.', 600, notaY);
  
  return canvas.toBuffer('image/png');
}

/**
 * Generar constancia HTML (fallback)
 */
function generarConstanciaHTML(postulante, convocatoria, certificadoId) {
  const nombreConvocatoria = convocatoria ? 
    (convocatoria.puesto || convocatoria.area || convocatoria.titulo || 'CONVOCATORIA CAS') : 
    'CONVOCATORIA CAS';
  
  const numeroCAS = convocatoria ? (convocatoria.numeroCAS || convocatoria.numeroCas) : null;
  
  const fecha = new Date().toLocaleDateString('es-PE', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  // Construir nombre completo con apellidos
  const nombreCompleto = postulante.nombreCompleto || '';
  const apellidoPaterno = postulante.apellidoPaterno || '';
  const apellidoMaterno = postulante.apellidoMaterno || '';
  const nombreCompletoConApellidos = `${nombreCompleto} ${apellidoPaterno} ${apellidoMaterno}`.trim().toUpperCase() || 'POSTULANTE';
  
  return `
    <div class="constancia">
      <div class="header">
        <h1>UNIDAD DE GESTIÓN EDUCATIVA LOCAL TALARA</h1>
        <p>★ ★ ★ EXCELENCIA Y TRANSPARENCIA ★ ★ ★</p>
      </div>
      
      <div class="title">CONSTANCIA DE POSTULACIÓN</div>
      
      <div class="content">
        <p>La Unidad de Gestión Educativa Local Talara hace constar que:</p>
        
        <div class="nombre">${nombreCompletoConApellidos}</div>
        
        <p>Identificado(a) con DNI N° <strong>${postulante.dni || 'N/A'}</strong></p>
        
        <p>Ha completado satisfactoriamente su inscripción en el proceso de selección</p>
        
        <p><strong>${nombreConvocatoria.toUpperCase()}</strong></p>
        
        ${numeroCAS ? `<p>N° CAS: ${numeroCAS}</p>` : ''}
        
        <p style="margin-top: 40px;">Talara, ${fecha}</p>
        
        <div class="codigo">
          <strong>CÓDIGO: ${certificadoId}</strong>
        </div>
        
        <div class="footer">
          <p style="color: #dc2626; font-weight: bold;">
            IMPORTANTE: Adjunte esta constancia en su expediente para Mesa de Partes.
          </p>
        </div>
      </div>
    </div>
  `;
}

export default {
  obtenerConstanciaPostulante
};
