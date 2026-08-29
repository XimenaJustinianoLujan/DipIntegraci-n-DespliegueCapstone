const db = require('../config/database');

class Cita {
  static async create({ paciente_id, medico_id, especialidad_id, agenda_id, fecha, hora_inicio, hora_fin, motivo_consulta }) {
    const result = await db.query(
      `INSERT INTO citas (paciente_id, medico_id, especialidad_id, agenda_id, fecha, hora_inicio, hora_fin, motivo_consulta, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'CONFIRMADA')
       RETURNING *`,
      [paciente_id, medico_id, especialidad_id, agenda_id, fecha, hora_inicio, hora_fin, motivo_consulta || null]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM citas WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  // Trae el nombre del medico y la especialidad con LEFT JOIN (no INNER):
  // si el medico se dio de baja o la especialidad se desactivo, la cita
  // vieja se sigue viendo -solo con esos campos en null- en vez de
  // desaparecer de la lista o tirar un error.
  static async findByPaciente(paciente_id, { estado, limit = 20, offset = 0 } = {}) {
    let query = `
      SELECT c.*,
             (m.nombre || ' ' || m.apellido) AS medico_nombre,
             e.nombre AS especialidad
      FROM citas c
      LEFT JOIN medicos m ON m.id = c.medico_id
      LEFT JOIN especialidades e ON e.id = c.especialidad_id
      WHERE c.paciente_id = $1 AND c.deleted_at IS NULL`;
    const params = [paciente_id];

    if (estado) {
      params.push(estado);
      query += ` AND c.estado = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY c.fecha DESC, c.hora_inicio ASC LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await db.query(query, params);
    return result.rows;
  }

  static async findByMedico(medico_id, { fecha, estado, limit = 20, offset = 0 } = {}) {
    let query = `
      SELECT c.*,
             (p.nombre || ' ' || p.apellido) AS paciente_nombre,
             e.nombre AS especialidad
      FROM citas c
      LEFT JOIN pacientes p ON p.id = c.paciente_id
      LEFT JOIN especialidades e ON e.id = c.especialidad_id
      WHERE c.medico_id = $1 AND c.deleted_at IS NULL`;
    const params = [medico_id];

    if (fecha) {
      params.push(fecha);
      query += ` AND c.fecha = $${params.length}`;
    }

    if (estado) {
      params.push(estado);
      query += ` AND c.estado = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY c.fecha ASC, c.hora_inicio ASC LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await db.query(query, params);
    return result.rows;
  }

  static async countActivasByPaciente(paciente_id) {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM citas
       WHERE paciente_id = $1 AND estado IN ('CONFIRMADA', 'RECONSULTA') AND deleted_at IS NULL`,
      [paciente_id]
    );
    return parseInt(result.rows[0].count, 10);
  }

  static async hasActiveInEspecialidad(paciente_id, especialidad_id) {
    const result = await db.query(
      `SELECT id FROM citas
       WHERE paciente_id = $1 AND especialidad_id = $2
       AND estado IN ('CONFIRMADA', 'RECONSULTA') AND deleted_at IS NULL
       LIMIT 1`,
      [paciente_id, especialidad_id]
    );
    return result.rows.length > 0;
  }

  static async hasActiveWithMedico(paciente_id, medico_id) {
    const result = await db.query(
      `SELECT id FROM citas
       WHERE paciente_id = $1 AND medico_id = $2
       AND estado IN ('CONFIRMADA', 'RECONSULTA') AND deleted_at IS NULL
       LIMIT 1`,
      [paciente_id, medico_id]
    );
    return result.rows.length > 0;
  }

  static async updateEstado(id, estado, extraFields = {}) {
    const fields = { estado, ...extraFields };
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    const result = await db.query(
      `UPDATE citas SET ${setClause}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  static async cancelar(id, { motivo_cancelacion, cancelado_por, cancelado_por_rol }) {
    const result = await db.query(
      `UPDATE citas SET estado = 'CANCELADA', motivo_cancelacion = $2, cancelado_por = $3,
       cancelado_por_rol = $4, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, motivo_cancelacion || null, cancelado_por, cancelado_por_rol]
    );
    return result.rows[0] || null;
  }

  static async completar(id) {
    const result = await db.query(
      `UPDATE citas SET estado = 'COMPLETADA', updated_at = NOW()
       WHERE id = $1 AND estado = 'CONFIRMADA' AND deleted_at IS NULL RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async marcarNoShow(id) {
    const result = await db.query(
      `UPDATE citas SET estado = 'NO_SHOW', updated_at = NOW()
       WHERE id = $1 AND estado = 'CONFIRMADA' AND deleted_at IS NULL RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async marcarReconsulta(id) {
    const result = await db.query(
      `UPDATE citas SET estado = 'RECONSULTA', updated_at = NOW()
       WHERE id = $1 AND estado = 'NO_SHOW' AND deleted_at IS NULL RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByFecha(fecha, { estado, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT c.*,
             (p.nombre || ' ' || p.apellido) AS paciente_nombre,
             (m.nombre || ' ' || m.apellido) AS medico_nombre,
             e.nombre AS especialidad
      FROM citas c
      LEFT JOIN pacientes p ON p.id = c.paciente_id
      LEFT JOIN medicos m ON m.id = c.medico_id
      LEFT JOIN especialidades e ON e.id = c.especialidad_id
      WHERE c.fecha = $1 AND c.deleted_at IS NULL`;
    const params = [fecha];

    if (estado) {
      params.push(estado);
      query += ` AND c.estado = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY c.hora_inicio ASC LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await db.query(query, params);
    return result.rows;
  }

  // Nota privada del medico tratante sobre la cita (nunca visible para
  // el paciente ni la secretaria - ver backend/src/utils/sanitizeCita.js).
  static async updateNotas(id, notas) {
    const result = await db.query(
      'UPDATE citas SET notas = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *',
      [id, notas]
    );
    return result.rows[0] || null;
  }

  static async isSlotAvailable(medico_id, fecha, hora_inicio) {
    const result = await db.query(
      `SELECT id FROM citas
       WHERE medico_id = $1 AND fecha = $2 AND hora_inicio = $3
       AND estado != 'CANCELADA' AND deleted_at IS NULL
       LIMIT 1`,
      [medico_id, fecha, hora_inicio]
    );
    return result.rows.length === 0;
  }
}

module.exports = Cita;
