-- Script para verificar y crear la tabla de postulaciones

-- 1. Verificar si la tabla existe
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'postulaciones';

-- 2. Si no existe, crearla
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
  
  -- Clave única para evitar duplicados
  UNIQUE KEY unq_usuario_convocatoria (IDUSUARIO, IDCONVOCATORIA)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Verificar estructura de la tabla
DESCRIBE postulaciones;

-- 4. Ver índices de la tabla
SHOW INDEX FROM postulaciones;

-- 5. Consultar postulaciones existentes
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
ORDER BY p.fechaRegistro DESC
LIMIT 20;

-- 6. Contar postulaciones por usuario
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

-- 7. Verificar duplicados (no debería haber ninguno)
SELECT 
  IDUSUARIO,
  IDCONVOCATORIA,
  COUNT(*) as duplicados
FROM postulaciones
GROUP BY IDUSUARIO, IDCONVOCATORIA
HAVING COUNT(*) > 1;
