-- ============================================================
-- SCRIPT PARA VERIFICAR Y ASIGNAR USUARIOS DEL COMITÉ
-- ============================================================

-- 1. Ver todos los usuarios del comité
SELECT 
  IDUSUARIO,
  nombreCompleto,
  correo,
  rol,
  estado
FROM usuarios
WHERE LOWER(rol) = 'comite';

-- 2. Ver todos los grupos de comité
SELECT * FROM grupos_comite;

-- 3. Ver qué usuarios están asignados a grupos
SELECT 
  gcu.IDUSUARIO,
  u.nombreCompleto,
  u.correo,
  gcu.IDGRUPO,
  gc.nombre as nombreGrupo
FROM grupos_comite_usuarios gcu
INNER JOIN usuarios u ON gcu.IDUSUARIO = u.IDUSUARIO
INNER JOIN grupos_comite gc ON gcu.IDGRUPO = gc.IDGRUPO
WHERE LOWER(u.rol) = 'comite';

-- 4. Ver qué convocatorias están asignadas a cada grupo
SELECT 
  gc.IDGRUPO,
  gc.nombre as nombreGrupo,
  gcc.IDCONVOCATORIA,
  c.puesto,
  c.numeroCAS,
  c.estado
FROM grupos_comite gc
LEFT JOIN grupos_comite_convocatorias gcc ON gc.IDGRUPO = gcc.IDGRUPO
LEFT JOIN convocatorias c ON gcc.IDCONVOCATORIA = c.IDCONVOCATORIA
ORDER BY gc.IDGRUPO, gcc.IDCONVOCATORIA;

-- ============================================================
-- SOLUCIÓN: ASIGNAR USUARIOS DEL COMITÉ A GRUPOS
-- ============================================================

-- EJEMPLO: Asignar un usuario del comité al grupo "Administración" (ID 1)
-- Reemplaza 5 con el IDUSUARIO del usuario que quieres asignar
-- INSERT INTO grupos_comite_usuarios (IDGRUPO, IDUSUARIO)
-- VALUES (1, 5);

-- ============================================================
-- SOLUCIÓN: ASIGNAR CONVOCATORIAS A GRUPOS
-- ============================================================

-- EJEMPLO: Asignar una convocatoria al grupo "Administración" (ID 1)
-- Reemplaza 1 con el IDCONVOCATORIA que quieres asignar
-- INSERT INTO grupos_comite_convocatorias (IDGRUPO, IDCONVOCATORIA)
-- VALUES (1, 1);

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================

-- Ver usuarios del comité con sus grupos y convocatorias
SELECT 
  u.IDUSUARIO,
  u.nombreCompleto,
  u.correo,
  gc.IDGRUPO,
  gc.nombre as nombreGrupo,
  COUNT(DISTINCT gcc.IDCONVOCATORIA) as totalConvocatorias
FROM usuarios u
LEFT JOIN grupos_comite_usuarios gcu ON u.IDUSUARIO = gcu.IDUSUARIO
LEFT JOIN grupos_comite gc ON gcu.IDGRUPO = gc.IDGRUPO
LEFT JOIN grupos_comite_convocatorias gcc ON gc.IDGRUPO = gcc.IDGRUPO
WHERE LOWER(u.rol) = 'comite'
GROUP BY u.IDUSUARIO, u.nombreCompleto, u.correo, gc.IDGRUPO, gc.nombre;
