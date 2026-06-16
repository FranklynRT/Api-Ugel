-- ============================================
-- CREAR TABLA DE POSTULACIONES
-- ============================================

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS postulaciones (
  IDPOSTULACION INT AUTO_INCREMENT PRIMARY KEY,
  IDUSUARIO INT NOT NULL,
  IDCONVOCATORIA INT NOT NULL,
  estado ENUM('registrada', 'anulada') DEFAULT 'registrada',
  fechaRegistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices para mejorar rendimiento
  INDEX idx_usuario (IDUSUARIO),
  INDEX idx_convocatoria (IDCONVOCATORIA),
  INDEX idx_estado (estado),
  
  -- Clave única para evitar duplicados (un usuario solo puede postular una vez a cada convocatoria)
  UNIQUE KEY unq_usuario_convocatoria (IDUSUARIO, IDCONVOCATORIA)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VERIFICAR ESTRUCTURA
-- ============================================

-- Ver estructura de la tabla
DESCRIBE postulaciones;

-- ============================================
-- CONSULTAS ÚTILES
-- ============================================

-- Ver todas las postulaciones
SELECT 
  p.IDPOSTULACION,
  p.IDUSUARIO,
  u.nombreCompleto,
  p.IDCONVOCATORIA,
  c.puesto,
  c.numero_cas,
  p.estado,
  p.fechaRegistro
FROM postulaciones p
LEFT JOIN usuarios u ON p.IDUSUARIO = u.IDUSUARIO
LEFT JOIN convocatorias c ON p.IDCONVOCATORIA = c.IDCONVOCATORIA
ORDER BY p.fechaRegistro DESC;

-- Contar postulaciones por usuario
SELECT 
  u.IDUSUARIO,
  u.nombreCompleto,
  COUNT(*) as total_postulaciones,
  SUM(CASE WHEN p.estado = 'registrada' THEN 1 ELSE 0 END) as activas,
  SUM(CASE WHEN p.estado = 'anulada' THEN 1 ELSE 0 END) as anuladas
FROM usuarios u
LEFT JOIN postulaciones p ON u.IDUSUARIO = p.IDUSUARIO
WHERE u.rol = 'postulante'
GROUP BY u.IDUSUARIO, u.nombreCompleto
HAVING total_postulaciones > 0
ORDER BY total_postulaciones DESC;

-- Verificar si hay duplicados (no debería haber ninguno)
SELECT 
  IDUSUARIO,
  IDCONVOCATORIA,
  COUNT(*) as duplicados
FROM postulaciones
GROUP BY IDUSUARIO, IDCONVOCATORIA
HAVING COUNT(*) > 1;
