const { body } = require('express-validator');

const registerValidator = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras y espacios'),
  body('apellido')
    .trim()
    .notEmpty().withMessage('El apellido es requerido')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El apellido solo puede contener letras y espacios'),
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
    .optional()
    .matches(/^\d{7,15}$/).withMessage('El telefono debe ser numerico con 7 a 15 digitos'),
  body('fecha_nacimiento')
    .optional()
    .isISO8601().withMessage('Formato de fecha invalido'),
];

const loginValidator = [
  body('email')
    .optional()
    .isEmail().withMessage('Formato de email invalido'),
  body('username')
    .optional()
    .trim()
    .notEmpty().withMessage('El username no puede estar vacio'),
  body('password')
    .notEmpty().withMessage('La contrasena es requerida'),
];

const verifyEmailValidator = [
  body('token')
    .notEmpty().withMessage('El token de verificacion es requerido'),
];

module.exports = {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
};
