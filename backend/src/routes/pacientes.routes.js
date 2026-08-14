const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const Paciente = require('../models/Paciente');
const Cita = require('../models/Cita');
const FichaClinica = require('../models/FichaClinica');
const { updatePacienteValidator, pacienteIdValidator } = require('../validators/paciente.validator');
const validate = require('../middleware/validate');

// GET /api/pacientes/:id
router.get('/:id', auth, pacienteIdValidator, validate, async (req, res, next) => {
  try {
    const paciente = await Paciente.findById(req.params.id);
    if (!paciente) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Paciente no encontrado',
      });
    }

    // Patients can only see their own info, admins and secretarias can see all
    if (req.user.role === 'paciente' && req.user.id !== req.params.id) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'No tiene permisos para ver este recurso',
      });
    }

    const { password_hash, ...pacienteData } = paciente;
    res.json(pacienteData);
  } catch (error) {
    next(error);
  }
});

// PUT /api/pacientes/:id
router.put('/:id', auth, authorize('paciente', 'administrador'), updatePacienteValidator, validate, async (req, res, next) => {
  try {
    if (req.user.role === 'paciente' && req.user.id !== req.params.id) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'No tiene permisos para modificar este recurso',
      });
    }

    const { nombre, apellido, telefono, fecha_nacimiento } = req.body;
    const fields = {};
    if (nombre) fields.nombre = nombre;
    if (apellido) fields.apellido = apellido;
    if (telefono) fields.telefono = telefono;
    if (fecha_nacimiento) fields.fecha_nacimiento = fecha_nacimiento;

    const paciente = await Paciente.update(req.params.id, fields);
    if (!paciente) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Paciente no encontrado',
      });
    }

    const { password_hash, ...pacienteData } = paciente;
    res.json(pacienteData);
  } catch (error) {
    next(error);
  }
});

// GET /api/pacientes/:id/citas
router.get('/:id/citas', auth, pacienteIdValidator, validate, async (req, res, next) => {
  try {
    if (req.user.role === 'paciente' && req.user.id !== req.params.id) {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'No tiene permisos para ver este recurso',
      });
    }

    const { estado, limit, offset } = req.query;
    const citas = await Cita.findByPaciente(req.params.id, {
      estado,
      limit: parseInt(limit, 10) || 20,
      offset: parseInt(offset, 10) || 0,
    });

    res.json(citas);
  } catch (error) {
    next(error);
  }
});

// GET /api/pacientes/:id/ficha-clinica
router.get('/:id/ficha-clinica', auth, pacienteIdValidator, validate, async (req, res, next) => {
  try {
    if (req.user.role === 'paciente' && req.user.id !== req.params.id) {
      if (!['medico', 'administrador'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Sin permisos',
          message: 'No tiene permisos para ver este recurso',
        });
      }
    }

    const fichas = await FichaClinica.findByPaciente(req.params.id);
    res.json(fichas);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
