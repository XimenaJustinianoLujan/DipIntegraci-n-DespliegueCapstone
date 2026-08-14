const { body, param } = require('express-validator');

const updatePacienteValidator = [
  param('id')
    .isUUID().withMessage('ID del paciente invalido'),
  body('nombre')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre no puede estar vacio')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras y espacios'),
  body('apellido')
    .optional()
    .trim()
    .notEmpty().withMessage('El apellido no puede estar vacio')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El apellido solo puede contener letras y espacios'),
  body('telefono')
    .optional()
    .matches(/^\d{7,15}$/).withMessage('El telefono debe ser numerico con 7 a 15 digitos'),
  body('fecha_nacimiento')
    .optional()
    .isISO8601().withMessage('Formato de fecha invalido'),
];

const pacienteIdValidator = [
  param('id')
    .isUUID().withMessage('ID del paciente invalido'),
];

module.exports = {
  updatePacienteValidator,
  pacienteIdValidator,
};
