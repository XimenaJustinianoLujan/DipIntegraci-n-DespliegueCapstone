const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const AppointmentService = require('../services/appointmentService');
const Cita = require('../models/Cita');
const { citaIdValidator } = require('../validators/cita.validator');
const validate = require('../middleware/validate');

// Apply auth and secretary-only to all routes
router.use(auth, authorize('secretaria'));

// GET /api/secretaria/citas - List appointments by date
router.get('/citas', async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return res.status(400).json({
        error: 'Datos invalidos',
        message: 'El parametro fecha es requerido',
      });
    }

    const citas = await Cita.findByFecha(fecha);
    res.json(citas);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/secretaria/citas/:id/no-show - Mark as no-show
router.patch('/citas/:id/no-show', citaIdValidator, validate, async (req, res, next) => {
  try {
    const cita = await AppointmentService.markNoShow(req.params.id, {
      usuario_id: req.user.id,
      usuario_rol: 'secretaria',
    }, req);

    res.json({
      message: 'Cita marcada como NO_SHOW',
      cita,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/secretaria/citas/:id/reconsulta - Mark as reconsulta
router.patch('/citas/:id/reconsulta', citaIdValidator, validate, async (req, res, next) => {
  try {
    const cita = await AppointmentService.markReconsulta(req.params.id, {
      usuario_id: req.user.id,
    }, req);

    res.json({
      message: 'Cita marcada como RECONSULTA',
      cita,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
