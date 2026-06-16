/**
 * Módulo de Validación Automática de Postulaciones
 * Valida si un postulante cumple con los requisitos de una convocatoria
 */

import { pool } from '../database/conexion.js';

/**
 * Valida si un postulante cumple con los requisitos de una convocatoria
 * @param {number} idUsuario - ID del usuario postulante
 * @param {number} idConvocatoria - ID de la convocatoria
 * @returns {Object} - Resultado de la validación con detalles
 */
export async function validarPostulanteContraConvocatoria(idUsuario, idConvocatoria) {
  try {
    // Obtener datos de la convocatoria
    const [convocatorias] = await pool.execute(
      `SELECT * FROM convocatorias WHERE IDCONVOCATORIA = ?`,
      [idConvocatoria]
    );

    if (convocatorias.length === 0) {
      return {
        cumpleRequisitos: false,
        mensaje: 'Convocatoria no encontrada',
        detalles: []
      };
    }

    const convocatoria = convocatorias[0];

    // Obtener datos del usuario/postulante
    const [usuarios] = await pool.execute(
      `SELECT * FROM usuarios WHERE IDUSUARIO = ?`,
      [idUsuario]
    );

    if (usuarios.length === 0) {
      return {
        cumpleRequisitos: false,
        mensaje: 'Usuario no encontrado',
        detalles: []
      };
    }

    const usuario = usuarios[0];

    // Array para almacenar los resultados de cada validación
    const validaciones = [];
    let cumpleTodos = true;

    // 1. Validar Título Profesional
    if (convocatoria.tituloProfesional === 'Sí') {
      const tieneTitulo = usuario.tituloProfesional === 'Sí' || 
                          usuario.tieneTitulo === true ||
                          usuario.nivelEducativo === 'Universitario' ||
                          usuario.nivelEducativo === 'Técnica Superior';
      
      validaciones.push({
        criterio: 'Título Profesional',
        requerido: 'Sí',
        cumple: tieneTitulo,
        valorUsuario: usuario.tituloProfesional || usuario.nivelEducativo || 'No especificado'
      });

      if (!tieneTitulo) cumpleTodos = false;
    }

    // 2. Validar Colegiatura
    if (convocatoria.requiereColegiatura === 'si' || convocatoria.colegiaturaProfesional === 'si') {
      const tieneColegiatura = usuario.colegiatura === 'si' || 
                               usuario.tieneColegiatura === true ||
                               usuario.colegiado === 'Sí';
      
      validaciones.push({
        criterio: 'Colegiatura',
        requerido: 'Sí',
        cumple: tieneColegiatura,
        valorUsuario: usuario.colegiatura || usuario.colegiado || 'No especificado'
      });

      if (!tieneColegiatura) cumpleTodos = false;
    }

    // 3. Validar Habilitación Profesional
    if (convocatoria.requiereHabilitacion === 'si') {
      const tieneHabilitacion = usuario.habilitacion === 'si' || 
                                usuario.tieneHabilitacion === true ||
                                usuario.habilitado === 'Sí';
      
      validaciones.push({
        criterio: 'Habilitación Profesional',
        requerido: 'Sí',
        cumple: tieneHabilitacion,
        valorUsuario: usuario.habilitacion || usuario.habilitado || 'No especificado'
      });

      if (!tieneHabilitacion) cumpleTodos = false;
    }

    // 4. Validar Experiencia Laboral (años totales)
    if (convocatoria.experienciaTotal || convocatoria.experiencia) {
      const experienciaRequerida = parseFloat(convocatoria.experienciaTotal || convocatoria.experiencia || '0');
      const experienciaUsuario = parseFloat(usuario.experienciaLaboral || usuario.anosExperiencia || '0');
      
      const cumpleExperiencia = experienciaUsuario >= experienciaRequerida;
      
      validaciones.push({
        criterio: 'Experiencia Laboral',
        requerido: `${experienciaRequerida} años`,
        cumple: cumpleExperiencia,
        valorUsuario: `${experienciaUsuario} años`
      });

      if (!cumpleExperiencia) cumpleTodos = false;
    }

    // 5. Validar Nivel Educativo
    if (convocatoria.formacionNivel) {
      try {
        const nivelesRequeridos = typeof convocatoria.formacionNivel === 'string' 
          ? JSON.parse(convocatoria.formacionNivel) 
          : convocatoria.formacionNivel;
        
        if (Array.isArray(nivelesRequeridos) && nivelesRequeridos.length > 0) {
          const nivelUsuario = usuario.nivelEducativo || usuario.formacionNivel || '';
          const cumpleNivel = nivelesRequeridos.some(nivel => 
            nivelUsuario.toLowerCase().includes(nivel.toLowerCase())
          );
          
          validaciones.push({
            criterio: 'Nivel Educativo',
            requerido: nivelesRequeridos.join(' o '),
            cumple: cumpleNivel,
            valorUsuario: nivelUsuario || 'No especificado'
          });

          if (!cumpleNivel) cumpleTodos = false;
        }
      } catch (error) {
        console.warn('Error al parsear formacionNivel:', error);
      }
    }

    // 6. Validar Conocimientos de Ofimática (opcional - solo informativo)
    if (convocatoria.conocimientosOfimatica) {
      const tieneOfimatica = usuario.conocimientosOfimatica || usuario.habilidadesOfimatica;
      
      validaciones.push({
        criterio: 'Conocimientos de Ofimática',
        requerido: convocatoria.conocimientosOfimatica.substring(0, 50) + '...',
        cumple: !!tieneOfimatica,
        valorUsuario: tieneOfimatica ? 'Especificado' : 'No especificado',
        esOpcional: true
      });
    }

    // 7. Validar Idiomas (opcional - solo informativo)
    if (convocatoria.conocimientosIdiomas) {
      const tieneIdiomas = usuario.conocimientosIdiomas || usuario.idiomas;
      
      validaciones.push({
        criterio: 'Conocimientos de Idiomas',
        requerido: convocatoria.conocimientosIdiomas.substring(0, 50) + '...',
        cumple: !!tieneIdiomas,
        valorUsuario: tieneIdiomas ? 'Especificado' : 'No especificado',
        esOpcional: true
      });
    }

    // Generar mensaje de resultado
    const requisitosObligatorios = validaciones.filter(v => !v.esOpcional);
    const requisitosIncumplidos = requisitosObligatorios.filter(v => !v.cumple);
    
    let mensaje = '';
    if (cumpleTodos) {
      mensaje = '✅ El postulante cumple con todos los requisitos obligatorios de la convocatoria';
    } else {
      mensaje = `❌ El postulante NO cumple con ${requisitosIncumplidos.length} requisito(s) obligatorio(s)`;
    }

    return {
      cumpleRequisitos: cumpleTodos,
      mensaje,
      detalles: validaciones,
      resumen: {
        totalRequisitos: requisitosObligatorios.length,
        requisitosC umplidos: requisitosObligatorios.filter(v => v.cumple).length,
        requisitosIncumplidos: requisitosIncumplidos.length
      }
    };

  } catch (error) {
    console.error('Error en validación automática:', error);
    return {
      cumpleRequisitos: false,
      mensaje: 'Error al validar requisitos',
      detalles: [],
      error: error.message
    };
  }
}

