import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analizarConvocatoriaYAnexos(datos) {
  const prompt = `
Analiza la siguiente información:
- Convocatoria: ${JSON.stringify(datos.convocatoria)}
- Documentos y anexos del postulante: ${JSON.stringify(datos.anexos)}

Compara los requisitos exigidos con los documentos presentados.

Genera un reporte estructurado así:
1️⃣ Requisitos cumplidos (detalla cuáles y evidencia).
2️⃣ Requisitos faltantes (detalla cuáles).
3️⃣ Observaciones del análisis.
4️⃣ Bonificaciones aplicables (según discapacidad, licenciado o deportista).
5️⃣ Nivel de cumplimiento general (Aprobado, Parcial o Rechazado).
6️⃣ Recomendación final para el comité.

Sé claro, objetivo y legal conforme a las normas establecidas.
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message.content;
}

// Nueva función para analizar todos los anexos de un postulante
// Ahora soporta análisis de CV mediante URLs y análisis de reglas y bonos
export async function analizarTodosLosAnexos(datosCompletos) {
  const { convocatoria, anexos, curriculum, postulante, incluirCV, incluirReglasBonos, reglasAplicadas, bonosAplicados } = datosCompletos;
  
  // Preparar información detallada de los anexos con todos los datos disponibles
  console.log(`📋 Preparando ${anexos.length} anexos para el prompt de IA...`);
  
  const anexosDetallados = anexos.map((anexo, idx) => {
    // Asegurar que todos los campos sean arrays válidos
    const formacionAcademica = Array.isArray(anexo.formacionAcademica) ? anexo.formacionAcademica : (anexo.formacionAcademica ? [anexo.formacionAcademica] : []);
    const especializacion = Array.isArray(anexo.especializacion) ? anexo.especializacion : (anexo.especializacion ? [anexo.especializacion] : []);
    const experienciaLaboral = Array.isArray(anexo.experienciaLaboral) ? anexo.experienciaLaboral : (anexo.experienciaLaboral ? [anexo.experienciaLaboral] : []);
    const referenciasLaborales = Array.isArray(anexo.referenciasLaborales) ? anexo.referenciasLaborales : (anexo.referenciasLaborales ? [anexo.referenciasLaborales] : []);
    const idiomas = Array.isArray(anexo.idiomas) ? anexo.idiomas : (anexo.idiomas ? [anexo.idiomas] : []);
    const ofimatica = Array.isArray(anexo.ofimatica) ? anexo.ofimatica : (anexo.ofimatica ? [anexo.ofimatica] : []);
    const familiares = Array.isArray(anexo.familiares) ? anexo.familiares : (anexo.familiares ? [anexo.familiares] : []);
    
    // Log para debugging
    console.log(`   Anexo ${idx + 1} (ID: ${anexo.IDANEXO}):`);
    console.log(`     - Formación Académica: ${formacionAcademica.length} registros`);
    console.log(`     - Experiencia Laboral: ${experienciaLaboral.length} registros`);
    console.log(`     - Idiomas: ${idiomas.length} registros`);
    console.log(`     - Familiares: ${familiares.length} registros`);
    console.log(`     - Colegio Profesional: ${anexo.colegioProfesional || 'N/A'}`);
    
    const anexoDetallado = {
      tipo: anexo.tipoAnexo || 'Anexo 01',
      nombre: anexo.nombreArchivo || `Anexo_${anexo.IDANEXO}`,
      postulante: anexo.nombrePostulante || `${postulante.nombreCompleto || 'N/A'}`,
      dni: anexo.dniPostulante || postulante.documento || 'N/A',
      IDANEXO: anexo.IDANEXO,
      // Datos personales completos
      datosPersonales: {
        codigo: anexo.codigo || null,
        nombrePuesto: anexo.nombrePuesto || null,
        tipoDocumento: anexo.tipoDocumento || 'DNI',
        carnetExtranjeria: anexo.carnetExtranjeria || null,
        genero: anexo.genero || null,
        direccion: anexo.direccion || null,
        departamento: anexo.departamento || null,
        provincia: anexo.provincia || null,
        distrito: anexo.distrito || null,
        referenciaDireccion: anexo.referenciaDireccion || null,
        fechaNacimiento: anexo.fechaNacimiento || null,
        lugarNacimiento: anexo.lugarNacimiento || null,
        lugarNacimientoDepartamento: anexo.lugarNacimientoDepartamento || null,
        lugarNacimientoProvincia: anexo.lugarNacimientoProvincia || null,
        lugarNacimientoDistrito: anexo.lugarNacimientoDistrito || null,
        correoElectronico: anexo.correoElectronico || null,
        telefonoDomicilio: anexo.telefonoDomicilio || null,
        telefonoCelular1: anexo.telefonoCelular1 || null,
        telefonoCelular2: anexo.telefonoCelular2 || null,
        correoElectronicoAlterno: anexo.correoElectronicoAlterno || null,
        // Bonificaciones
        conadis: anexo.conadis || 'NO',
        nCarnetConadis: anexo.nCarnetConadis || null,
        codigoConadis: anexo.codigoConadis || null,
        fuerzasArmadas: anexo.fuerzasArmadas || 'NO',
        nCarnetFuerzasArmadas: anexo.nCarnetFuerzasArmadas || null,
        codigoFuerzasArmadas: anexo.codigoFuerzasArmadas || null,
        asistenciaEspecial: anexo.asistenciaEspecial || null,
        // Tiempos de experiencia
        tiempoSectorPublico: anexo.tiempoSectorPublico || null,
        tiempoSectorPrivado: anexo.tiempoSectorPrivado || null,
        numeroCas: anexo.numeroCas || null
      },
      // Datos académicos
      formacionAcademica: formacionAcademica,
      especializacion: especializacion,
      // Experiencia
      experienciaLaboral: experienciaLaboral,
      referenciasLaborales: referenciasLaborales,
      // Habilidades
      idiomas: idiomas,
      ofimatica: ofimatica,
      // Familiares en sector público
      familiares: familiares,
      // Colegio Profesional
      colegioProfesional: anexo.colegioProfesional || null,
      colegioProfesionalHabilitado: anexo.colegioProfesionalHabilitado || 'NO',
      nColegiatura: anexo.nColegiatura || null,
      fechaVencimientoColegiatura: anexo.fechaVencimientoColegiatura || null,
      // Declaraciones
      declaraciones: anexo.declaraciones || {}
    };
    
    return anexoDetallado;
  });
  
  // Log de resumen
  const totalFormacion = anexosDetallados.reduce((sum, a) => sum + a.formacionAcademica.length, 0);
  const totalExperiencia = anexosDetallados.reduce((sum, a) => sum + a.experienciaLaboral.length, 0);
  console.log(`✅ Resumen: ${totalFormacion} títulos, ${totalExperiencia} experiencias laborales`);

  const prompt = `
REGLAS OBLIGATORIAS:
1. MÁXIMO 500 PALABRAS TOTAL - Serás penalizado si excedes
2. Solo escribe: REQUERIDO → PRESENTADO → ✅/❌
3. NO expliques, NO repitas, NO des detalles innecesarios
4. Una línea por requisito
5. Veredicto final en 2 líneas máximo

Candidato:

📋 INFORMACIÓN DE LA CONVOCATORIA (Verifica todos los requisitos):
- Área: ${convocatoria.area || 'No especificado'}
- Puesto: ${convocatoria.puesto || 'No especificado'}
- Sueldo: ${convocatoria.sueldo || 'No especificado'}
- Requisitos: ${convocatoria.requisitos || 'No especificado'}
- Experiencia requerida: ${convocatoria.experiencia || 'No especificado'}
- Años de experiencia pública (mínimo): ${convocatoria.expPublicaMin || 'No especificado'}
- Años de experiencia pública (máximo): ${convocatoria.expPublicaMax || 'No especificado'}
- Título profesional o académico requerido: ${convocatoria.licenciatura || 'No especificado'}
- Habilidades requeridas: ${convocatoria.habilidades || 'No especificado'}
- Número CAS: ${convocatoria.numero_cas || 'No especificado'}

👤 INFORMACIÓN DEL POSTULANTE:
- ID: ${postulante.id}
- Total de anexos presentados: ${postulante.totalAnexos}

📄 ANEXOS PRESENTADOS (DETALLE COMPLETO):
${anexosDetallados.map((anexo, index) => {
  let detalles = `
${index + 1}. ${anexo.tipo} - ${anexo.nombre} (ID: ${anexo.IDANEXO})
   - Postulante: ${anexo.postulante}
   - DNI: ${anexo.dni}`;

  // Formación Académica
  if (anexo.formacionAcademica && anexo.formacionAcademica.length > 0) {
    detalles += `\n   - Formación Académica (${anexo.formacionAcademica.length} registro(s)):`;
    anexo.formacionAcademica.forEach((fa, i) => {
      // Asegurar que fa sea un objeto válido
      if (fa && typeof fa === 'object') {
        detalles += `\n     ${i + 1}. ${fa.nombreInstitucion || fa.institucion || 'N/A'} - ${fa.tipoGrado || fa.grado || 'N/A'} ${fa.nombreGrado || fa.titulo || fa.carrera || ''} (${fa.fechaInicio || fa.fechaInicioGrado || 'N/A'} - ${fa.fechaFin || fa.fechaFinGrado || 'Actual'})`;
        if (fa.situacion) detalles += ` [${fa.situacion}]`;
      } else {
        detalles += `\n     ${i + 1}. ${JSON.stringify(fa)}`;
      }
    });
  } else {
    // Si no hay formación académica, indicarlo explícitamente
    detalles += `\n   - Formación Académica: NO REGISTRADA (array vacío o null)`;
  }

  // Especialización
  if (anexo.especializacion && anexo.especializacion.length > 0) {
    detalles += `\n   - Especializaciones (${anexo.especializacion.length} registro(s)):`;
    anexo.especializacion.forEach((esp, i) => {
      detalles += `\n     ${i + 1}. ${esp.nombreEspecializacion || 'N/A'} - ${esp.institucion || 'N/A'} (${esp.fechaInicio || 'N/A'} - ${esp.fechaFin || 'N/A'})`;
    });
  }

  // Experiencia Laboral
  if (anexo.experienciaLaboral && anexo.experienciaLaboral.length > 0) {
    detalles += `\n   - Experiencia Laboral (${anexo.experienciaLaboral.length} registro(s)):`;
    anexo.experienciaLaboral.forEach((exp, i) => {
      // Asegurar que exp sea un objeto válido
      if (exp && typeof exp === 'object') {
        const fechaInicio = exp.fechaInicio || exp.fechaInicioTrabajo || 'N/A';
        const fechaFin = exp.fechaFin || exp.fechaFinTrabajo || exp.hasta || 'Actual';
        const añosExp = exp.añosExperiencia || exp.annosExperiencia || exp.años || 'N/A';
        const empresa = exp.empresaEntidad || exp.empresa || exp.entidad || 'N/A';
        const cargo = exp.cargoPostulante || exp.cargo || exp.puesto || 'N/A';
        detalles += `\n     ${i + 1}. ${empresa} - ${cargo} (${fechaInicio} - ${fechaFin}, ${añosExp} año(s))`;
        if (exp.sectorPublico === 'SÍ' || exp.sectorPublico === true || exp.sector === 'Público') {
          detalles += ` [SECTOR PÚBLICO]`;
        }
        if (exp.funciones) detalles += `\n        Funciones: ${exp.funciones}`;
      } else {
        detalles += `\n     ${i + 1}. ${JSON.stringify(exp)}`;
      }
    });
  } else {
    // Si no hay experiencia laboral, indicarlo explícitamente
    detalles += `\n   - Experiencia Laboral: NO REGISTRADA (array vacío o null)`;
  }

  // Referencias Laborales
  if (anexo.referenciasLaborales && anexo.referenciasLaborales.length > 0) {
    detalles += `\n   - Referencias Laborales (${anexo.referenciasLaborales.length} registro(s)):`;
    anexo.referenciasLaborales.forEach((ref, i) => {
      detalles += `\n     ${i + 1}. ${ref.empresaEntidad || 'N/A'} - ${ref.cargoPostulante || 'N/A'} (Contacto: ${ref.telefonos || 'N/A'})`;
    });
  }

  // Idiomas
  if (anexo.idiomas && anexo.idiomas.length > 0) {
    detalles += `\n   - Idiomas (${anexo.idiomas.length} registro(s)):`;
    anexo.idiomas.forEach((idioma, i) => {
      detalles += `\n     ${i + 1}. ${idioma.idioma || 'N/A'} - ${idioma.nivel || 'N/A'}`;
    });
  }

  // Ofimática
  if (anexo.ofimatica && anexo.ofimatica.length > 0) {
    detalles += `\n   - Conocimientos de Ofimática (${anexo.ofimatica.length} registro(s)):`;
    anexo.ofimatica.forEach((ofi, i) => {
      detalles += `\n     ${i + 1}. ${ofi.programa || 'N/A'} - ${ofi.nivel || 'N/A'}`;
    });
  }

  // Datos Personales Completos
  if (anexo.datosPersonales) {
    const dp = anexo.datosPersonales;
    detalles += `\n   - Datos Personales:`;
    if (dp.codigo) detalles += `\n     • Código: ${dp.codigo}`;
    if (dp.nombrePuesto) detalles += `\n     • Puesto al que postula: ${dp.nombrePuesto}`;
    if (dp.genero) detalles += `\n     • Género: ${dp.genero}`;
    if (dp.fechaNacimiento) detalles += `\n     • Fecha de Nacimiento: ${dp.fechaNacimiento}`;
    if (dp.lugarNacimiento) detalles += `\n     • Lugar de Nacimiento: ${dp.lugarNacimiento}`;
    if (dp.direccion) detalles += `\n     • Dirección: ${dp.direccion}`;
    if (dp.departamento || dp.provincia || dp.distrito) {
      detalles += `\n     • Ubicación: ${dp.distrito || ''} ${dp.provincia || ''} ${dp.departamento || ''}`.trim();
    }
    if (dp.correoElectronico) detalles += `\n     • Email: ${dp.correoElectronico}`;
    if (dp.correoElectronicoAlterno) detalles += `\n     • Email Alterno: ${dp.correoElectronicoAlterno}`;
    if (dp.telefonoCelular1) detalles += `\n     • Celular: ${dp.telefonoCelular1}`;
    if (dp.telefonoCelular2) detalles += `\n     • Celular 2: ${dp.telefonoCelular2}`;
    if (dp.telefonoDomicilio) detalles += `\n     • Teléfono Fijo: ${dp.telefonoDomicilio}`;
    
    // Bonificaciones especiales
    if (dp.conadis === 'SI') {
      detalles += `\n     • ⭐ CONADIS: SÍ (Carnet: ${dp.nCarnetConadis || 'N/A'}, Código: ${dp.codigoConadis || 'N/A'})`;
    }
    if (dp.fuerzasArmadas === 'SI') {
      detalles += `\n     • ⭐ Fuerzas Armadas: SÍ (Carnet: ${dp.nCarnetFuerzasArmadas || 'N/A'}, Código: ${dp.codigoFuerzasArmadas || 'N/A'})`;
    }
    if (dp.asistenciaEspecial) {
      detalles += `\n     • Asistencia Especial Requerida: ${dp.asistenciaEspecial}`;
    }
    
    // Tiempos de experiencia
    if (dp.tiempoSectorPublico) detalles += `\n     • Tiempo en Sector Público: ${dp.tiempoSectorPublico}`;
    if (dp.tiempoSectorPrivado) detalles += `\n     • Tiempo en Sector Privado: ${dp.tiempoSectorPrivado}`;
    if (dp.numeroCas) detalles += `\n     • Número CAS: ${dp.numeroCas}`;
  }

  // Familiares en Sector Público
  if (anexo.familiares && anexo.familiares.length > 0) {
    detalles += `\n   - Familiares en Sector Público (${anexo.familiares.length} registro(s)):`;
    anexo.familiares.forEach((fam, i) => {
      if (fam && typeof fam === 'object') {
        detalles += `\n     ${i + 1}. ${fam.nombres || ''} ${fam.apellidos || ''} - ${fam.gradoParentesco || 'N/A'}`;
        if (fam.areaTrabajo) detalles += ` (Área: ${fam.areaTrabajo})`;
      }
    });
  }

  // Colegio Profesional
  if (anexo.colegioProfesional) {
    detalles += `\n   - Colegio Profesional: ${anexo.colegioProfesional}`;
    if (anexo.colegioProfesionalHabilitado === 'SI') {
      detalles += ` (✅ Habilitado) - N° Colegiatura: ${anexo.nColegiatura || 'N/A'}`;
      if (anexo.fechaVencimientoColegiatura) {
        detalles += ` - Vencimiento: ${anexo.fechaVencimientoColegiatura}`;
      }
    } else {
      detalles += ` (❌ No habilitado)`;
    }
  }

  // Declaraciones Juradas
  if (anexo.declaraciones && Object.keys(anexo.declaraciones).length > 0) {
    detalles += `\n   - Declaraciones Juradas:`;
    const decl = anexo.declaraciones;
    if (decl.infoVerdadera) detalles += `\n     ✓ Información Verdadera`;
    if (decl.leyProteccionDatos) detalles += `\n     ✓ Ley de Protección de Datos`;
    if (decl.cumploRequisitosMinimos) detalles += `\n     ✓ Cumple Requisitos Mínimos`;
    if (decl.plenosDerechosCiviles) detalles += `\n     ✓ Plenos Derechos Civiles`;
    if (decl.noCondenaDolosa) detalles += `\n     ✓ No Condena Dolosa`;
    if (decl.noInhabilitacion) detalles += `\n     ✓ No Inhabilitación`;
    
    // Verificar declaraciones faltantes
    const faltantes = [];
    if (!decl.infoVerdadera) faltantes.push('Información Verdadera');
    if (!decl.leyProteccionDatos) faltantes.push('Ley de Protección de Datos');
    if (!decl.cumploRequisitosMinimos) faltantes.push('Cumple Requisitos Mínimos');
    if (faltantes.length > 0) {
      detalles += `\n     ⚠ Declaraciones faltantes: ${faltantes.join(', ')}`;
    }
  }

  return detalles;
}).join('\n\n')}

📚 CURRÍCULUM VITAE:
${curriculum ? (
  curriculum.desdeURL 
    ? `- Archivo: ${curriculum.nombreArchivo} (Descargado desde URL: ${curriculum.url || 'N/A'})\n- Tamaño: ${curriculum.pdfFile ? (curriculum.pdfFile.length / 1024).toFixed(2) + ' KB' : 'N/A'}\n- NOTA: El CV ha sido descargado y está disponible para análisis`
    : `- Archivo: ${curriculum.nombreArchivo} (${curriculum.tipoArchivo})`
) : 'No disponible'}
${incluirCV && curriculum ? '\n- ANÁLISIS DE CV: Incluir análisis detallado del currículum vitae en la evaluación' : ''}

IMPORTANTE: Genera un reporte VISUAL Y RESUMIDO con checkmarks.

FORMATO OBLIGATORIO (MÁXIMO 400 PALABRAS):

═══════════════════════════════════════
📋 EVALUACIÓN DE REQUISITOS
═══════════════════════════════════════

${convocatoria.requisitos ? `✓ Requisitos Generales:\n  ${convocatoria.requisitos}\n  → Presenta: [describir brevemente] [✅/❌]\n` : ''}
${convocatoria.experiencia ? `✓ Experiencia Total:\n  Requerido: ${convocatoria.experiencia}\n  → Presenta: [X años] [✅/❌]\n` : ''}
${convocatoria.expPublicaMin ? `✓ Experiencia Pública:\n  Requerido: ${convocatoria.expPublicaMin}-${convocatoria.expPublicaMax || 'N/A'} años\n  → Presenta: [X años] [✅/❌]\n` : ''}
${convocatoria.licenciatura ? `✓ Título Profesional:\n  Requerido: ${convocatoria.licenciatura}\n  → Presenta: [título] [✅/❌]\n` : ''}
${convocatoria.habilidades ? `✓ Habilidades:\n  Requerido: ${convocatoria.habilidades}\n  → Presenta: [habilidades] [✅/❌]\n` : ''}
${convocatoria.requiereColegiatura === 'si' ? `✓ Colegiatura:\n  Requerido: Sí\n  → Presenta: [colegio + vigencia] [✅/❌]\n` : ''}

CUMPLIMIENTO: [X/Y requisitos] ([X]%)

═══════════════════════════════════════
🎁 BONIFICACIONES
═══════════════════════════════════════

${incluirReglasBonos && bonosAplicados && Array.isArray(bonosAplicados) && bonosAplicados.length > 0 ? 
  bonosAplicados.map(b => `✓ ${b.tipo}: +${b.puntos} puntos [✅]`).join('\n') : 
  `✓ CONADIS: [✅/❌]\n✓ Licenciado FF.AA.: [✅/❌]\n✓ Deportista Calificado: [✅/❌]`}

TOTAL BONOS: +[X] puntos

═══════════════════════════════════════
💼 HABILIDADES IDENTIFICADAS
═══════════════════════════════════════

IMPORTANTE: Lista 5-8 habilidades clave del postulante basadas en:
- Experiencia laboral presentada
- Formación académica
- Conocimientos de ofimática e idiomas
- Habilidades requeridas en la convocatoria

Formato: Lista simple separada por comas
Ejemplo: Trabajo en equipo, Liderazgo, Excel avanzado, Comunicación efectiva, Gestión de proyectos

Habilidades: [listar 5-8 habilidades separadas por comas]

═══════════════════════════════════════
📄 DOCUMENTACIÓN
═══════════════════════════════════════

✓ Declaraciones Juradas: [✅ Completas / ❌ Faltan: X]
✓ Nepotismo: [✅ Sin conflicto / ⚠️ Revisar / ❌ Conflicto]
✓ Documentos Adjuntos: [✅ Completos / ⚠️ Revisar]

═══════════════════════════════════════
⚖️ VEREDICTO FINAL
═══════════════════════════════════════

Estado: [✅ APTO / ⚠️ OBSERVADO / ❌ NO APTO]
Puntaje Base: [X/100]${incluirReglasBonos && bonosAplicados && Array.isArray(bonosAplicados) && bonosAplicados.length > 0 ? `\nBonificación: +${bonosAplicados.reduce((sum, b) => sum + (b.puntos || 0), 0)}` : ''}
Puntaje Final: [X/100]

Razón Principal: [1 línea explicando el veredicto]

Recomendación: [APROBAR / REVISAR MANUALMENTE / RECHAZAR]

═══════════════════════════════════════








`;

  try {
    console.log('🤖 Iniciando análisis con OpenAI para postulante:', postulante.id);
    console.log('📊 Datos enviados:', {
      convocatoria: convocatoria.puesto,
      anexosCount: anexos.length,
      tieneCurriculum: !!curriculum,
      totalAnexos: postulante.totalAnexos
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "Eres un evaluador experto. Genera reportes VISUALES Y RESUMIDOS usando checkmarks (✅/❌/⚠️). Máximo 400 palabras. Formato: REQUERIDO → PRESENTA: [descripción breve] [✅/❌]. Sé directo y objetivo." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.1, // Muy baja para respuestas directas
      max_tokens: 800, // Muy reducido para forzar concisión
    });

    const respuesta = completion.choices[0].message.content;
    console.log('✅ Análisis de OpenAI completado. Longitud del reporte:', respuesta?.length || 0, 'caracteres');
    
    return respuesta;
  } catch (error) {
    console.error('❌ Error en análisis de OpenAI:', error);
    // Retornar análisis básico si falla OpenAI
    return `Error al generar análisis automático: ${error.message}. 
    
RESUMEN MANUAL:
- Postulante: ${postulante.nombreCompleto || 'N/A'}
- Total de anexos: ${anexos.length}
- Convocatoria: ${convocatoria.puesto || 'N/A'}
- Requisitos: ${convocatoria.requisitos || 'No especificado'}

NOTA: Se requiere revisión manual debido a error en el análisis automático.`;
  }
}