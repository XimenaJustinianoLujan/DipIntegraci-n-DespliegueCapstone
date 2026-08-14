const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const ScheduleService = require('../services/scheduleService');
const { createAgendaValidator, confirmarAgendaValidator, adminOverrideValidator, getAgendaSemanaValidator } = require('../validators/agenda.validator');
const validate = require('../middleware/validate');

// POST /api/agenda - Doctor loads schedule
router.post('/', auth, authorize('medico'), createAgendaValidator, validate, async (req, res, next) => {
  try {
    const result = await ScheduleService.loadSchedule({
      medico_id: req.user.id,
      fecha_inicio: req.body.fecha_inicio,
      bloques: req.body.bloques,
    }, req);

    res.status(201).json({
      message: 'Agenda cargada exitosamente',
      entries: result,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/agenda/confirmar - Confirm schedule for a week
router.put('/confirmar', auth, authorize('medico'), confirmarAgendaValidator, validate, async (req, res, next) => {
  try {
    const result = await ScheduleService.confirmSchedule(
      req.user.id,
      req.body.semana_fecha,
      req
    );

    res.json({
      message: 'Agenda confirmada exitosamente',
      entries: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/agenda/last-config - Get last configuration for proposal (MUST be before /:medicoId)
router.get('/last-config', auth, authorize('medico'), async (req, res, next) => {
  try {
    const config = await ScheduleService.getLastConfiguration(req.user.id);
    res.json(config);
  } catch (error) {
    next(error);
  }
});

// GET /api/agenda/bloques-horarios - Get all time block definitions
router.get('/bloques-horarios', auth, authorize('medico', 'administrador'), async (req, res, next) => {
  try {
    const db = require('../config/database');
    const result = await db.query(
      `SELECT id, dia_semana, hora_inicio, hora_fin, es_emergencia
       FROM bloques_horarios
       WHERE activo = TRUE AND es_emergencia = FALSE
       ORDER BY dia_semana ASC, hora_inicio ASC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/agenda/disponibilidad - Get available slots for a doctor on a given date
router.get('/disponibilidad', auth, async (req, res, next) => {
  try {
    const { medico_id, fecha } = req.query;
    if (!medico_id || !fecha) {
      return res.status(400).json({
        error: 'Datos invalidos',
        message: 'medico_id y fecha son requeridos como query parameters',
      });
    }

    const slots = await ScheduleService.getAvailableSlots(medico_id, fecha);
    res.json(slots);
  } catch (error) {
    next(error);
  }
});

// GET /api/agenda/:medicoId/semana/:fecha
router.get('/:medicoId/semana/:fecha', auth, getAgendaSemanaValidator, validate, async (req, res, next) => {
  try {
    const schedule = await ScheduleService.getWeekSchedule(req.params.medicoId, req.params.fecha);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
});

// POST /api/agenda/admin-override - Admin loads schedule for doctor
router.post('/admin-override', auth, authorize('administrador'), adminOverrideValidator, validate, async (req, res, next) => {
  try {
    const result = await ScheduleService.adminOverride({
      admin_id: req.user.id,
      medico_id: req.body.medico_id,
      fecha_inicio: req.body.fecha_inicio,
      bloques: req.body.bloques,
    }, req);

    res.status(201).json({
      message: 'Agenda cargada por administrador exitosamente',
      entries: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
