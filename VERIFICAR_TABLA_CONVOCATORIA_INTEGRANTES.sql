-- ============================================================
-- VERIFICAR Y ACTUALIZAR TABLA convocatoria_integrantes
-- ============================================================
-- Este script verifica que la tabla convocatoria_integrantes
-- tenga el campo IDGRUPO para rastrear a qué grupo pertenece
-- cada integrante asignado a una convocatoria
-- ============================================================

USE ugel_talara;

-- Verificar estructura actual de la tabla
DESCRIBE convocatoria_integrantes;

-- Si la tabla no existe, crearla
CREATE TABLE IF NOT EXISTS convocatoria_integrantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  IDCONVOCATORIA INT NOT NULL,
  IDUSUARIO INT NOT NULL,
  IDGRUPO INT NOT NULL,
  fechaAsignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT TRUE,
  INDEX idx_convocatoria (IDCONVOCATORIA),
  INDEX idx_usuario (IDUSUARIO),
  INDEX idx_grupo (IDGRUPO),
  INDEX idx_activo (activo),
  UNIQUE KEY uniq_convocatoria_usuario (IDCONVOCATORIA, IDUSUARIO),
  FOREIGN KEY (IDCONVOCATORIA) REFERENCES convocatorias(IDCONVOCATORIA) ON DELETE CASCADE,
  FOREIGN KEY (IDUSUARIO) REFERENCES usuarios(IDUSUARIO) ON DELETE CASCADE,
  FOREIGN KEY (IDGRUPO) REFERENCES grupos_comite(IDGRUPO) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si la tabla existe pero no tiene el campo IDGRUPO, agregarlo
ALTER TABLE convocatoria_integrantes 
ADD COLUMN IF NOT EXISTS IDGRUPO INT NOT NULL AFTER IDUSUARIO,
ADD INDEX IF NOT EXISTS idx_grupo (IDGRUPO);

-- Verificar datos actuales
SELECT 
  ci.id,
  ci.IDCONVOCATORIA,
  c.puesto as convocatoria,
  ci.IDUSUARIO,
  u.nombreCompleto as usuario,
  ci.IDGRUPO,
  g.nombre as grupo,
  ci.fechaAsignacion,
  ci.activo
FROM convocatoria_integrantes ci
LEFT JOIN convocatorias c ON ci.IDCONVOCATORIA = c.IDCONVOCATORIA
LEFT JOIN usuarios u ON ci.IDUSUARIO = u.IDUSUARIO
LEFT JOIN grupos_comite g ON ci.IDGRUPO = g.IDGRUPO
ORDER BY ci.fechaAsignacion DESC
LIMIT 20;

-- Contar integrantes por grupo
SELECT 
  g.nombre as grupo,
  COUNT(DISTINCT ci.IDUSUARIO) as total_integrantes,
  COUNT(DISTINCT ci.IDCONVOCATORIA) as total_convocatorias
FROM grupos_comite g
LEFT JOIN convocatoria_integrantes ci ON g.IDGRUPO = ci.IDGRUPO AND ci.activo = TRUE
GROUP BY g.IDGRUPO, g.nombre
ORDER BY g.IDGRUPO;

-- Verificar integrantes sin grupo asignado (si existen)
SELECT 
  ci.id,
  ci.IDCONVOCATORIA,
  c.puesto,
  ci.IDUSUARIO,
  u.nombreCompleto,
  ci.IDGRUPO
FROM convocatoria_integrantes ci
LEFT JOIN convocatorias c ON ci.IDCONVOCATORIA = c.IDCONVOCATORIA
LEFT JOIN usuarios u ON ci.IDUSUARIO = u.IDUSUARIO
WHERE ci.IDGRUPO IS NULL OR ci.IDGRUPO = 0;

-- ============================================================
-- RESULTADO ESPERADO:
-- ============================================================
-- 1. La tabla debe tener el campo IDGRUPO
-- 2. Todos los integrantes deben tener un IDGRUPO válido
-- 3. Los datos deben mostrar correctamente el grupo al que pertenecen
-- ============================================================
