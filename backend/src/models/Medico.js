const db = require('../config/database');

class Medico {
  /**
   * Generate doctor username following rules:
   * 1. First letter of name + last name (lowercase)
   * 2. If collision: + first letter of second last name
   * 3. If no second last name: two first letters of name + last name
   */
  static async generateUsername(nombre, apellido, segundo_apellido) {
    const normalizedNombre = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedApellido = apellido.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Strategy 1: first letter of name + last name
    let username = normalizedNombre.charAt(0) + normalizedApellido;
    const exists1 = await Medico.usernameExists(username);

    if (!exists1) return username;

    // Strategy 2: + first letter of second last name
    if (segundo_apellido) {
      const normalizedSegundo = segundo_apellido.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      username = normalizedNombre.charAt(0) + normalizedApellido + normalizedSegundo.charAt(0);
      const exists2 = await Medico.usernameExists(username);
      if (!exists2) return username;
    }

    // Strategy 3: two first letters of name + last name
    username = normalizedNombre.substring(0, 2) + normalizedApellido;
    const exists3 = await Medico.usernameExists(username);
    if (!exists3) return username;

    // Fallback: add numeric suffix
    let counter = 1;
    let finalUsername = username + counter;
    while (await Medico.usernameExists(finalUsername)) {
      counter++;
      finalUsername = username + counter;
    }
    return finalUsername;
  }

  static async usernameExists(username) {
    const result = await db.query(
      'SELECT id FROM medicos WHERE username = $1',
      [username]
    );
    return result.rows.length > 0;
  }

  static async create({ nombre, apellido, segundo_apellido, email, telefono, password_hash, especialidad_id }) {
    const username = await Medico.generateUsername(nombre, apellido, segundo_apellido);

    const result = await db.query(
      `INSERT INTO medicos (nombre, apellido, segundo_apellido, email, telefono, username, password_hash, especialidad_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nombre, apellido, segundo_apellido || null, email, telefono || null, username, password_hash, especialidad_id || null]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM medicos WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByUsername(username) {
    const result = await db.query(
      'SELECT * FROM medicos WHERE username = $1 AND deleted_at IS NULL',
      [username]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    const result = await db.query(
      'SELECT * FROM medicos WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findAll({ especialidad_id, estado, limit = 20, offset = 0 } = {}) {
    let query = 'SELECT * FROM medicos WHERE deleted_at IS NULL';
    const params = [];

    if (especialidad_id) {
      params.push(especialidad_id);
      query += ` AND especialidad_id = $${params.length}`;
    }

    if (estado) {
      params.push(estado);
      query += ` AND estado = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY apellido ASC LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await db.query(query, params);
    return result.rows;
  }

  static async updateEstado(id, estado) {
    const result = await db.query(
      'UPDATE medicos SET estado = $2, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *',
      [id, estado]
    );
    return result.rows[0] || null;
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    const result = await db.query(
      `UPDATE medicos SET ${setClause}, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  static async softDelete(id) {
    const result = await db.query(
      'UPDATE medicos SET deleted_at = NOW(), activo = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = Medico;
