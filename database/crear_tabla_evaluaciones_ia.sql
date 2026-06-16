-- Tabla para almacenar evaluaciones de IA de postulantes
CREATE TABLE IF NOT EXISTS evaluaciones_ia (
  id INT PRIMARY KEY AUTO_INCREMENT,
  postulante_id INT NOT NULL,
  convocatoria_id INT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  cumple_requisitos BOOLEAN NOT NULL DEFAULT FALSE,
  estado ENUM('APTO', 'NO APTO', 'OBSERVADO', 'PENDIENTE') NOT NULL DEFAULT 'PENDIENTE',
  
  -- Detalles del análisis en JSON
  detalles_json TEXT,
  
  -- Campos individuales para búsqueda rápida
  cumple_requisitos_academicos BOOLEAN DEFAULT NULL,
  cumple_experiencia BOOLEAN DEFAULT NULL,
  cumple_experiencia_especifica BOOLEAN DEFAULT NULL,
  cumple_experiencia_maxima BOOLEAN DEFAULT NULL,
  cumple_habilidades BOOLEAN DEFAULT NULL,
  cumple_ofimatica BOOLEAN DEFAULT NULL,
  cumple_idiomas BOOLEAN DEFAULT NULL,
  cumple_cursos BOOLEAN DEFAULT NULL,
  cumple_colegiatura BOOLEAN DEFAULT NULL,
  cumple_habilitacion BOOLEAN DEFAULT NULL,
  
  -- Recomendación y observaciones
  recomendacion TEXT,
  observaciones TEXT,
  
  -- Metadatos
  fecha_evaluacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  evaluado_por VARCHAR(100) DEFAULT 'IA',
  version_ia VARCHAR(50) DEFAULT 'GPT-4',
  
  -- Índices para búsqueda rápida
  INDEX idx_postulante (postulante_id),
  INDEX idx_convocatoria (convocatoria_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha (fecha_evaluacion),
  INDEX idx_postulante_convocatoria (postulante_id, convocatoria_id),
  
  -- Clave única para evitar duplicados
  UNIQUE KEY unique_evaluacion (postulante_id, convocatoria_id, fecha_evaluacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentarios de la tabla
ALTER TABLE evaluaciones_ia COMMENT = 'Almacena evaluaciones automáticas de IA para postulantes';
