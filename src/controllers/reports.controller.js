import { pool } from '../database/conexion.js';
import { generarExcelEvaluacionesCAS } from '../services/pdfGenerator.js';

/**
 * Generar reporte Excel de evaluaciones CAS
 */
export const generarReporteExcelEvaluaciones = async (req, res) => {
  try {
    const { convocatoriaId } = req.params;
    
    // Obtener información de la convocatoria
    const [convocatorias] = await pool.execute(
      'SELECT * FROM convocatorias WHERE IDCONVOCATORIA = ?',
      [convocatoriaId]
    );
    
    if (convocatorias.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Convocatoria no encontrada'
      });
    }
    
    const convocatoria = convocatorias[0];
    
    // Obtener todas las evaluaciones de esa convocatoria desde reportes_ia
    const [evaluaciones] = await pool.execute(
      `SELECT 
        r.IDREPORTE as id,
        r.IDUSUARIO,
        r.nombre_completo,
        r.email,
        r.puesto_postulado as puesto,
        r.score,
        r.calificacion,
        r.estado_evaluacion,
        r.apto,
        r.razones,
        r.motivo_rechazo,
        r.analisis,
        r.experiencia_relevante,
        r.habilidades_clave,
        pr.dni as documento,
        pr.numeroCAS,
        pr.area,
        pr.expedienteSIGEA as expediente,
        pr.fechaRegistro as fecha_expediente,
        pr.certificadoId
      FROM reportes_ia r
      LEFT JOIN postulantes_registrados pr ON r.IDUSUARIO = pr.IDUSUARIO AND r.IDCONVOCATORIA = pr.convocatoriaId
      WHERE r.IDCONVOCATORIA = ?
      ORDER BY r.apto DESC, r.nombre_completo ASC`,
      [convocatoriaId]
    );
    
    console.log('📊 Generando Excel para convocatoria:', convocatoriaId);
    console.log('📋 Total de evaluaciones:', evaluaciones.length);
    
    // Log de los primeros 3 registros para debug
    if (evaluaciones.length > 0) {
      console.log('📄 Muestra de datos (primeros 3):');
      evaluaciones.slice(0, 3).forEach((ev, idx) => {
        console.log(`  ${idx + 1}. ${ev.nombre_completo} - DNI: ${ev.documento} - APTO: ${ev.apto} - Score: ${ev.score}`);
      });
    } else {
      console.warn('⚠️ No se encontraron evaluaciones para esta convocatoria');
    }
    
    console.log('📄 Datos de convocatoria:', {
      numero_cas: convocatoria.numeroCAS || convocatoria.numero_cas,
      puesto: convocatoria.puesto,
      area: convocatoria.area
    });
    
    // Generar Excel
    const buffer = await generarExcelEvaluacionesCAS(evaluaciones, {
      numero_cas: convocatoria.numeroCAS || convocatoria.numero_cas || 'N/A',
      puesto: convocatoria.puesto || 'N/A',
      area: convocatoria.area || 'N/A'
    });
    
    console.log('✅ Excel generado exitosamente, tamaño:', buffer.length, 'bytes');
    
    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=evaluaciones_cas_${convocatoriaId}_${Date.now()}.xlsx`);
    res.send(buffer);
    
  } catch (error) {
    console.error('Error al generar reporte Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el reporte Excel',
      error: error.message
    });
  }
};

/**
 * Analizar un postulante específico con IA usando todos los requisitos de la convocatoria
 */
export const analizarPostulanteConIA = async (req, res) => {
  try {
    const { postulanteId, convocatoriaId } = req.params;
    const { convocatoria: convocatoriaFromBody } = req.body || {};

    console.log('🤖 Iniciando análisis de IA para postulante:', postulanteId, 'convocatoria:', convocatoriaId);

    // Obtener convocatoria con TODOS sus requisitos
    let convocatoria = convocatoriaFromBody;
    if (!convocatoria) {
      const [convocatorias] = await pool.execute(
        'SELECT * FROM convocatorias WHERE IDCONVOCATORIA = ?',
        [convocatoriaId]
      );

      if (convocatorias.length === 0) {
        return res.status(404).json({ error: 'Convocatoria no encontrada' });
      }

      convocatoria = convocatorias[0];
    }

    // Obtener datos del postulante
    const [postulantes] = await pool.execute(
      `SELECT u.*, pr.dni, pr.puesto as puesto_postulado, pr.area, pr.numeroCAS
       FROM usuarios u
       LEFT JOIN postulantes_registrados pr ON u.IDUSUARIO = pr.IDUSUARIO
       WHERE u.IDUSUARIO = ?`,
      [postulanteId]
    );

    if (postulantes.length === 0) {
      return res.status(404).json({ error: 'Postulante no encontrado' });
    }

    const postulante = postulantes[0];

    // Obtener CV del postulante
    const [cvs] = await pool.execute(
      'SELECT * FROM curriculum WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC LIMIT 1',
      [postulanteId]
    );

    // Obtener anexos del postulante
    const [anexos] = await pool.execute(
      'SELECT * FROM anexos_completos WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC',
      [postulanteId]
    );

    console.log('📄 Datos obtenidos:', {
      postulante: postulante.nombreCompleto,
      cv: cvs.length > 0 ? 'Sí' : 'No',
      anexos: anexos.length
    });

    // Construir prompt estructurado para la IA con TODOS los requisitos
    const prompt = construirPromptEvaluacion(convocatoria, postulante, cvs[0], anexos);

    console.log('📝 Prompt construido, enviando a IA...');

    // Llamar a la IA (OpenAI)
    const analisisIA = await llamarOpenAI(prompt);

    console.log('✅ Análisis de IA completado:', analisisIA);

    // Guardar resultado en reportes_ia
    await guardarEvaluacionIA(postulanteId, convocatoriaId, postulante, analisisIA);

    res.json({
      success: true,
      postulanteId,
      convocatoriaId,
      analisis: analisisIA
    });

  } catch (error) {
    console.error('❌ Error en análisis de IA:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Analizar todos los postulantes de una convocatoria con IA
 */
export const analizarConvocatoriaConIA = async (req, res) => {
  try {
    const { convocatoriaId } = req.params;
    const { convocatoria: convocatoriaFromBody } = req.body || {};

    console.log('🤖 Iniciando análisis masivo de convocatoria:', convocatoriaId);

    // Obtener convocatoria
    let convocatoria = convocatoriaFromBody;
    if (!convocatoria) {
      const [convocatorias] = await pool.execute(
        'SELECT * FROM convocatorias WHERE IDCONVOCATORIA = ?',
        [convocatoriaId]
      );

      if (convocatorias.length === 0) {
        return res.status(404).json({ error: 'Convocatoria no encontrada' });
      }

      convocatoria = convocatorias[0];
    }

    // Obtener todos los postulantes de esta convocatoria
    const [postulantes] = await pool.execute(
      `SELECT DISTINCT u.IDUSUARIO, u.nombreCompleto, u.correo as email, pr.dni, pr.puesto as puesto_postulado
       FROM usuarios u
       INNER JOIN postulantes_registrados pr ON u.IDUSUARIO = pr.IDUSUARIO
       WHERE pr.convocatoriaId = ?`,
      [convocatoriaId]
    );

    console.log(`📊 Analizando ${postulantes.length} postulantes...`);

    const resultados = [];
    let aptos = 0;
    let noAptos = 0;

    // Analizar cada postulante
    for (const postulante of postulantes) {
      try {
        console.log(`🔍 Analizando: ${postulante.nombreCompleto}...`);

        // Obtener CV y anexos
        const [cvs] = await pool.execute(
          'SELECT * FROM curriculum WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC LIMIT 1',
          [postulante.IDUSUARIO]
        );

        const [anexos] = await pool.execute(
          'SELECT * FROM anexos_completos WHERE IDUSUARIO = ? ORDER BY fechaCreacion DESC',
          [postulante.IDUSUARIO]
        );

        // Construir prompt y analizar
        const prompt = construirPromptEvaluacion(convocatoria, postulante, cvs[0], anexos);
        const analisisIA = await llamarOpenAI(prompt);

        // Guardar resultado
        await guardarEvaluacionIA(postulante.IDUSUARIO, convocatoriaId, postulante, analisisIA);

        if (analisisIA.cumpleRequisitos) {
          aptos++;
        } else {
          noAptos++;
        }

        resultados.push({
          postulanteId: postulante.IDUSUARIO,
          nombreCompleto: postulante.nombreCompleto,
          email: postulante.email,
          dni: postulante.dni,
          score: analisisIA.score,
          cumpleRequisitos: analisisIA.cumpleRequisitos,
          estado: analisisIA.recomendacion,
          detalles: analisisIA.detalles
        });

        console.log(`✅ ${postulante.nombreCompleto}: ${analisisIA.recomendacion} (Score: ${analisisIA.score})`);

      } catch (error) {
        console.error(`❌ Error analizando ${postulante.nombreCompleto}:`, error.message);
        resultados.push({
          postulanteId: postulante.IDUSUARIO,
          nombreCompleto: postulante.nombreCompleto,
          error: error.message
        });
      }
    }

    console.log(`✅ Análisis completado: ${aptos} aptos, ${noAptos} no aptos`);

    res.json({
      success: true,
      convocatoriaId,
      totalPostulantes: postulantes.length,
      postulantesAptos: aptos,
      postulantesNoAptos: noAptos,
      resultados
    });

  } catch (error) {
    console.error('❌ Error en análisis masivo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Construir prompt estructurado para la IA con TODOS los requisitos de la convocatoria
 */
function construirPromptEvaluacion(convocatoria, postulante, cv, anexos) {
  // Parsear arrays JSON si es necesario
  const parseJson = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    }
    return [];
  };

  const formacionNivel = parseJson(convocatoria.formacionNivel);
  const habilidadesClave = parseJson(convocatoria.habilidadesTecnicas);

  const prompt = `Eres un evaluador experto de recursos humanos especializado en procesos de selección CAS (Contrato Administrativo de Servicios) en el sector público peruano.

