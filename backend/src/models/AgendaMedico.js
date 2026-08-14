const db = require('../config/database');

class AgendaMedico {
  static async create({ medico_id, bloque_horario_id, fecha, disponible, creado_por, creado_por_rol }) {
    const result = await db.query(
      `INSERT INTO agenda_medico (medico_id, bloque_horario_id, fecha, disponible, creado_por, creado_por_rol)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (medico_id, bloque_horario_id, fecha)
       DO UPDATE SET disponible = $4, updated_at = NOW()
       RETURNING *`,
      [medico_id, bloque_horario_id, fecha, disponible !== false, creado_por || null, creado_por_rol || 'medico']
    );
    return result.rows[0];
  }

  static async createBulk(entries) {
    const results = [];
    for (const entry of entries) {
      const result = await AgendaMedico.create(entry);
      results.push(result);
    }
    return results;
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM agenda_medico WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByMedicoAndWeek(medico_id, startDate, endDate) {
    const result = await db.query(
      `SELECT am.*, bh.dia_semana, bh.hora_inicio, bh.hora_fin, bh.es_emergencia
       FROM agenda_medico am
       JOIN bloques_horarios bh ON am.bloque_horario_id = bh.id
       WHERE am.medico_id = $1 AND am.fecha BETWEEN $2 AND $3
       ORDER BY am.fecha ASC, bh.hora_inicio ASC`,
      [medico_id, startDate, endDate]
    );
    return result.rows;
  }

  static async findAvailableSlots(medico_id, fecha) {
    const result = await db.query(
      `SELECT am.*, bh.hora_inicio, bh.hora_fin, bh.dia_semana
       FROM agenda_medico am
       JOIN bloques_horarios bh ON am.bloque_horario_id = bh.id
       WHERE am.medico_id = $1 AND am.fecha = $2 AND am.disponible = TRUE
       AND am.id NOT IN (
         SELECT agenda_id FROM citas
         WHERE medico_id = $1 AND fecha = $2 AND estado != 'CANCELADA' AND deleted_at IS NULL
       )
       ORDER BY bh.hora_inicio ASC`,
      [medico_id, fecha]
    );
    return result.rows;
  }

  static async confirmarSemana(medico_id, startDate, endDate) {
    const result = await db.query(
      `UPDATE agenda_medico SET confirmado = TRUE, updated_at = NOW()
       WHERE medico_id = $1 AND fecha BETWEEN $2 AND $3
       RETURNING *`,
      [medico_id, startDate, endDate]
    );
    return result.rows;
  }

  static async getLastConfiguration(medico_id) {
    const result = await db.query(
      `SELECT DISTINCT ON (bh.dia_semana, bh.hora_inicio)
         am.bloque_horario_id, am.disponible, bh.dia_semana, bh.hora_inicio, bh.hora_fin
       FROM agenda_medico am
       JOIN bloques_horarios bh ON am.bloque_horario_id = bh.id
       WHERE am.medico_id = $1 AND am.confirmado = TRUE
       ORDER BY bh.dia_semana, bh.hora_inicio, am.fecha DESC`,
      [medico_id]
    );
    return result.rows;
  }

  static async hasUnconfirmedWeek(medico_id, startDate, endDate) {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM agenda_medico
       WHERE medico_id = $1 AND fecha BETWEEN $2 AND $3 AND confirmado = FALSE`,
      [medico_id, startDate, endDate]
    );
    return parseInt(result.rows[0].count, 10) > 0;
  }
}

module.exports = AgendaMedico;
