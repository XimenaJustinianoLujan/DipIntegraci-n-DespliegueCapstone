const AuditLog = require('../models/AuditLog');

class AuditService {
  static async log({ usuario_id, usuario_rol, accion, entidad, entidad_id, datos_anteriores, datos_nuevos, req }) {
    try {
      const ip_address = req ? (req.ip || req.connection.remoteAddress) : null;
      const user_agent = req ? req.get('User-Agent') : null;

      return await AuditLog.create({
        usuario_id,
        usuario_rol,
        accion,
        entidad,
        entidad_id,
        datos_anteriores,
        datos_nuevos,
        ip_address,
        user_agent,
      });
    } catch (error) {
      // Audit logging should not break the main flow
      console.error('Error logging audit entry:', error.message);
      return null;
    }
  }

  static async getByEntidad(entidad, entidad_id) {
    return AuditLog.findByEntidad(entidad, entidad_id);
  }

  static async getByUsuario(usuario_id, options) {
    return AuditLog.findByUsuario(usuario_id, options);
  }

  static async getAll(options) {
    return AuditLog.findAll(options);
  }
}

module.exports = AuditService;
