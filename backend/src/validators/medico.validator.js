const { body, param } = require('express-validator');

const createMedicoValidator = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras y espacios'),
  body('apellido')
    .trim()
    .notEmpty().withMessage('El apellido es requerido')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El apellido solo puede contener letras y espacios'),
  body('segundo_apellido')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El segundo apellido solo puede contener letras y espacios'),
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('El formato del email es invalido'),
  body('password')
    .notEmpty().withMessage('La contrasena es requerida')
    .isLength({ min: 8 }).withMessage('La contrasena debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contrasena debe tener al menos una mayuscula')
    .matches(/[0-9]/).withMessage('La contrasena debe tener al menos un numero'),
  body('telefono')
    .optional({ checkFalsy: true })
    .matches(/^\d{7,15}$/).withMessage('El telefono debe ser numerico con 7 a 15 digitos'),
  body('especialidad_id')
    .optional({ checkFalsy: true })
    .isUUID().withMessage('ID de especialidad invalido'),
];

const updateEstadoValidator = [
  param('id')
    .isUUID().withMessage('ID del medico invalido'),
  body('estado')
    .notEmpty().withMessage('El estado es requerido')
    .isIn(['ACTIVO', 'BAJA', 'VACACION']).withMessage('Estado invalido. Opciones: ACTIVO, BAJA, VACACION'),
];

const medicoIdValidator = [
  param('id')
    .isUUID().withMessage('ID del medico invalido'),
];

module.exports = {
  createMedicoValidator,
  updateEstadoValidator,
  medicoIdValidator,
};
