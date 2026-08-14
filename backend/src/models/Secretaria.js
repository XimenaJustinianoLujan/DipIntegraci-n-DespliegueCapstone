const db = require('../config/database');

class Secretaria {
  static async create({ nombre, apellido, email, telefono, username, password_hash }) {
    const result = await db.query(
      `INSERT INTO secretarias (nombre, apellido, email, telefono, username, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, apellido, email, telefono || null, username, password_hash]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM secretarias WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByUsername(username) {
    const result = await db.query(
      'SELECT * FROM secretarias WHERE username = $1 AND deleted_at IS NULL',
      [username]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    const result = await db.query(
      'SELECT * FROM secretarias WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return result.rows[0] || null;
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    const result = await db.query(
      `UPDATE secretarias SET ${setClause}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  static async softDelete(id) {
    const result = await db.query(
      'UPDATE secretarias SET deleted_at = NOW(), activo = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = Secretaria;
