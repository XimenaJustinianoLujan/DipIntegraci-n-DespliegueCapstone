const { body, param } = require('express-validator');

const createCitaValidator = [
  body('medico_id')
    .notEmpty().withMessage('El ID del medico es requerido')
    .isUUID().withMessage('ID del medico invalido'),
  body('especialidad_id')
    .notEmpty().withMessage('El ID de la especialidad es requerido')
    .isUUID().withMessage('ID de la especialidad invalido'),
  body('fecha')
    .notEmpty().withMessage('La fecha es requerida')
    .isISO8601().withMessage('Formato de fecha invalido')
    .custom((value) => {
      const appointmentDate = new Date(value);
      const now = new Date();
      if (appointmentDate < now) {
        throw new Error('La fecha no puede ser en el pasado');
      }
      return true;
    }),
  body('hora_inicio')
    .notEmpty().withMessage('La hora de inicio es requerida')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Formato de hora invalido (HH:MM)'),
  body('motivo_consulta')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('El motivo no puede exceder 500 caracteres'),
];

const cancelCitaValidator = [
  param('id')
    .isUUID().withMessage('ID de cita invalido'),
  body('motivo_cancelacion')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('El motivo no puede exceder 500 caracteres'),
];

const citaIdValidator = [
  param('id')
    .isUUID().withMessage('ID de cita invalido'),
];

module.exports = {
  createCitaValidator,
  cancelCitaValidator,
  citaIdValidator,
};
