-- ============================================================
-- DIAGNÓSTICO COMPLETO DEL SISTEMA DE COMITÉ
-- ============================================================

-- 1. Ver usuarios del comité y sus grupos
SELECT 
  u.IDUSUARIO,
  u.nombreCompleto,
  u.correo,
  u.rol,
  u.estado,
  gcu.IDGRUPO,
  gc.nombre as nombreGrupo
FROM usuarios u
LEFT JOIN grupos_comite_usuarios gcu ON u.IDUSUARIO = gcu.IDUSUARIO
LEFT JOIN grupos_comite gc ON gcu.IDGRUPO = gc.IDGRUPO
WHERE LOWER(u.rol) = 'comite'
ORDER BY u.IDUSUARIO;

-- 2. Ver convocatorias asignadas a cada grupo
SELECT 
  gc.IDGRUPO,
  gc.nombre as nombreGrupo,
  COUNT(gcc.IDCONVOCATORIA) as totalConvocatorias,
  GROUP_CONCAT(c.puesto SEPARATOR ', ') as convocatorias
FROM grupos_comite gc
LEFT JOIN grupos_comite_convocatorias gcc ON gc.IDGRUPO = gcc.IDGRUPO
LEFT JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
GROUP BY gc.IDGRUPO, gc.nombre
ORDER BY gc.IDGRUPO;

-- 3. Ver usuarios del comité CON sus convocatorias
SELECT 
  u.IDUSUARIO,
  u.nombreCompleto,
  u.correo,
  gc.IDGRUPO,
  gc.nombre as nombreGrupo,
  COUNT(DISTINCT gcc.IDCONVOCATORIA) as totalConvocatorias,
  GROUP_CONCAT(DISTINCT c.puesto SEPARATOR ', ') as convocatorias
FROM usuarios u
INNER JOIN grupos_comite_usuarios gcu ON u.IDUSUARIO = gcu.IDUSUARIO
INNER JOIN grupos_comite gc ON gcu.IDGRUPO = gc.IDGRUPO
LEFT JOIN grupos_comite_convocatorias gcc ON gc.IDGRUPO = gcc.IDGRUPO
LEFT JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
WHERE LOWER(u.rol) = 'comite'
GROUP BY u.IDUSUARIO, u.nombreCompleto, u.correo, gc.IDGRUPO, gc.nombre
ORDER BY u.IDUSUARIO;

-- 4. Ver convocatorias publicadas disponibles
SELECT 
  IDCONVOCATORIA,
  puesto,
  numeroCAS,
  area,
  estado,
  publicada,
  fechaInicio,
  fechaFin
FROM convocatorias
WHERE estado IN ('Publicada', 'publicada', 'Activo', 'activo', 'Activa', 'activa')
   OR publicada = 1
   OR publicada = TRUE
ORDER BY IDCONVOCATORIA;

-- ============================================================
-- SOLUCIÓN: ASIGNAR CONVOCATORIAS AL GRUPO 1 (Administración)
-- ============================================================

-- Ejemplo: Asignar la convocatoria 1 al grupo 1
-- Descomenta y ejecuta esta línea si necesitas asignar:
-- INSERT INTO grupos_comite_convocatorias (IDGRUPO, IDCONVOCATORIA)
-- VALUES (1, 1);

-- Asignar múltiples convocatorias al grupo 1:
-- INSERT INTO grupos_comite_convocatorias (IDGRUPO, IDCONVOCATORIA)
-- SELECT 1, IDCONVOCATORIA 
-- FROM convocatorias 
-- WHERE estado IN ('Publicada', 'Activo', 'Activa')
--    OR publicada = 1
-- LIMIT 5;

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================

-- Ver el resultado completo después de asignar
SELECT 
  'Usuario' as tipo,
  u.nombreCompleto as nombre,
  u.correo,
  gc.nombre as grupo,
  COUNT(DISTINCT gcc.IDCONVOCATORIA) as convocatorias
FROM usuarios u
INNER JOIN grupos_comite_usuarios gcu ON u.IDUSUARIO = gcu.IDUSUARIO
INNER JOIN grupos_comite gc ON gcu.IDGRUPO = gc.IDGRUPO
LEFT JOIN grupos_comite_convocatorias gcc ON gc.IDGRUPO = gcc.IDGRUPO
WHERE LOWER(u.rol) = 'comite'
GROUP BY u.IDUSUARIO, u.nombreCompleto, u.correo, gc.nombre
ORDER BY u.nombreCompleto;
