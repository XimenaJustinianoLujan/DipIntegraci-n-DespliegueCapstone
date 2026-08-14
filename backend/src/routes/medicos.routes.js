const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const Medico = require('../models/Medico');
const ScheduleService = require('../services/scheduleService');
const db = require('../config/database');
const { updateEstadoValidator, medicoIdValidator } = require('../validators/medico.validator');
const validate = require('../middleware/validate');

// GET /api/medicos - List doctors
router.get('/', auth, async (req, res, next) => {
  try {
    const { especialidad_id, estado, limit, offset } = req.query;
    const medicos = await Medico.findAll({
      especialidad_id,
      estado,
      limit: parseInt(limit, 10) || 20,
      offset: parseInt(offset, 10) || 0,
    });

    const medicosData = medicos.map(({ password_hash, ...m }) => m);
    res.json(medicosData);
  } catch (error) {
    next(error);
  }
});

// GET /api/medicos/especialidades - List all specialties
router.get('/especialidades', auth, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, nombre, descripcion FROM especialidades WHERE activo = TRUE ORDER BY nombre ASC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/medicos/:id
router.get('/:id', auth, medicoIdValidator, validate, async (req, res, next) => {
  try {
    const medico = await Medico.findById(req.params.id);
    if (!medico) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Medico no encontrado',
      });
    }

    const { password_hash, ...medicoData } = medico;
    res.json(medicoData);
  } catch (error) {
    next(error);
  }
});

// GET /api/medicos/:id/agenda
router.get('/:id/agenda', auth, medicoIdValidator, validate, async (req, res, next) => {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return res.status(400).json({
        error: 'Datos invalidos',
        message: 'La fecha es requerida como query parameter (?fecha=YYYY-MM-DD)',
      });
    }

    const schedule = await ScheduleService.getWeekSchedule(req.params.id, fecha);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
});

// PUT /api/medicos/:id/estado - Admin only
router.put('/:id/estado', auth, authorize('administrador'), updateEstadoValidator, validate, async (req, res, next) => {
  try {
    const medico = await Medico.updateEstado(req.params.id, req.body.estado);
    if (!medico) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Medico no encontrado',
      });
    }

    const { password_hash, ...medicoData } = medico;
    res.json({
      message: 'Estado del medico actualizado',
      medico: medicoData,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
