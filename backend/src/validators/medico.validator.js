const { body, param } = require('express-validator');

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
  updateEstadoValidator,
  medicoIdValidator,
};
