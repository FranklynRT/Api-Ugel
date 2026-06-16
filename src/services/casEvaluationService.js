import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Servicio de Evaluación Automática CAS con OpenAI
 * Implementa las 3 fases de evaluación según normativa CAS
 */

export class CASEvaluationService {
  
  /**
   * Evaluación completa según las 3 fases CAS
   */
  static async evaluarPostulanteCAS(datosCompletos) {
    const { convocatoria, anexos, curriculum, postulante } = datosCompletos;
    
    try {
      // Evaluación por fases
      const evaluacionFase1 = await this.evaluarFase1(convocatoria, anexos, postulante);
      const evaluacionFase2 = await this.evaluarFase2(convocatoria, anexos, postulante);
      const evaluacionFase3 = await this.evaluarFase3(convocatoria, anexos, postulante);
      
      // Calcular puntuación total
      const puntuacionTotal = this.calcularPuntuacionTotal(evaluacionFase1, evaluacionFase2, evaluacionFase3);
      
      // Generar reporte detallado
      const reporteDetallado = await this.generarReporteDetallado({
        convocatoria,
        postulante,
        evaluacionFase1,
        evaluacionFase2,
        evaluacionFase3,
        puntuacionTotal
      });
      
      return {
        postulanteId: postulante.id,
        convocatoriaId: convocatoria.id,
        evaluacion: {
          fase1: evaluacionFase1,
          fase2: evaluacionFase2,
          fase3: evaluacionFase3,
          puntuacionTotal,
          estadoGeneral: puntuacionTotal.puntuacionMinima >= 7 ? 'APROBADO' : 'RECHAZADO'
        },
        reporteDetallado,
        fechaEvaluacion: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error en evaluación CAS:', error);
      throw new Error(`Error en evaluación automática: ${error.message}`);
    }
  }

  /**
   * FASE 1 - Verificación de Requisitos Académicos
   * Puntaje: 0-20 (Mínimo aprobatorio: 20)
   */
  static async evaluarFase1(convocatoria, anexos, postulante) {
    const prompt = `
    EVALUACIÓN FASE 1 - REQUISITOS ACADÉMICOS (CAS)
    
    CONVOCATORIA:
    - Área: ${convocatoria.area}
    - Puesto: ${convocatoria.puesto}
    - Requisitos académicos mínimos: ${convocatoria.requisitos}
    
    POSTULANTE: ${postulante.nombre || 'N/A'} (DNI: ${postulante.dni || 'N/A'})
    
    ANEXOS PRESENTADOS:
    ${anexos.map(anexo => `
    - ${anexo.tipoAnexo}: ${anexo.nombreArchivo}
    - Datos adicionales: ${anexo.datosAdicionales || 'No disponible'}
    `).join('')}
    
    EVALÚA SEGÚN ESTOS CRITERIOS CAS:
    
    1. CUMPLIMIENTO DEL PERFIL MÍNIMO (Base: 20 puntos)
       - Verifica si cumple los requisitos académicos mínimos exigidos
       - Si NO cumple: 0 puntos (CANCELATORIO)
       - Si SÍ cumple: 20 puntos base
    
    2. PUNTUACIÓN ADICIONAL POR FORMACIÓN SUPERIOR:
       - Post Grados Universitarios (Maestría/Doctorado): +5 puntos
       - Diplomados/Cursos Post Grado No universitarios: +3 puntos
       - Título Profesional Universitario adicional: +2 puntos
       - Bachiller adicional: +1 punto
    
    RESPONDE EN FORMATO JSON:
    {
      "cumplePerfilMinimo": true/false,
      "puntuacionBase": 0 o 20,
      "formacionAdicional": [
        {
          "tipo": "Maestría/Doctorado/Diplomado/etc",
          "descripcion": "Descripción específica",
          "puntosAdicionales": 5/3/2/1
        }
      ],
      "puntuacionTotal": número,
      "observaciones": "Detalles específicos de la evaluación",
      "documentosEvaluados": ["lista de documentos revisados"],
      "razonesRechazo": ["si aplica, razones específicas"]
    }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const resultado = JSON.parse(completion.choices[0].message.content);
    
    return {
      fase: 1,
      nombre: "Verificación de Requisitos Académicos",
      ...resultado,
      esCancelatorio: !resultado.cumplePerfilMinimo
    };
  }

  /**
   * FASE 2 - Verificación de Experiencia General
   * Puntaje: 0-20 (Mínimo aprobatorio: 20)
   */
  static async evaluarFase2(convocatoria, anexos, postulante) {
    const prompt = `
    EVALUACIÓN FASE 2 - EXPERIENCIA GENERAL (CAS)
    
    CONVOCATORIA:
    - Experiencia general requerida: ${convocatoria.experiencia}
    - Área: ${convocatoria.area}
    
    POSTULANTE: ${postulante.nombre || 'N/A'} (DNI: ${postulante.dni || 'N/A'})
    
    ANEXOS DE EXPERIENCIA:
    ${anexos.filter(anexo => 
      anexo.tipoAnexo.toLowerCase().includes('experiencia') || 
      anexo.tipoAnexo.toLowerCase().includes('laboral') ||
      anexo.tipoAnexo.toLowerCase().includes('trabajo')
    ).map(anexo => `
    - ${anexo.tipoAnexo}: ${anexo.nombreArchivo}
    - Datos: ${anexo.datosAdicionales || 'No disponible'}
    `).join('')}
    
    EVALÚA SEGÚN CRITERIOS CAS:
    
    1. CUMPLIMIENTO EXPERIENCIA MÍNIMA (Base: 20 puntos)
       - Verifica años de experiencia general requeridos
       - Si NO cumple mínimo: 0 puntos (CANCELATORIO)
       - Si SÍ cumple mínimo: 20 puntos base
    
    2. PUNTUACIÓN ADICIONAL POR EXPERIENCIA EXTRA:
       - Más de 15 años: +10 puntos
       - Más de 7 años y menor a 15 años: +8 puntos
       - Más de 5 años y menor a 7 años: +5 puntos
       - Más de 3 años y menor a 5 años: +3 puntos
       - Más de 2 años: +1 punto
    
    RESPONDE EN FORMATO JSON:
    {
      "cumpleExperienciaMinima": true/false,
      "anosExperienciaCalculados": número,
      "anosExperienciaRequeridos": número,
      "puntuacionBase": 0 o 20,
      "experienciaAdicional": {
        "anosAdicionales": número,
        "puntosAdicionales": número,
        "rango": "Más de X años"
      },
      "puntuacionTotal": número,
      "observaciones": "Detalles de la experiencia evaluada",
      "documentosEvaluados": ["lista de documentos"],
      "razonesRechazo": ["si aplica"]
    }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const resultado = JSON.parse(completion.choices[0].message.content);
    
    return {
      fase: 2,
      nombre: "Verificación de Experiencia General",
      ...resultado,
      esCancelatorio: !resultado.cumpleExperienciaMinima
    };
  }

  /**
   * FASE 3 - Verificación de Experiencia Específica
   * Puntaje: 0-30 (Mínimo aprobatorio: 30)
   */
  static async evaluarFase3(convocatoria, anexos, postulante) {
    const prompt = `
    EVALUACIÓN FASE 3 - EXPERIENCIA ESPECÍFICA (CAS)
    
    CONVOCATORIA:
    - Experiencia específica requerida: ${convocatoria.experiencia}
    - Área específica: ${convocatoria.area}
    - Habilidades requeridas: ${convocatoria.habilidades}
    
    POSTULANTE: ${postulante.nombre || 'N/A'} (DNI: ${postulante.dni || 'N/A'})
    
    ANEXOS DE EXPERIENCIA ESPECÍFICA:
    ${anexos.map(anexo => `
    - ${anexo.tipoAnexo}: ${anexo.nombreArchivo}
    - Datos: ${anexo.datosAdicionales || 'No disponible'}
    `).join('')}
    
    EVALÚA SEGÚN CRITERIOS CAS:
    
    1. CUMPLIMIENTO EXPERIENCIA ESPECÍFICA MÍNIMA (Base: 30 puntos)
       - Verifica experiencia específica en el área requerida
       - Si NO cumple mínimo específico: 0 puntos (CANCELATORIO)
       - Si SÍ cumple mínimo específico: 30 puntos base
    
    2. PUNTUACIÓN ADICIONAL POR EXPERIENCIA ESPECÍFICA EXTRA:
       - Más de 10 años específicos: +15 puntos
       - Más de 7 años y menor a 10 años: +12 puntos
       - Más de 5 años y menor a 7 años: +10 puntos
       - Más de 3 años y menor a 5 años: +8 puntos
       - Más de 2 años: +5 puntos
    
    RESPONDE EN FORMATO JSON:
    {
      "cumpleExperienciaEspecifica": true/false,
      "anosExperienciaEspecifica": número,
      "anosExperienciaEspecificaRequeridos": número,
      "puntuacionBase": 0 o 30,
      "experienciaEspecificaAdicional": {
        "anosAdicionales": número,
        "puntosAdicionales": número,
        "rango": "Más de X años"
      },
      "puntuacionTotal": número,
      "observaciones": "Detalles de experiencia específica",
      "documentosEvaluados": ["lista de documentos"],
      "razonesRechazo": ["si aplica"]
    }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const resultado = JSON.parse(completion.choices[0].message.content);
    
    return {
      fase: 3,
      nombre: "Verificación de Experiencia Específica",
      ...resultado,
      esCancelatorio: !resultado.cumpleExperienciaEspecifica
    };
  }

  /**
   * Calcular puntuación total según normativa CAS
   */
  static calcularPuntuacionTotal(fase1, fase2, fase3) {
    const puntuacionMinima = fase1.puntuacionBase + fase2.puntuacionBase + fase3.puntuacionBase;
    const puntuacionAdicional = 
      (fase1.formacionAdicional?.reduce((sum, item) => sum + item.puntosAdicionales, 0) || 0) +
      (fase2.experienciaAdicional?.puntosAdicionales || 0) +
      (fase3.experienciaEspecificaAdicional?.puntosAdicionales || 0);
    
    const puntuacionTotal = puntuacionMinima + puntuacionAdicional;
    
    return {
      puntuacionMinima,
      puntuacionAdicional,
      puntuacionTotal,
      cumpleMinimo: puntuacionMinima >= 70, // 20+20+30 = 70 mínimo
      estado: puntuacionMinima >= 70 ? 'APROBADO' : 'RECHAZADO'
    };
  }

  /**
   * Generar reporte detallado con razones específicas
   */
  static async generarReporteDetallado(datosEvaluacion) {
    const { convocatoria, postulante, evaluacionFase1, evaluacionFase2, evaluacionFase3, puntuacionTotal } = datosEvaluacion;
    
    const prompt = `
    GENERAR REPORTE DETALLADO DE EVALUACIÓN CAS
    
    INFORMACIÓN GENERAL:
    - Convocatoria: ${convocatoria.area} - ${convocatoria.puesto}
    - Postulante: ${postulante.nombre} (DNI: ${postulante.dni})
    - Fecha evaluación: ${new Date().toLocaleDateString('es-PE')}
    
    RESULTADOS POR FASE:
    
    FASE 1 - REQUISITOS ACADÉMICOS:
    - Cumple perfil mínimo: ${evaluacionFase1.cumplePerfilMinimo ? 'SÍ' : 'NO'}
    - Puntuación base: ${evaluacionFase1.puntuacionBase}/20
    - Formación adicional: ${evaluacionFase1.formacionAdicional?.length || 0} elementos
    - Puntuación total fase 1: ${evaluacionFase1.puntuacionTotal}
    - Observaciones: ${evaluacionFase1.observaciones}
    
    FASE 2 - EXPERIENCIA GENERAL:
    - Cumple experiencia mínima: ${evaluacionFase2.cumpleExperienciaMinima ? 'SÍ' : 'NO'}
    - Años calculados: ${evaluacionFase2.anosExperienciaCalculados}
    - Puntuación base: ${evaluacionFase2.puntuacionBase}/20
    - Experiencia adicional: ${evaluacionFase2.experienciaAdicional?.puntosAdicionales || 0} puntos
    - Puntuación total fase 2: ${evaluacionFase2.puntuacionTotal}
    - Observaciones: ${evaluacionFase2.observaciones}
    
    FASE 3 - EXPERIENCIA ESPECÍFICA:
    - Cumple experiencia específica: ${evaluacionFase3.cumpleExperienciaEspecifica ? 'SÍ' : 'NO'}
    - Años específicos: ${evaluacionFase3.anosExperienciaEspecifica}
    - Puntuación base: ${evaluacionFase3.puntuacionBase}/30
    - Experiencia específica adicional: ${evaluacionFase3.experienciaEspecificaAdicional?.puntosAdicionales || 0} puntos
    - Puntuación total fase 3: ${evaluacionFase3.puntuacionTotal}
    - Observaciones: ${evaluacionFase3.observaciones}
    
    PUNTUACIÓN FINAL:
    - Puntuación mínima: ${puntuacionTotal.puntuacionMinima}/70
    - Puntuación adicional: ${puntuacionTotal.puntuacionAdicional}
    - PUNTUACIÓN TOTAL: ${puntuacionTotal.puntuacionTotal}
    - ESTADO: ${puntuacionTotal.estado}
    
    GENERA UN REPORTE DETALLADO QUE INCLUYA:
    
    1. RESUMEN EJECUTIVO
    2. EVALUACIÓN DETALLADA POR FASE CON RAZONES ESPECÍFICAS
    3. ANÁLISIS DE DOCUMENTACIÓN PRESENTADA
    4. FORTALEZAS Y DEBILIDADES IDENTIFICADAS
    5. RECOMENDACIONES PARA EL COMITÉ EVALUADOR
    6. JUSTIFICACIÓN TÉCNICA DE LA DECISIÓN
    
    El reporte debe ser objetivo, detallado y conforme a la normativa CAS vigente.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    return completion.choices[0].message.content;
  }

  /**
   * Evaluar bonificaciones especiales (deportistas, discapacidad, etc.)
   */
  static async evaluarBonificacionesEspeciales(anexos, postulante) {
    const prompt = `
    EVALUACIÓN DE BONIFICACIONES ESPECIALES CAS
    
    POSTULANTE: ${postulante.nombre} (DNI: ${postulante.dni})
    
    ANEXOS PARA BONIFICACIONES:
    ${anexos.map(anexo => `
    - ${anexo.tipoAnexo}: ${anexo.nombreArchivo}
    - Datos: ${anexo.datosAdicionales || 'No disponible'}
    `).join('')}
    
    EVALÚA SEGÚN TABLA DE DEPORTISTAS CAS:
    
    NIVEL 1: Deportistas Juegos Olímpicos/Mundiales (5 primeros puestos) - 20%
    NIVEL 2: Deportistas Panamericanos (3 primeros lugares) - 16%
    NIVEL 3: Deportistas Sudamericanos (oro/plata) - 12%
    NIVEL 4: Deportistas Sudamericanos (bronce) o Bolivarianos (oro/plata) - 8%
    NIVEL 5: Deportistas Bolivarianos (bronce) o récords nacionales - 4%
    
    RESPONDE EN FORMATO JSON:
    {
      "esDeportista": true/false,
      "nivelDeportista": 1/2/3/4/5 o null,
      "porcentajeBonificacion": número,
      "descripcionLogro": "descripción específica",
      "tieneDiscapacidad": true/false,
      "porcentajeDiscapacidad": número,
      "bonificacionesAplicables": [
        {
          "tipo": "deportista/discapacidad",
          "porcentaje": número,
          "descripcion": "descripción"
        }
      ],
      "observaciones": "detalles de bonificaciones"
    }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    return JSON.parse(completion.choices[0].message.content);
  }
}

export default CASEvaluationService;
