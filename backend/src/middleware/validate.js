const { validationResult } = require('express-validator');

/**
 * Middleware to check express-validator validation results.
 * Returns 400 with error details if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Datos invalidos',
      message: 'Error de validacion en los datos enviados',
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  next();
};

module.exports = validate;
