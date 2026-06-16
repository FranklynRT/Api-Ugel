-- Tabla para almacenar evaluaciones manuales de CV
-- Esta tabla es independiente de las evaluaciones de IA

CREATE TABLE IF NOT EXISTS EVALUACIONES_MANUALES_CV (
    IDEVALUACION INT AUTO_INCREMENT PRIMARY KEY,
    CANDIDATOID INT NOT NULL,
    NOTAMANUAL DECIMAL(5,2) NOT NULL DEFAULT 0,
    ESTADO VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    EVALUADOPOR VARCHAR(255),
    FECHAEVALUACION DATETIME DEFAULT CURRENT_TIMESTAMP,
    OBSERVACIONES TEXT,
    
    -- Índices para mejorar rendimiento
    INDEX idx_candidato (CANDIDATOID),
    INDEX idx_estado (ESTADO),
    INDEX idx_fecha (FECHAEVALUACION),
    
    -- Constraint para evitar duplicados
    UNIQUE KEY unique_candidato (CANDIDATOID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentarios de la tabla
ALTER TABLE EVALUACIONES_MANUALES_CV 
COMMENT = 'Almacena las evaluaciones manuales de CV realizadas por el comité de evaluación';

-- Comentarios de las columnas (sin redefinir PRIMARY KEY)
ALTER TABLE EVALUACIONES_MANUALES_CV 
MODIFY COLUMN IDEVALUACION INT AUTO_INCREMENT COMMENT 'ID único de la evaluación',
MODIFY COLUMN CANDIDATOID INT NOT NULL COMMENT 'ID del candidato/postulante',
MODIFY COLUMN NOTAMANUAL DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT 'Nota manual asignada (0-100)',
MODIFY COLUMN ESTADO VARCHAR(20) NOT NULL DEFAULT 'pendiente' COMMENT 'Estado: pendiente, aprobado, desaprobado',
MODIFY COLUMN EVALUADOPOR VARCHAR(255) COMMENT 'Nombre del evaluador que asignó la nota',
MODIFY COLUMN FECHAEVALUACION DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de la evaluación',
MODIFY COLUMN OBSERVACIONES TEXT COMMENT 'Observaciones adicionales del evaluador';
