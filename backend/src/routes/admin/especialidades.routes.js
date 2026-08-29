const express = require('express');
const router = express.Router();
const Especialidad = require('../../models/Especialidad');
const AuditService = require('../../services/auditService');
const {
  createEspecialidadValidator,
  updateEspecialidadValidator,
} = require('../../validators/especialidad.validator');
const validate = require('../../middleware/validate');

// GET /api/admin/especialidades - List ALL specialties (incluye inactivas,
// a diferencia de GET /api/medicos/especialidades que solo trae activas)
router.get('/', async (req, res, next) => {
  try {
    const especialidades = await Especialidad.findAll({ includeInactive: true });
    res.json(especialidades);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/especialidades - Create a new specialty
router.post('/', createEspecialidadValidator, validate, async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;

    const existing = await Especialidad.findByNombre(nombre);
    if (existing) {
      return res.status(409).json({
        error: 'ConflictError',
        message: 'Ya existe una especialidad con ese nombre',
      });
    }

    const especialidad = await Especialidad.create({ nombre, descripcion });

    await AuditService.log({
      usuario_id: req.user.id,
      usuario_rol: 'administrador',
      accion: 'CREAR_ESPECIALIDAD',
      entidad: 'especialidades',
      entidad_id: especialidad.id,
      datos_nuevos: especialidad,
      req,
    });

    res.status(201).json({
      message: 'Especialidad creada exitosamente',
      especialidad,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/especialidades/:id - Update name/description, or toggle activo
router.put('/:id', updateEspecialidadValidator, validate, async (req, res, next) => {
  try {
    const especialidad = await Especialidad.findById(req.params.id);
    // findById solo busca activas; si no aparece puede ser porque esta
    // inactiva (no necesariamente un 404 real) -> buscamos sin ese filtro
    // antes de asumir que no existe.
    let current = especialidad;
    if (!current) {
      const all = await Especialidad.findAll({ includeInactive: true });
      current = all.find((e) => e.id === req.params.id) || null;
    }
    if (!current) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Especialidad no encontrada',
      });
    }

    const fields = {};
    if (req.body.nombre !== undefined) fields.nombre = req.body.nombre;
    if (req.body.descripcion !== undefined) fields.descripcion = req.body.descripcion;
    if (req.body.activo !== undefined) fields.activo = req.body.activo;

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({
        error: 'Datos invalidos',
        message: 'Debe enviar al menos un campo para actualizar',
      });
    }

    if (fields.nombre && fields.nombre !== current.nombre) {
      const duplicate = await Especialidad.findByNombre(fields.nombre);
      if (duplicate) {
        return res.status(409).json({
          error: 'ConflictError',
          message: 'Ya existe una especialidad con ese nombre',
        });
      }
    }

    const updated = await Especialidad.update(req.params.id, fields);

    await AuditService.log({
      usuario_id: req.user.id,
      usuario_rol: 'administrador',
      accion: 'ACTUALIZAR_ESPECIALIDAD',
      entidad: 'especialidades',
      entidad_id: req.params.id,
      datos_anteriores: current,
      datos_nuevos: updated,
      req,
    });

    res.json({
      message: 'Especialidad actualizada exitosamente',
      especialidad: updated,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
