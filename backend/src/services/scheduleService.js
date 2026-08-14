const AgendaMedico = require('../models/AgendaMedico');
const AuditService = require('./auditService');

class ScheduleService {
  /**
   * Doctor loads schedule for a week (must be 1 week ahead).
   * After first load, system proposes last configuration.
   */
  static async loadSchedule({ medico_id, fecha_inicio, bloques }, req) {
    // Validate date is at least 1 week ahead
    const startDate = new Date(fecha_inicio);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysAhead = (startDate - today) / (1000 * 60 * 60 * 24);

    if (daysAhead < 7) {
      const error = new Error('La agenda debe cargarse con al menos 1 semana de anticipacion');
      error.status = 400;
      throw error;
    }

    // Create schedule entries
    const entries = bloques.map((bloque) => ({
      medico_id,
      bloque_horario_id: bloque.bloque_horario_id,
      fecha: bloque.fecha || fecha_inicio,
      disponible: bloque.disponible !== false,
      creado_por: medico_id,
      creado_por_rol: 'medico',
    }));

    const results = await AgendaMedico.createBulk(entries);

    await AuditService.log({
      usuario_id: medico_id,
      usuario_rol: 'medico',
      accion: 'CARGAR_AGENDA',
      entidad: 'agenda_medico',
      entidad_id: null,
      datos_nuevos: { fecha_inicio, bloques_count: bloques.length },
      req,
    });

    return results;
  }

  /**
   * Get the last confirmed configuration to propose to doctor.
   */
  static async getLastConfiguration(medico_id) {
    return AgendaMedico.getLastConfiguration(medico_id);
  }

  /**
   * Get schedule for a specific week.
   */
  static async getWeekSchedule(medico_id, startDate) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    return AgendaMedico.findByMedicoAndWeek(
      medico_id,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
  }

  /**
   * Confirm schedule for a week.
   */
  static async confirmSchedule(medico_id, semana_fecha, req) {
    const start = new Date(semana_fecha);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const results = await AgendaMedico.confirmarSemana(
      medico_id,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );

    await AuditService.log({
      usuario_id: medico_id,
      usuario_rol: 'medico',
      accion: 'CONFIRMAR_AGENDA',
      entidad: 'agenda_medico',
      entidad_id: null,
      datos_nuevos: { semana_fecha, confirmados: results.length },
      req,
    });

    return results;
  }

  /**
   * Admin override: load schedule for a doctor who didn't comply.
   */
  static async adminOverride({ admin_id, medico_id, fecha_inicio, bloques }, req) {
    const entries = bloques.map((bloque) => ({
      medico_id,
      bloque_horario_id: bloque.bloque_horario_id,
      fecha: bloque.fecha || fecha_inicio,
      disponible: bloque.disponible !== false,
      creado_por: admin_id,
      creado_por_rol: 'administrador',
    }));

    const results = await AgendaMedico.createBulk(entries);

    // Auto-confirm admin-loaded schedules
    const start = new Date(fecha_inicio);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    await AgendaMedico.confirmarSemana(
      medico_id,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );

    await AuditService.log({
      usuario_id: admin_id,
      usuario_rol: 'administrador',
      accion: 'ADMIN_CARGAR_AGENDA',
      entidad: 'agenda_medico',
      entidad_id: null,
      datos_nuevos: { medico_id, fecha_inicio, bloques_count: bloques.length },
      req,
    });

    return results;
  }

  /**
   * Get available slots for a specific doctor on a date.
   */
  static async getAvailableSlots(medico_id, fecha) {
    return AgendaMedico.findAvailableSlots(medico_id, fecha);
  }
}

module.exports = ScheduleService;
