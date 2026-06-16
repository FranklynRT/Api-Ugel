-- ============================================================
-- TEST DE LOGIN PARA USUARIOS DEL COMITÉ
-- ============================================================
-- Este script simula lo que hace el backend en el login

-- 1. Buscar un usuario del comité (reemplaza el correo con el que estás probando)
SET @correo_test = 'comite@ugel.com'; -- CAMBIA ESTO por el correo que estás usando

SELECT 
  u.IDUSUARIO,
  u.nombreCompleto,
  u.correo,
  u.rol,
  u.estado,
  '--- GRUPO ---' as separador1
FROM usuarios u
WHERE u.correo = @correo_test;

-- 2. Ver el grupo del usuario
SELECT 
  gcu.IDGRUPO,
  gc.nombre as grupoNombre,
  '--- CONVOCATORIAS DEL GRUPO ---' as separador2
FROM usuarios u
INNER JOIN grupos_comite_usuarios gcu ON u.IDUSUARIO = gcu.IDUSUARIO
INNER JOIN grupos_comite gc ON gcu.IDGRUPO = gc.IDGRUPO
WHERE u.correo = @correo_test;

-- 3. Ver las convocatorias asignadas al grupo del usuario
SELECT 
  c.IDCONVOCATORIA,
  c.area,
  c.puesto,
  c.numeroCAS,
  c.fechaInicio,
  c.fechaFin,
  c.estado,
  c.publicada
FROM usuarios u
INNER JOIN grupos_comite_usuarios gcu ON u.IDUSUARIO = gcu.IDUSUARIO
INNER JOIN grupos_comite_convocatorias gcc ON gcu.IDGRUPO = gcc.IDGRUPO
INNER JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
WHERE u.correo COLLATE utf8mb4_unicode_ci = @correo_test COLLATE utf8mb4_unicode_ci
ORDER BY gcc.fechaAsignacion DESC;

-- 4. SIMULACIÓN COMPLETA DEL LOGIN (lo que devuelve el backend)
SELECT 
  u.IDUSUARIO as id,
  u.nombreCompleto,
  u.correo,
  u.rol,
  gcu.IDGRUPO as grupoId,
  gc.nombre as grupoNombre,
  COUNT(DISTINCT gcc.IDCONVOCATORIA) as totalConvocatorias,
  GROUP_CONCAT(
    CONCAT(
      '{"IDCONVOCATORIA":', c.IDCONVOCATORIA, 
      ',"puesto":"', REPLACE(c.puesto, '"', '\\"'), 
      '","numeroCAS":"', REPLACE(c.numeroCAS, '"', '\\"'), 
      '","estado":"', c.estado, '"}'
    ) 
    SEPARATOR ','
  ) as convocatoriasJSON
FROM usuarios u
LEFT JOIN grupos_comite_usuarios gcu ON u.IDUSUARIO = gcu.IDUSUARIO
LEFT JOIN grupos_comite gc ON gcu.IDGRUPO = gc.IDGRUPO
LEFT JOIN grupos_comite_convocatorias gcc ON gc.IDGRUPO = gcc.IDGRUPO
LEFT JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
WHERE u.correo COLLATE utf8mb4_unicode_ci = @correo_test COLLATE utf8mb4_unicode_ci
GROUP BY u.IDUSUARIO, u.nombreCompleto, u.correo, u.rol, gcu.IDGRUPO, gc.nombre;

-- ============================================================
-- RESULTADO ESPERADO:
-- ============================================================
-- Si todo está bien, deberías ver:
-- 1. El usuario existe y tiene rol 'comite'
-- 2. El usuario tiene un IDGRUPO asignado
-- 3. El grupo tiene al menos 1 convocatoria asignada
-- 4. totalConvocatorias > 0

-- Si alguno de estos falla, el login mostrará el error:
-- "Acceso denegado: Tu grupo aún no tiene convocatorias asignadas"
