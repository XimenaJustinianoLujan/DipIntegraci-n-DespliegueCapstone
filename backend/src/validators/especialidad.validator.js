const { body, param } = require('express-validator');

const createEspecialidadValidator = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('descripcion')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('La descripcion no puede exceder 500 caracteres'),
];

const updateEspecialidadValidator = [
  param('id')
    .isUUID().withMessage('ID de especialidad invalido'),
  body('nombre')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre no puede estar vacio')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('descripcion')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage('La descripcion no puede exceder 500 caracteres'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser booleano'),
];

const especialidadIdValidator = [
  param('id')
    .isUUID().withMessage('ID de especialidad invalido'),
];

module.exports = {
  createEspecialidadValidator,
  updateEspecialidadValidator,
  especialidadIdValidator,
};
