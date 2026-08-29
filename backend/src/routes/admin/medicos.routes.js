const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Medico = require('../../models/Medico');
const AuditService = require('../../services/auditService');
const { createMedicoValidator, updateEstadoValidator } = require('../../validators/medico.validator');
const validate = require('../../middleware/validate');

// POST /api/admin/medicos - Create a new doctor account
// El username se genera automaticamente (Medico.generateUsername: primera
// letra del nombre + apellido, con reglas de desambiguacion si ya existe).
// No hay flujo de invitacion/reset de contrasena en el sistema: el admin
// define la contrasena inicial y se la comunica al medico por fuera.
router.post('/', createMedicoValidator, validate, async (req, res, next) => {
  try {
    const { nombre, apellido, segundo_apellido, email, telefono, password, especialidad_id } = req.body;

    const existing = await Medico.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: 'ConflictError',
        message: 'El email ya esta registrado',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const medico = await Medico.create({
      nombre,
      apellido,
      segundo_apellido,
      email,
      telefono,
      password_hash,
      especialidad_id,
    });

    await AuditService.log({
      usuario_id: req.user.id,
      usuario_rol: 'administrador',
      accion: 'CREAR_MEDICO',
      entidad: 'medicos',
      entidad_id: medico.id,
      datos_nuevos: { nombre, apellido, email, username: medico.username, especialidad_id },
      req,
    });

    const { password_hash: _omit, ...medicoData } = medico;
    res.status(201).json({
      message: `Medico creado exitosamente. Username asignado: ${medico.username}`,
      medico: medicoData,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/medicos - List all doctors with their status
router.get('/', async (req, res, next) => {
  try {
    const { estado, limit, offset } = req.query;
    const medicos = await Medico.findAll({
      estado,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });

    const medicosData = medicos.map(({ password_hash, ...m }) => m);
    res.json(medicosData);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/medicos/:id/estado - Change doctor status
router.patch('/:id/estado', updateEstadoValidator, validate, async (req, res, next) => {
  try {
    const medico = await Medico.findById(req.params.id);
    if (!medico) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Medico no encontrado',
      });
    }

    const estadoAnterior = medico.estado;
    const updated = await Medico.updateEstado(req.params.id, req.body.estado);

    await AuditService.log({
      usuario_id: req.user.id,
      usuario_rol: 'administrador',
      accion: 'CAMBIAR_ESTADO_MEDICO',
      entidad: 'medicos',
      entidad_id: req.params.id,
      datos_anteriores: { estado: estadoAnterior },
      datos_nuevos: { estado: req.body.estado },
      req,
    });

    const { password_hash, ...medicoData } = updated;
    res.json({
      message: 'Estado del medico actualizado',
      medico: medicoData,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
