const { body, param } = require('express-validator');

const createFichaValidator = [
  body('cita_id')
    .notEmpty().withMessage('El ID de la cita es requerido')
    .isUUID().withMessage('ID de cita invalido'),
  body('paciente_id')
    .optional()
    .isUUID().withMessage('ID de paciente invalido'),
  body('diagnostico')
    .trim()
    .notEmpty().withMessage('El diagnostico es requerido'),
  body('indicaciones')
    .optional()
    .trim(),
  body('receta')
    .optional()
    .trim(),
  body('observaciones')
    .optional()
    .trim(),
];

const pacienteIdValidator = [
  param('pacienteId')
    .isUUID().withMessage('ID del paciente invalido'),
];

const fichaIdValidator = [
  param('id')
    .isUUID().withMessage('ID de ficha clinica invalido'),
];

module.exports = {
  createFichaValidator,
  pacienteIdValidator,
  fichaIdValidator,
};
