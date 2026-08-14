const { body, param } = require('express-validator');

const createAgendaValidator = [
  body('fecha_inicio')
    .notEmpty().withMessage('La fecha de inicio es requerida')
    .isISO8601().withMessage('Formato de fecha invalido'),
  body('bloques')
    .isArray({ min: 1 }).withMessage('Debe incluir al menos un bloque horario'),
  body('bloques.*.bloque_horario_id')
    .isUUID().withMessage('ID de bloque horario invalido'),
  body('bloques.*.disponible')
    .isBoolean().withMessage('El campo disponible debe ser booleano'),
];

const confirmarAgendaValidator = [
  body('semana_fecha')
    .notEmpty().withMessage('La fecha de la semana es requerida')
    .isISO8601().withMessage('Formato de fecha invalido'),
];

const adminOverrideValidator = [
  body('medico_id')
    .notEmpty().withMessage('El ID del medico es requerido')
    .isUUID().withMessage('ID del medico invalido'),
  body('fecha_inicio')
    .notEmpty().withMessage('La fecha de inicio es requerida')
    .isISO8601().withMessage('Formato de fecha invalido'),
  body('bloques')
    .isArray({ min: 1 }).withMessage('Debe incluir al menos un bloque horario'),
];

const getAgendaSemanaValidator = [
  param('medicoId')
    .isUUID().withMessage('ID del medico invalido'),
  param('fecha')
    .isISO8601().withMessage('Formato de fecha invalido'),
];

module.exports = {
  createAgendaValidator,
  confirmarAgendaValidator,
  adminOverrideValidator,
  getAgendaSemanaValidator,
};
