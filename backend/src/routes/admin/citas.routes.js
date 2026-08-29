const express = require('express');
const router = express.Router();
const AppointmentService = require('../../services/appointmentService');
const { cancelCitaValidator } = require('../../validators/cita.validator');
const validate = require('../../middleware/validate');

// PATCH /api/admin/citas/:id/cancelar - Cancel appointment with notification
router.patch('/:id/cancelar', cancelCitaValidator, validate, async (req, res, next) => {
  try {
    const cita = await AppointmentService.cancelByAdmin(req.params.id, {
      admin_id: req.user.id,
      motivo_cancelacion: req.body.motivo_cancelacion || 'Cancelada por administracion',
    }, req);

    res.json({
      message: 'Cita cancelada por administracion. Se notifico al paciente.',
      cita,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