/**
 * Obtiene un resumen de validación para mostrar al usuario
 * @param {Object} resultadoValidacion - Resultado de validarPostulanteContraConvocatoria
 * @returns {string} - Mensaje formateado para el usuario
 */
export function generarMensajeValidacion(resultadoValidacion) {
  if (!resultadoValidacion || !resultadoValidacion.detalles) {
    return 'No se pudo validar los requisitos';
  }

  let mensaje = resultadoValidacion.mensaje + '\n\n';
  
  const requisitosObligatorios = resultadoValidacion.detalles.filter(v => !v.esOpcional);
  
  if (requisitosObligatorios.length > 0) {
    mensaje += 'Requisitos Obligatorios:\n';
    requisitosObligatorios.forEach(v => {
      const icono = v.cumple ? '✅' : '❌';
      mensaje += `${icono} ${v.criterio}: ${v.requerido}\n`;
      if (!v.cumple) {
        mensaje += `   Tu perfil: ${v.valorUsuario}\n`;
      }
    });
  }

  const requisitosOpcionales = resultadoValidacion.detalles.filter(v => v.esOpcional);
  if (requisitosOpcionales.length > 0) {
    mensaje += '\nRequisitos Opcionales/Deseables:\n';
    requisitosOpcionales.forEach(v => {
      const icono = v.cumple ? '✅' : 'ℹ️';
      mensaje += `${icono} ${v.criterio}\n`;
    });
  }

  return mensaje;
}
