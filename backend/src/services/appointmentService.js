const Cita = require('../models/Cita');
const AgendaMedico = require('../models/AgendaMedico');
const Medico = require('../models/Medico');
const Paciente = require('../models/Paciente');
const AuditService = require('./auditService');
const NotificationService = require('./notificationService');

class AppointmentService {
  /**
   * Create a new appointment with all business rules validated:
   * - Max 3 active appointments per patient in different specialties
   * - Cannot book same doctor or same specialty if already has pending appointment
   * - Minimum 24h ahead (exception: doctor has free slot)
   * - Slot must be available
   * - State starts as CONFIRMADA
   */
  static async createAppointment({ paciente_id, medico_id, especialidad_id, fecha, hora_inicio, motivo_consulta }, req) {
    // Validate patient exists
    const paciente = await Paciente.findById(paciente_id);
    if (!paciente) {
      const error = new Error('Paciente no encontrado');
      error.status = 404;
      error.type = 'NotFoundError';
      throw error;
    }

    // Validate doctor exists and is active
    const medico = await Medico.findById(medico_id);
    if (!medico) {
      const error = new Error('Medico no encontrado');
      error.status = 404;
      error.type = 'NotFoundError';
      throw error;
    }

    if (medico.estado !== 'ACTIVO') {
      const error = new Error('El medico no esta disponible actualmente');
      error.status = 400;
      throw error;
    }

    // Rule: Max 3 active appointments per patient
    const activeCount = await Cita.countActivasByPaciente(paciente_id);
    if (activeCount >= 3) {
      const error = new Error('No puede tener mas de 3 citas activas simultaneamente');
      error.status = 400;
      throw error;
    }

    // Rule: Cannot book same specialty if already has pending appointment
    const hasSpecialty = await Cita.hasActiveInEspecialidad(paciente_id, especialidad_id);
    if (hasSpecialty) {
      const error = new Error('Ya tiene una cita activa en esta especialidad');
      error.status = 409;
      error.type = 'ConflictError';
      throw error;
    }

    // Rule: Cannot book same doctor if already has pending appointment
    const hasDoctor = await Cita.hasActiveWithMedico(paciente_id, medico_id);
    if (hasDoctor) {
      const error = new Error('Ya tiene una cita activa con este medico');
      error.status = 409;
      error.type = 'ConflictError';
      throw error;
    }

    // Rule: Minimum 24h ahead
    const appointmentDateTime = new Date(`${fecha}T${hora_inicio}`);
    const now = new Date();
    const hoursAhead = (appointmentDateTime - now) / (1000 * 60 * 60);

    if (hoursAhead < 24) {
      // Exception: check if doctor has free slot (immediate availability)
      const availableSlots = await AgendaMedico.findAvailableSlots(medico_id, fecha);
      const hasSlot = availableSlots.some(
        (slot) => slot.hora_inicio.substring(0, 5) === hora_inicio
      );

      if (!hasSlot) {
        const error = new Error('Las citas deben agendarse con al menos 24 horas de anticipacion');
        error.status = 400;
        throw error;
      }
    }

    // Check slot availability
    const isAvailable = await Cita.isSlotAvailable(medico_id, fecha, hora_inicio);
    if (!isAvailable) {
      const error = new Error('El horario seleccionado ya esta ocupado');
      error.status = 409;
      error.type = 'ConflictError';
      throw error;
    }

    // Find the agenda entry for this slot
    const availableSlots = await AgendaMedico.findAvailableSlots(medico_id, fecha);
    const agendaSlot = availableSlots.find(
      (slot) => slot.hora_inicio.substring(0, 5) === hora_inicio
    );

    if (!agendaSlot) {
      const error = new Error('El horario no esta disponible en la agenda del medico');
      error.status = 400;
      throw error;
    }

    // Calculate hora_fin (1 hour after hora_inicio)
    const [hours, minutes] = hora_inicio.split(':').map(Number);
    const hora_fin = `${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Create the appointment (starts as CONFIRMADA)
    const cita = await Cita.create({
      paciente_id,
      medico_id,
      especialidad_id,
      agenda_id: agendaSlot.id,
      fecha,
      hora_inicio,
      hora_fin,
      motivo_consulta,
    });

    // Audit log
    await AuditService.log({
      usuario_id: paciente_id,
      usuario_rol: 'paciente',
      accion: 'CREAR_CITA',
      entidad: 'citas',
      entidad_id: cita.id,
      datos_nuevos: cita,
      req,
    });

    // Send confirmation email
    await NotificationService.sendAppointmentConfirmation({
      pacienteEmail: paciente.email,
      pacienteNombre: paciente.nombre,
      medicoNombre: `${medico.nombre} ${medico.apellido}`,
      fecha,
      hora: hora_inicio,
      especialidad: especialidad_id,
    });

    return cita;
  }

  /**
   * Cancel an appointment by patient.
   * Must be at least 2 hours before appointment time.
   */
  static async cancelByPaciente(citaId, { paciente_id, motivo_cancelacion }, req) {
    const cita = await Cita.findById(citaId);
    if (!cita) {
      const error = new Error('Cita no encontrada');
      error.status = 404;
      error.type = 'NotFoundError';
      throw error;
    }

    if (cita.paciente_id !== paciente_id) {
      const error = new Error('No tiene permisos para cancelar esta cita');
      error.status = 403;
      throw error;
    }

    if (cita.estado !== 'CONFIRMADA') {
      const error = new Error('Solo se pueden cancelar citas en estado CONFIRMADA');
      error.status = 400;
      throw error;
    }

    // Rule: Cancel at least 2 hours before
    const appointmentDateTime = new Date(`${cita.fecha}T${cita.hora_inicio}`);
    const now = new Date();
    const hoursUntil = (appointmentDateTime - now) / (1000 * 60 * 60);

    if (hoursUntil < 2) {
      const error = new Error('Las citas deben cancelarse con al menos 2 horas de anticipacion');
      error.status = 400;
      throw error;
    }

    const updated = await Cita.cancelar(citaId, {
      motivo_cancelacion,
      cancelado_por: paciente_id,
      cancelado_por_rol: 'paciente',
    });

    await AuditService.log({
      usuario_id: paciente_id,
      usuario_rol: 'paciente',
      accion: 'CANCELAR_CITA',
      entidad: 'citas',
      entidad_id: citaId,
      datos_anteriores: { estado: cita.estado },
      datos_nuevos: { estado: 'CANCELADA', motivo_cancelacion },
      req,
    });

    return updated;
  }

  /**
   * Cancel by admin (emergency). Sends notification to patient.
   */
  static async cancelByAdmin(citaId, { admin_id, motivo_cancelacion }, req) {
    const cita = await Cita.findById(citaId);
    if (!cita) {
      const error = new Error('Cita no encontrada');
      error.status = 404;
      error.type = 'NotFoundError';
      throw error;
    }

    if (cita.estado === 'CANCELADA' || cita.estado === 'COMPLETADA') {
      const error = new Error('No se puede cancelar una cita en este estado');
      error.status = 400;
      throw error;
    }

    const updated = await Cita.cancelar(citaId, {
      motivo_cancelacion,
      cancelado_por: admin_id,
      cancelado_por_rol: 'administrador',
    });

    // Notify patient
    const paciente = await Paciente.findById(cita.paciente_id);
    const medico = await Medico.findById(cita.medico_id);

    if (paciente) {
      await NotificationService.sendCancellationNotification({
        pacienteEmail: paciente.email,
        pacienteNombre: paciente.nombre,
        medicoNombre: medico ? `${medico.nombre} ${medico.apellido}` : 'N/A',
        fecha: cita.fecha,
        hora: cita.hora_inicio,
        motivo: motivo_cancelacion,
      });
    }

    await AuditService.log({
      usuario_id: admin_id,
      usuario_rol: 'administrador',
      accion: 'CANCELAR_CITA_ADMIN',
      entidad: 'citas',
      entidad_id: citaId,
      datos_anteriores: { estado: cita.estado },
      datos_nuevos: { estado: 'CANCELADA', motivo_cancelacion },
      req,
    });

    return updated;
  }

  /**
   * Mark appointment as NO_SHOW (doctor or secretary)
   */
  static async markNoShow(citaId, { usuario_id, usuario_rol }, req) {
    const cita = await Cita.findById(citaId);
    if (!cita) {
      const error = new Error('Cita no encontrada');
      error.status = 404;
      error.type = 'NotFoundError';
      throw error;
    }

    if (cita.estado !== 'CONFIRMADA') {
      const error = new Error('Solo se puede marcar NO_SHOW a citas CONFIRMADAS');
      error.status = 400;
      throw error;
    }

    // Doctors can only mark their own appointments as NO_SHOW
    if (usuario_rol === 'medico' && cita.medico_id !== usuario_id) {
      const error = new Error('Solo puede marcar NO_SHOW a sus propias citas');
      error.status = 403;
      throw error;
    }

    const updated = await Cita.marcarNoShow(citaId);

    await AuditService.log({
      usuario_id,
      usuario_rol,
      accion: 'MARCAR_NO_SHOW',
      entidad: 'citas',
      entidad_id: citaId,
      datos_anteriores: { estado: 'CONFIRMADA' },
      datos_nuevos: { estado: 'NO_SHOW' },
      req,
    });

    return updated;
  }

  /**
   * Mark as RECONSULTA (secretary only, from NO_SHOW state)
   */
  static async markReconsulta(citaId, { usuario_id }, req) {
    const cita = await Cita.findById(citaId);
    if (!cita) {
      const error = new Error('Cita no encontrada');
      error.status = 404;
      error.type = 'NotFoundError';
      throw error;
    }

    if (cita.estado !== 'NO_SHOW') {
      const error = new Error('Solo se puede marcar RECONSULTA a citas en estado NO_SHOW');
      error.status = 400;
      throw error;
    }

    const updated = await Cita.marcarReconsulta(citaId);

    await AuditService.log({
      usuario_id,
      usuario_rol: 'secretaria',
      accion: 'MARCAR_RECONSULTA',
      entidad: 'citas',
      entidad_id: citaId,
      datos_anteriores: { estado: 'NO_SHOW' },
      datos_nuevos: { estado: 'RECONSULTA' },
      req,
    });

    return updated;
  }
}

module.exports = AppointmentService;