Analiza si el postulante cumple con TODOS los requisitos de la convocatoria.

═══════════════════════════════════════════════════════════════
📋 INFORMACIÓN DE LA CONVOCATORIA
═══════════════════════════════════════════════════════════════

🏢 DATOS GENERALES:
- Puesto: ${convocatoria.puesto || 'N/A'}
- Área: ${convocatoria.area || 'N/A'}
- Tipo de Puesto: ${convocatoria.tipoPuesto || 'N/A'}
- Número CAS: ${convocatoria.numeroCAS || convocatoria.numero_cas || 'N/A'}
- Remuneración: ${convocatoria.sueldo || 'N/A'}

🎓 REQUISITOS ACADÉMICOS:
- Título Profesional Requerido: ${convocatoria.tituloProfesional || 'No especificado'}
- Requisitos Académicos: ${convocatoria.requisitosAcademicos || convocatoria.requisitos || 'No especificado'}
- Niveles de Formación Aceptados: ${formacionNivel.length > 0 ? formacionNivel.join(', ') : 'No especificado'}
- Nivel Educativo Mínimo: ${convocatoria.nivelEducativoMinimo || 'No especificado'}

💼 EXPERIENCIA LABORAL REQUERIDA:
- Años Totales: ${convocatoria.experiencia || convocatoria.experienciaTotal || 'No especificado'}
- Experiencia Específica (en la función): ${convocatoria.experienciaEspecifica || 'No especificado'}
- Experiencia Máxima Permitida: ${convocatoria.experienciaMaxima || 'Sin límite'}
- Experiencia Pública Mínima: ${convocatoria.expPublicaMin || 'No especificado'}
- Experiencia Pública Máxima: ${convocatoria.expPublicaMax || 'No especificado'}

