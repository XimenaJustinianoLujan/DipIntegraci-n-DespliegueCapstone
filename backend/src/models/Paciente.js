const db = require('../config/database');

class Paciente {
  static async create({ nombre, apellido, segundo_apellido, email, telefono, fecha_nacimiento, password_hash }) {
    const result = await db.query(
      `INSERT INTO pacientes (nombre, apellido, segundo_apellido, email, telefono, fecha_nacimiento, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nombre, apellido, segundo_apellido || null, email, telefono || null, fecha_nacimiento || null, password_hash]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM pacientes WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    const result = await db.query(
      'SELECT * FROM pacientes WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return result.rows[0] || null;
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    const result = await db.query(
      `UPDATE pacientes SET ${setClause}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  static async verifyEmail(id) {
    const result = await db.query(
      'UPDATE pacientes SET email_verificado = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }

  static async softDelete(id) {
    const result = await db.query(
      'UPDATE pacientes SET deleted_at = NOW(), activo = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findAll({ limit = 20, offset = 0 } = {}) {
    const result = await db.query(
      'SELECT * FROM pacientes WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }
}

module.exports = Paciente;
