const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const AppointmentService = require('../services/appointmentService');
const Medico = require('../models/Medico');
const Especialidad = require('../models/Especialidad');
const AgendaMedico = require('../models/AgendaMedico');
const AuditService = require('../services/auditService');
const bcrypt = require('bcryptjs');
const { createMedicoValidator, updateEstadoValidator } = require('../validators/medico.validator');
const {
  createEspecialidadValidator,
  updateEspecialidadValidator,
} = require('../validators/especialidad.validator');
const { cancelCitaValidator } = require('../validators/cita.validator');
const validate = require('../middleware/validate');
const db = require('../config/database');

// Apply auth and admin-only to all routes
router.use(auth, authorize('administrador'));

// PATCH /api/admin/citas/:id/cancelar - Cancel appointment with notification
router.patch('/citas/:id/cancelar', cancelCitaValidator, validate, async (req, res, next) => {
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

// POST /api/admin/turnos-domingo - Assign Sunday emergency doctors
router.post('/turnos-domingo', async (req, res, next) => {
  try {
    const { fecha, medico_ids, bloque_horario_ids } = req.body;

    if (!fecha || !medico_ids || !Array.isArray(medico_ids)) {
      return res.status(400).json({
        error: 'Datos invalidos',
        message: 'Debe proporcionar fecha y lista de medicos',
      });
    }

    // Verify the date is a Sunday. `fecha` llega como 'YYYY-MM-DD' y se
    // parsea como medianoche UTC; usar getDay() (hora local del servidor)
    // clasifica mal el dia en cualquier timezone distinto de UTC. getUTCDay()
    // es consistente sin importar donde corra el proceso.
    const day = new Date(fecha).getUTCDay();
    if (day !== 0) {
      return res.status(400).json({
        error: 'Datos invalidos',
        message: 'La fecha debe ser un domingo',
      });
    }

    // Get emergency time blocks for Sunday if bloque_horario_ids not provided
    let bloqueIds = bloque_horario_ids;
    if (!bloqueIds || !Array.isArray(bloqueIds) || bloqueIds.length === 0) {
      // Fetch Sunday emergency blocks from database
      const blocksResult = await db.query(
        `SELECT id FROM bloques_horarios WHERE dia_semana = 7 AND es_emergencia = TRUE`
      );
      bloqueIds = blocksResult.rows.map(row => row.id);

      // If no emergency blocks found, use all Sunday blocks
      if (bloqueIds.length === 0) {
        const allBlocksResult = await db.query(
          `SELECT id FROM bloques_horarios WHERE dia_semana = 7`
        );
        bloqueIds = allBlocksResult.rows.map(row => row.id);
      }
    }

    // Create agenda entries for each doctor and each block
    const entries = [];
    for (const medico_id of medico_ids) {
      for (const bloque_horario_id of bloqueIds) {
        entries.push({
          medico_id,
          bloque_horario_id,
          fecha,
          disponible: true,
          creado_por: req.user.id,
          creado_por_rol: 'administrador',
        });
      }
    }

    const results = await AgendaMedico.createBulk(entries);

    // Auto-confirm admin-assigned Sunday shifts
    for (const medico_id of medico_ids) {
      await AgendaMedico.confirmarSemana(medico_id, fecha, fecha);
    }

    await AuditService.log({
      usuario_id: req.user.id,
      usuario_rol: 'administrador',
      accion: 'ASIGNAR_TURNO_DOMINGO',
      entidad: 'agenda_medico',
      entidad_id: null,
      datos_nuevos: { fecha, medico_ids, bloques_creados: results.length },
      req,
    });

    res.status(201).json({
      message: 'Medicos asignados para turno dominical',
      fecha,
      medicos_asignados: medico_ids,
      bloques_creados: results.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/turnos-domingo - List upcoming Sunday emergency assignments
// Sunday shifts are stored as agenda_medico rows (one per emergency block) created
// by an admin; we group them by (medico, fecha) to show one assignment per row.
router.get('/turnos-domingo', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT MIN(am.id::text) AS id,
              am.medico_id,
              am.fecha,
              (m.nombre || ' ' || m.apellido) AS medico_nombre,
              e.nombre AS especialidad
       FROM agenda_medico am
       JOIN medicos m ON m.id = am.medico_id
       LEFT JOIN especialidades e ON e.id = m.especialidad_id
       WHERE am.creado_por_rol = 'administrador'
         AND EXTRACT(ISODOW FROM am.fecha) = 7
         AND am.fecha >= CURRENT_DATE
       GROUP BY am.medico_id, am.fecha, m.nombre, m.apellido, e.nombre
       ORDER BY am.fecha ASC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/turnos-domingo/:id - Remove a Sunday assignment
// Deletes every emergency block for the medico+fecha the given row belongs to.
router.delete('/turnos-domingo/:id', async (req, res, next) => {
  try {
    const found = await db.query(
      'SELECT medico_id, fecha FROM agenda_medico WHERE id = $1',
      [req.params.id]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'No encontrado', message: 'Asignacion no encontrada' });
    }
    const { medico_id, fecha } = found.rows[0];
    const del = await db.query(
      `DELETE FROM agenda_medico
       WHERE medico_id = $1 AND fecha = $2 AND creado_por_rol = 'administrador'`,
      [medico_id, fecha]
    );

    await AuditService.log({
      usuario_id: req.user.id,
      usuario_rol: 'administrador',
      accion: 'REMOVER_TURNO_DOMINGO',
      entidad: 'agenda_medico',
      entidad_id: req.params.id,
      datos_anteriores: { medico_id, fecha },
      req,
    });

    res.json({ message: 'Asignacion removida', eliminados: del.rowCount });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/stats - Dashboard summary: totals, status breakdown for today
// and appointment volume for the last 7 days (used by the admin charts).
router.get('/stats', async (req, res, next) => {
  try {
    const [doctorsResult, todayResult, porEstadoResult, ultimos7Result] = await Promise.all([
      db.query("SELECT COUNT(*)::int AS count FROM medicos WHERE estado = 'ACTIVO'"),
      db.query('SELECT COUNT(*)::int AS count FROM citas WHERE fecha = CURRENT_DATE'),
      db.query(
        `SELECT estado, COUNT(*)::int AS count
         FROM citas
         WHERE fecha = CURRENT_DATE
         GROUP BY estado
         ORDER BY estado`
      ),
      db.query(
        `SELECT d::date AS fecha, COUNT(c.id)::int AS count
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d
         LEFT JOIN citas c ON c.fecha = d::date AND c.estado != 'CANCELADA'
         GROUP BY d
         ORDER BY d`
      ),
    ]);

    res.json({
      doctors: doctorsResult.rows[0].count,
      todayCitas: todayResult.rows[0].count,
      porEstado: porEstadoResult.rows,
      ultimos7dias: ultimos7Result.rows,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/medicos - Create a new doctor account
// El username se genera automaticamente (Medico.generateUsername: primera
// letra del nombre + apellido, con reglas de desambiguacion si ya existe).
// No hay flujo de invitacion/reset de contrasena en el sistema: el admin
// define la contrasena inicial y se la comunica al medico por fuera.
router.post('/medicos', createMedicoValidator, validate, async (req, res, next) => {
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
router.get('/medicos', async (req, res, next) => {
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
router.patch('/medicos/:id/estado', updateEstadoValidator, validate, async (req, res, next) => {
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

// GET /api/admin/especialidades - List ALL specialties (incluye inactivas,
// a diferencia de GET /api/medicos/especialidades que solo trae activas)
router.get('/especialidades', async (req, res, next) => {
  try {
    const especialidades = await Especialidad.findAll({ includeInactive: true });
    res.json(especialidades);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/especialidades - Create a new specialty
router.post('/especialidades', createEspecialidadValidator, validate, async (req, res, next) => {
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
router.put('/especialidades/:id', updateEspecialidadValidator, validate, async (req, res, next) => {
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
