const db = require('../config/database');

class Especialidad {
  static async create({ nombre, descripcion }) {
    const result = await db.query(
      `INSERT INTO especialidades (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING *`,
      [nombre, descripcion || null]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM especialidades WHERE id = $1 AND activo = TRUE',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByNombre(nombre) {
    const result = await db.query(
      'SELECT * FROM especialidades WHERE nombre = $1 AND activo = TRUE',
      [nombre]
    );
    return result.rows[0] || null;
  }

  static async findAll() {
    const result = await db.query(
      'SELECT * FROM especialidades WHERE activo = TRUE ORDER BY nombre ASC'
    );
    return result.rows;
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    const result = await db.query(
      `UPDATE especialidades SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  static async deactivate(id) {
    const result = await db.query(
      'UPDATE especialidades SET activo = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = Especialidad;
