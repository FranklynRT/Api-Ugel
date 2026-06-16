-- ============================================================
-- CREAR TABLA: convocatoria_integrantes
-- ============================================================
-- Esta tabla permite asignar integrantes específicos a cada convocatoria
-- dentro de un grupo de comité

CREATE TABLE IF NOT EXISTS convocatoria_integrantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  IDCONVOCATORIA INT NOT NULL,
  IDUSUARIO INT NOT NULL,
  IDGRUPO INT NOT NULL,
  fechaAsignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT TRUE,
  
  -- Índices para mejorar rendimiento
  INDEX idx_convocatoria (IDCONVOCATORIA),
  INDEX idx_usuario (IDUSUARIO),
  INDEX idx_grupo (IDGRUPO),
  INDEX idx_activo (activo),
  
  -- Clave única para evitar duplicados
  UNIQUE KEY uniq_convocatoria_usuario (IDCONVOCATORIA, IDUSUARIO),
  
  -- Claves foráneas
  FOREIGN KEY (IDCONVOCATORIA) REFERENCES convocatorias(IDCONVOCATORIA) ON DELETE CASCADE,
  FOREIGN KEY (IDUSUARIO) REFERENCES usuarios(IDUSUARIO) ON DELETE CASCADE,
  FOREIGN KEY (IDGRUPO) REFERENCES grupos_comite(IDGRUPO) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VERIFICAR TABLA CREADA
-- ============================================================
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'convocatoria_integrantes';

-- ============================================================
-- EJEMPLO DE USO:
-- ============================================================
-- Asignar integrante a convocatoria:
-- INSERT INTO convocatoria_integrantes (IDCONVOCATORIA, IDUSUARIO, IDGRUPO)
-- VALUES (1, 5, 1);

-- Ver integrantes de una convocatoria:
-- SELECT ci.*, u.nombreCompleto, u.correo
-- FROM convocatoria_integrantes ci
-- INNER JOIN usuarios u ON ci.IDUSUARIO = u.IDUSUARIO
-- WHERE ci.IDCONVOCATORIA = 1 AND ci.activo = TRUE;

-- Ver convocatorias de un integrante:
-- SELECT ci.*, c.numeroCAS, c.puesto
-- FROM convocatoria_integrantes ci
-- INNER JOIN convocatorias c ON ci.IDCONVOCATORIA = c.IDCONVOCATORIA
-- WHERE ci.IDUSUARIO = 5 AND ci.activo = TRUE;
