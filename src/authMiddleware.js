// RUTA: middleware/verifyToken.js
import jwt from 'jsonwebtoken';

/**
 * Verifica que el usuario tenga un token JWT válido
 */
export const verifyToken = (req, res, next) => {
  try {
    // Permitir peticiones OPTIONS (preflight) sin autenticación
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

    if (!token) {
      return res.status(403).json({ message: 'Acceso denegado. Se requiere un token.' });
    }
    // Verifica el token con la clave secreta
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
      }

      // El payload del token debe incluir el ID del usuario y su rol
      // Ejemplo al firmar el token: jwt.sign({ id: user.id, rol: user.rol }, JWT_SECRET)
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Error en verifyToken:', error);
    return res.status(500).json({ message: 'Error interno en la verificación del token.' });
  }
};

/**
 * Verifica que el usuario tenga uno de los roles permitidos
 */
export const checkRole = (rolesPermitidos = []) => {
  return (req, res, next) => {
    try {
      if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
        return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
      }
      next();
    } catch (error) {
      console.error('Error en checkRole:', error);
      return res.status(500).json({ message: 'Error interno en la verificación de roles.' });
    }
  };
};
