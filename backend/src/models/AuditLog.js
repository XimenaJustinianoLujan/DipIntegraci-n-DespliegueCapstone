const db = require('../config/database');

class AuditLog {
  static async create({ usuario_id, usuario_rol, accion, entidad, entidad_id, datos_anteriores, datos_nuevos, ip_address, user_agent }) {
    const result = await db.query(
      `INSERT INTO audit_log (usuario_id, usuario_rol, accion, entidad, entidad_id, datos_anteriores, datos_nuevos, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        usuario_id,
        usuario_rol,
        accion,
        entidad,
        entidad_id || null,
        datos_anteriores ? JSON.stringify(datos_anteriores) : null,
        datos_nuevos ? JSON.stringify(datos_nuevos) : null,
        ip_address || null,
        user_agent || null,
      ]
    );
    return result.rows[0];
  }

  static async findByEntidad(entidad, entidad_id) {
    const result = await db.query(
      'SELECT * FROM audit_log WHERE entidad = $1 AND entidad_id = $2 ORDER BY created_at DESC',
      [entidad, entidad_id]
    );
    return result.rows;
  }

  static async findByUsuario(usuario_id, { limit = 50, offset = 0 } = {}) {
    const result = await db.query(
      'SELECT * FROM audit_log WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [usuario_id, limit, offset]
    );
    return result.rows;
  }

  static async findAll({ limit = 50, offset = 0, accion, entidad } = {}) {
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];

    if (accion) {
      params.push(accion);
      query += ` AND accion = $${params.length}`;
    }

    if (entidad) {
      params.push(entidad);
      query += ` AND entidad = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = AuditLog;