🛠️ HABILIDADES Y CONOCIMIENTOS:
- Habilidades Técnicas: ${convocatoria.habilidadesTecnicas || convocatoria.habilidades || 'No especificado'}
- Conocimientos de Ofimática: ${convocatoria.conocimientosOfimatica || 'No especificado'}
- Idiomas: ${convocatoria.conocimientosIdiomas || 'No especificado'}
- Cursos de Especialización: ${convocatoria.cursosEspecializacion || 'No especificado'}

📜 REQUISITOS PROFESIONALES:
- Requiere Colegiatura: ${convocatoria.requiereColegiatura || convocatoria.colegiaturaProfesional || 'No'}
- Requiere Habilitación: ${convocatoria.requiereHabilitacion || 'No'}

📄 OTROS:
- Duración del Contrato: ${convocatoria.duracionContrato || 'No especificado'}

═══════════════════════════════════════════════════════════════
👤 DATOS DEL POSTULANTE
═══════════════════════════════════════════════════════════════

Nombre: ${postulante.nombreCompleto || 'N/A'}
DNI: ${postulante.dni || postulante.documento || 'N/A'}
Email: ${postulante.email || postulante.correo || 'N/A'}
Teléfono: ${postulante.telefono || 'N/A'}

📄 CURRICULUM VITAE:
${cv ? `Archivo: ${cv.nombreArchivo || 'curriculum.pdf'}
Fecha de carga: ${cv.fechaCreacion || 'N/A'}
[Analizar contenido del CV para extraer: formación académica, experiencia laboral, habilidades, cursos]` : 'No se ha cargado CV'}

