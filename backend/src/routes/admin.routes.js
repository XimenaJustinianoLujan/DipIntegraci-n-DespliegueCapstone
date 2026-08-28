const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const AppointmentService = require('../services/appointmentService');
const Medico = require('../models/Medico');
const AgendaMedico = require('../models/AgendaMedico');
const AuditService = require('../services/auditService');
const { updateEstadoValidator } = require('../validators/medico.validator');
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

    // Verify the date is a Sunday
    const day = new Date(fecha).getDay();
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

module.exports = router;
