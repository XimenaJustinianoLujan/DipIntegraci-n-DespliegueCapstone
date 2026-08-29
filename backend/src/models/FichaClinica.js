const db = require('../config/database');

class FichaClinica {
  static async create({ paciente_id, cita_id, medico_id, diagnostico, indicaciones, receta, observaciones }) {
    const result = await db.query(
      `INSERT INTO ficha_clinica (paciente_id, cita_id, medico_id, diagnostico, indicaciones, receta, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [paciente_id, cita_id, medico_id, diagnostico, indicaciones || null, receta || null, observaciones || null]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM ficha_clinica WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByPaciente(paciente_id) {
    // medico_nombre va combinado (nombre + apellido) porque la UI del
    // paciente (MedicalRecord.jsx) lo muestra como un solo campo "Dr.
    // {medico_nombre}" -antes venian separados en medico_nombre/
    // medico_apellido y el apellido se perdia en silencio. c.fecha
    // tambien faltaba: la ficha en si no tiene columna de fecha propia
    // (usa el created_at del registro), la fecha real de la atencion es
    // la de la cita asociada.
    const result = await db.query(
      `SELECT fc.*,
              (m.nombre || ' ' || m.apellido) AS medico_nombre,
              e.nombre AS especialidad,
              c.fecha AS fecha
       FROM ficha_clinica fc
       JOIN medicos m ON fc.medico_id = m.id
       JOIN citas c ON fc.cita_id = c.id
       JOIN especialidades e ON c.especialidad_id = e.id
       WHERE fc.paciente_id = $1
       ORDER BY fc.created_at DESC`,
      [paciente_id]
    );
    return result.rows;
  }

  static async findByCita(cita_id) {
    const result = await db.query(
      'SELECT * FROM ficha_clinica WHERE cita_id = $1',
      [cita_id]
    );
    return result.rows[0] || null;
  }

  static async addDocumento({ ficha_clinica_id, nombre_archivo, tipo_archivo, ruta_archivo, tamano_bytes, descripcion, subido_por }) {
    const result = await db.query(
      `INSERT INTO documentos_adjuntos (ficha_clinica_id, nombre_archivo, tipo_archivo, ruta_archivo, tamano_bytes, descripcion, subido_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [ficha_clinica_id, nombre_archivo, tipo_archivo, ruta_archivo, tamano_bytes || null, descripcion || null, subido_por]
    );
    return result.rows[0];
  }

  static async getDocumentos(ficha_clinica_id) {
    const result = await db.query(
      'SELECT * FROM documentos_adjuntos WHERE ficha_clinica_id = $1 ORDER BY created_at DESC',
      [ficha_clinica_id]
    );
    return result.rows;
  }
}

module.exports = FichaClinica;
