const jwt = require('jsonwebtoken');
const env = require('../config/env');

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Token de autenticacion requerido',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        message: 'El token ha expirado, por favor inicie sesion nuevamente',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token invalido',
        message: 'Token de autenticacion invalido',
      });
    }

    return res.status(500).json({
      error: 'Error interno',
      message: 'Error al verificar autenticacion',
    });
  }
};

module.exports = auth;