📎 ANEXOS PRESENTADOS (${anexos.length}):
${anexos.length > 0 ? anexos.map((a, i) => `
${i + 1}. ${a.nombreArchivo || `Anexo ${i + 1}`}
   - Tipo: ${a.tipoDocumento || 'Documento'}
   - Fecha: ${a.fechaCreacion || 'N/A'}
   [Analizar contenido para verificar: certificados, constancias, títulos, etc.]`).join('\n') : 'No se han cargado anexos'}

═══════════════════════════════════════════════════════════════
📊 INSTRUCCIONES DE EVALUACIÓN
═══════════════════════════════════════════════════════════════

Analiza CADA requisito de forma individual y detallada:

1. **Requisitos Académicos**: Verifica si el postulante tiene el título, grado o nivel educativo requerido
2. **Experiencia Total**: Verifica si cumple con los años totales de experiencia
3. **Experiencia Específica**: Verifica si tiene la experiencia específica en la función o materia
4. **Experiencia Máxima**: Verifica que NO exceda el límite máximo (si aplica)
5. **Experiencia Pública**: Verifica experiencia en el sector público (si aplica)
6. **Habilidades Técnicas**: Verifica si domina las habilidades técnicas requeridas
7. **Conocimientos de Ofimática**: Verifica nivel de manejo de herramientas ofimáticas
8. **Idiomas**: Verifica dominio de idiomas requeridos
9. **Cursos de Especialización**: Verifica si cuenta con los cursos requeridos
10. **Colegiatura y Habilitación**: Verifica si está colegiado y habilitado (si aplica)

Asigna un **score de 0-100** basado en:
- Cumplimiento de requisitos obligatorios: 70 puntos
- Experiencia adicional relevante: 15 puntos
- Habilidades complementarias: 10 puntos
- Cursos y certificaciones adicionales: 5 puntos

Proporciona una **recomendación**:
- **APTO**: Cumple con TODOS los requisitos obligatorios (score >= 70)
- **NO APTO**: No cumple con uno o más requisitos obligatorios (score < 70)
- **OBSERVADO**: Cumple requisitos pero con observaciones menores (score 70-79)

═══════════════════════════════════════════════════════════════
📝 FORMATO DE RESPUESTA (JSON)
═══════════════════════════════════════════════════════════════

Responde ÚNICAMENTE en formato JSON con esta estructura exacta:

