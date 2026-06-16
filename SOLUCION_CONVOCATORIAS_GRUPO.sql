-- ============================================================
-- SOLUCIÓN: ASIGNAR CONVOCATORIAS AL GRUPO
-- ============================================================

-- 1. Ver qué convocatorias están publicadas
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

-- 2. Ver qué convocatorias tiene el grupo 1 (Administración)
SELECT 
  gcc.IDGRUPO,
  gc.nombre as nombreGrupo,
  gcc.IDCONVOCATORIA,
  c.puesto,
  c.numeroCAS,
  c.estado
FROM grupos_comite_convocatorias gcc
INNER JOIN grupos_comite gc ON gcc.IDGRUPO = gc.IDGRUPO
INNER JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
WHERE gcc.IDGRUPO = 1;

-- ============================================================
-- SOLUCIÓN: ASIGNAR TODAS LAS CONVOCATORIAS PUBLICADAS AL GRUPO 1
-- ============================================================

-- Opción 1: Asignar TODAS las convocatorias publicadas al grupo 1
INSERT IGNORE INTO grupos_comite_convocatorias (IDGRUPO, IDCONVOCATORIA)
SELECT 1, IDCONVOCATORIA 
FROM convocatorias 
WHERE (estado IN ('Publicada', 'publicada', 'Activo', 'activo', 'Activa', 'activa')
   OR publicada = 1
   OR publicada = TRUE)
  AND IDCONVOCATORIA NOT IN (
    SELECT IDCONVOCATORIA 
    FROM grupos_comite_convocatorias 
    WHERE IDGRUPO = 1
  );

-- Opción 2: Asignar una convocatoria específica (reemplaza 1 con el ID de la convocatoria)
-- INSERT IGNORE INTO grupos_comite_convocatorias (IDGRUPO, IDCONVOCATORIA)
-- VALUES (1, 1);

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Ver cuántas convocatorias tiene ahora el grupo 1
SELECT 
  gc.IDGRUPO,
  gc.nombre as nombreGrupo,
  COUNT(gcc.IDCONVOCATORIA) as totalConvocatorias,
  GROUP_CONCAT(c.puesto SEPARATOR ', ') as convocatorias
FROM grupos_comite gc
LEFT JOIN grupos_comite_convocatorias gcc ON gc.IDGRUPO = gcc.IDGRUPO
LEFT JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
WHERE gc.IDGRUPO = 1
GROUP BY gc.IDGRUPO, gc.nombre;

-- ============================================================
-- ASIGNAR A TODOS LOS GRUPOS (OPCIONAL)
-- ============================================================

-- Si quieres asignar las mismas convocatorias a todos los grupos:
-- INSERT IGNORE INTO grupos_comite_convocatorias (IDGRUPO, IDCONVOCATORIA)
-- SELECT gc.IDGRUPO, c.IDCONVOCATORIA
-- FROM grupos_comite gc
-- CROSS JOIN convocatorias c
-- WHERE (c.estado IN ('Publicada', 'Activo', 'Activa') OR c.publicada = 1)
--   AND NOT EXISTS (
--     SELECT 1 FROM grupos_comite_convocatorias gcc2
--     WHERE gcc2.IDGRUPO = gc.IDGRUPO AND gcc2.IDCONVOCATORIA = c.IDCONVOCATORIA
--   );
