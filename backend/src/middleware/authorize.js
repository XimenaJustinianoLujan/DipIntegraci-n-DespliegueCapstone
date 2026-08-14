/**
 * Role-based authorization middleware.
 * Accepts an array of allowed roles.
 * Must be used after auth middleware.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Debe iniciar sesion primero',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'No tiene permisos para realizar esta accion',
      });
    }

    next();
  };
};

module.exports = authorize;
