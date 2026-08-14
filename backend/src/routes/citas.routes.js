const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const AppointmentService = require('../services/appointmentService');
const Cita = require('../models/Cita');
const { createCitaValidator, cancelCitaValidator, citaIdValidator } = require('../validators/cita.validator');
const validate = require('../middleware/validate');

// POST /api/citas - Create appointment
router.post('/', auth, authorize('paciente'), createCitaValidator, validate, async (req, res, next) => {
  try {
    const cita = await AppointmentService.createAppointment({
      paciente_id: req.user.id,
      ...req.body,
    }, req);

    res.status(201).json({
      message: 'Cita agendada exitosamente',
      cita,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/citas/medico - Get doctor's own appointments (by date/state)
router.get('/medico', auth, authorize('medico'), async (req, res, next) => {
  try {
    const { fecha, estado } = req.query;
    const citas = await Cita.findByMedico(req.user.id, { fecha, estado });
    res.json(citas);
  } catch (error) {
    next(error);
  }
});

// GET /api/citas/:id
router.get('/:id', auth, citaIdValidator, validate, async (req, res, next) => {
  try {
    const cita = await Cita.findById(req.params.id);
    if (!cita) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Cita no encontrada',
      });
    }

    // Patients can only see their own
    if (req.user.role === 'paciente' && cita.paciente_id !== req.user.id) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'No tiene permisos para ver esta cita',
      });
    }

    res.json(cita);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/citas/:id/cancelar - Cancel by patient
router.patch('/:id/cancelar', auth, authorize('paciente'), cancelCitaValidator, validate, async (req, res, next) => {
  try {
    const cita = await AppointmentService.cancelByPaciente(req.params.id, {
      paciente_id: req.user.id,
      motivo_cancelacion: req.body.motivo_cancelacion,
    }, req);

    res.json({
      message: 'Cita cancelada exitosamente',
      cita,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/citas/:id/completar - Complete appointment (doctor only, via ficha clinica)
router.patch('/:id/completar', auth, authorize('medico'), citaIdValidator, validate, async (req, res, next) => {
  try {
    const cita = await Cita.findById(req.params.id);
    if (!cita) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Cita no encontrada',
      });
    }

    if (cita.medico_id !== req.user.id) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo puede completar sus propias citas',
      });
    }

    const updated = await Cita.completar(req.params.id);
    if (!updated) {
      return res.status(400).json({
        error: 'Estado invalido',
        message: 'Solo se puede completar una cita en estado CONFIRMADA',
      });
    }

    res.json({
      message: 'Cita completada exitosamente',
      cita: updated,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/citas/:id/no-show - Mark no-show (doctor or secretary)
router.patch('/:id/no-show', auth, authorize('medico', 'secretaria'), citaIdValidator, validate, async (req, res, next) => {
  try {
    const cita = await AppointmentService.markNoShow(req.params.id, {
      usuario_id: req.user.id,
      usuario_rol: req.user.role,
    }, req);

    res.json({
      message: 'Cita marcada como NO_SHOW',
      cita,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/citas/:id/reconsulta - Mark reconsulta (secretary only)
router.patch('/:id/reconsulta', auth, authorize('secretaria'), citaIdValidator, validate, async (req, res, next) => {
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
