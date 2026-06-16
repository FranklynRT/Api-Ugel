-- Script para corregir los curriculumId incorrectos en postulantes_registrados
-- Este script actualiza los curriculumId que no existen en la tabla curriculum

-- 1. Ver los postulantes con curriculumId que no existen
SELECT 
    pr.id,
    pr.nombreCompleto,
    pr.IDUSUARIO,
    pr.curriculumId as curriculumId_actual,
    c.IDCURRICULUM as curriculumId_correcto
FROM postulantes_registrados pr
LEFT JOIN curriculum c ON pr.IDUSUARIO = c.IDUSUARIO
WHERE pr.curriculumId IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM curriculum 
    WHERE IDCURRICULUM = REPLACE(pr.curriculumId, 'CV-', '')
);

-- 2. Actualizar los curriculumId incorrectos con el curriculum correcto del usuario
UPDATE postulantes_registrados pr
INNER JOIN curriculum c ON pr.IDUSUARIO = c.IDUSUARIO
SET pr.curriculumId = c.IDCURRICULUM
WHERE pr.curriculumId IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM curriculum 
    WHERE IDCURRICULUM = REPLACE(pr.curriculumId, 'CV-', '')
);

-- 3. Verificar los cambios
SELECT 
    pr.id,
    pr.nombreCompleto,
    pr.IDUSUARIO,
    pr.curriculumId,
    c.IDCURRICULUM,
    c.nombreArchivo
FROM postulantes_registrados pr
LEFT JOIN curriculum c ON pr.curriculumId = c.IDCURRICULUM
WHERE pr.curriculumId IS NOT NULL;
