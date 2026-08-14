/**
 * Centralized error handling middleware.
 * Maps error types to proper HTTP status codes.
 */
const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err.message);

  if (err.status) {
    return res.status(err.status).json({
      error: err.type || 'Error',
      message: err.message,
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Datos invalidos',
      message: err.message,
      details: err.details || undefined,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'No autenticado',
      message: 'Token invalido o expirado',
    });
  }

  // Conflict errors (duplicate, occupied slot)
  if (err.code === '23505' || err.type === 'ConflictError') {
    return res.status(409).json({
      error: 'Conflicto',
      message: err.message || 'El recurso ya existe o el horario esta ocupado',
    });
  }

  // Not found
  if (err.type === 'NotFoundError') {
    return res.status(404).json({
      error: 'No encontrado',
      message: err.message || 'Recurso no encontrado',
    });
  }

  // Default: internal server error
  return res.status(500).json({
    error: 'Error interno',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Ha ocurrido un error interno del servidor',
  });
};

module.exports = errorHandler;