{
  "cumpleRequisitos": true/false,
  "score": 0-100,
  "detalles": {
    "requisitosAcademicos": {
      "cumple": true/false,
      "detalle": "Descripción detallada del cumplimiento o incumplimiento"
    },
    "experienciaTotal": {
      "cumple": true/false,
      "detalle": "Años de experiencia encontrados vs requeridos"
    },
    "experienciaEspecifica": {
      "cumple": true/false,
      "detalle": "Experiencia específica encontrada vs requerida"
    },
    "experienciaMaxima": {
      "cumple": true/false,
      "detalle": "Verificación de límite máximo"
    },
    "habilidades": {
      "cumple": true/false,
      "detalle": "Habilidades encontradas vs requeridas"
    },
    "ofimatica": {
      "cumple": true/false,
      "detalle": "Nivel de ofimática encontrado vs requerido"
    },
    "idiomas": {
      "cumple": true/false,
      "detalle": "Idiomas encontrados vs requeridos"
    },
    "cursos": {
      "cumple": true/false,
      "detalle": "Cursos encontrados vs requeridos"
    },
    "colegiatura": {
      "cumple": true/false,
      "detalle": "Estado de colegiatura y habilitación"
    }
  },
  "recomendacion": "APTO" | "NO APTO" | "OBSERVADO",
  "observaciones": "Comentarios adicionales y recomendaciones"
}`;

  return prompt;
}

/**
 * Llamar a OpenAI para análisis
 */
async function llamarOpenAI(prompt) {
  try {
    // Verificar si OpenAI está configurado
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY no configurada, usando análisis simulado');
      return analisisSimulado();
    }

    const { Configuration, OpenAIApi } = await import('openai');
    
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const openai = new OpenAIApi(configuration);

    console.log('🤖 Llamando a OpenAI GPT-4...');

    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Eres un evaluador experto de recursos humanos especializado en procesos CAS del sector público peruano. Respondes siempre en formato JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.data.choices[0].message.content;
    console.log('✅ Respuesta de OpenAI recibida');

    // Parsear respuesta JSON
    const analisis = JSON.parse(content);
    return analisis;

  } catch (error) {
    console.error('❌ Error llamando a OpenAI:', error.message);
    // Si falla OpenAI, usar análisis simulado
    return analisisSimulado();
  }
}

/**
 * Análisis simulado (fallback si OpenAI no está disponible)
 */
function analisisSimulado() {
  return {
    cumpleRequisitos: true,
    score: 75,
    detalles: {
      requisitosAcademicos: {
        cumple: true,
        detalle: 'Análisis pendiente - OpenAI no disponible'
      },
      experienciaTotal: {
        cumple: true,
        detalle: 'Análisis pendiente - OpenAI no disponible'
      },
      experienciaEspecifica: {
        cumple: true,
        detalle: 'Análisis pendiente - OpenAI no disponible'
      },
      experienciaMaxima: {
        cumple: true,
        detalle: 'Análisis pendiente - OpenAI no disponible'
      },
      habilidades: {
        cumple: true,
        detalle: 'Análisis pendiente - OpenAI no disponible'
      },
      ofimatica: {
        cumple: true,
        detalle: 'Análisis pendiente - OpenAI no disponible'
      },
      idiomas: {
        cumple: true,
        detalle: 'Análisis pendiente - OpenAI no disponible'
      },
      cursos: {
        cumple: true,
        detalle: 'Análisis pendiente - OpenAI no disponible'
      },
      colegiatura: {
        cumple: true,
        detalle: 'Análisis pendiente - OpenAI no disponible'
      }
    },
    recomendacion: 'OBSERVADO',
    observaciones: 'Análisis simulado - Configure OPENAI_API_KEY para análisis real con IA'
  };
}

/**
 * Guardar evaluación de IA en la tabla reportes_ia
 */
async function guardarEvaluacionIA(postulanteId, convocatoriaId, postulante, analisis) {
  try {
    // Preparar datos para insertar
    const apto = analisis.cumpleRequisitos ? 1 : 0;
    const estado = analisis.recomendacion === 'APTO' ? 'approved' : 
                   analisis.recomendacion === 'NO APTO' ? 'rejected' : 'pending';

    // Extraer habilidades clave del análisis
    const habilidadesClave = [];
    if (analisis.detalles?.habilidades?.cumple) {
      habilidadesClave.push('Habilidades técnicas verificadas');
    }
    if (analisis.detalles?.ofimatica?.cumple) {
      habilidadesClave.push('Conocimientos de ofimática');
    }
    if (analisis.detalles?.idiomas?.cumple) {
      habilidadesClave.push('Idiomas requeridos');
    }

    // Insertar o actualizar en reportes_ia
    await pool.execute(
      `INSERT INTO reportes_ia (
        IDUSUARIO,
        IDCONVOCATORIA,
        nombre_completo,
        email,
        puesto_postulado,
        score,
        calificacion,
        estado_evaluacion,
        apto,
        razones,
        motivo_rechazo,
        analisis,
        experiencia_relevante,
        habilidades_clave,
        fechaCreacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        score = VALUES(score),
        calificacion = VALUES(calificacion),
        estado_evaluacion = VALUES(estado_evaluacion),
        apto = VALUES(apto),
        razones = VALUES(razones),
        motivo_rechazo = VALUES(motivo_rechazo),
        analisis = VALUES(analisis),
        experiencia_relevante = VALUES(experiencia_relevante),
        habilidades_clave = VALUES(habilidades_clave),
        fechaActualizacion = NOW()`,
      [
        postulanteId,
        convocatoriaId,
        postulante.nombreCompleto || 'N/A',
        postulante.email || postulante.correo || 'N/A',
        postulante.puesto_postulado || 'N/A',
        analisis.score,
        analisis.score, // calificacion = score
        estado,
        apto,
        analisis.observaciones || '',
        apto ? '' : (analisis.observaciones || 'No cumple requisitos'),
        JSON.stringify(analisis.detalles),
        analisis.detalles?.experienciaEspecifica?.detalle || '',
        JSON.stringify(habilidadesClave)
      ]
    );

    console.log('💾 Evaluación guardada en reportes_ia');

  } catch (error) {
    console.error('❌ Error guardando evaluación:', error);
    throw error;
  }
}
