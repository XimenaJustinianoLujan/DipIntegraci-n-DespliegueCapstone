const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Paciente = require('../models/Paciente');
const Medico = require('../models/Medico');
const Administrador = require('../models/Administrador');
const Secretaria = require('../models/Secretaria');
const NotificationService = require('./notificationService');

class AuthService {
  static generateToken(payload) {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  }

  static generateRefreshToken(payload) {
    return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn });
  }

  static generateEmailVerificationToken(userId) {
    return jwt.sign({ id: userId, purpose: 'email_verification' }, env.jwtSecret, { expiresIn: '24h' });
  }

  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  static async registerPaciente({ nombre, apellido, segundo_apellido, email, password, telefono, fecha_nacimiento }) {
    // Check if email already exists
    const existing = await Paciente.findByEmail(email);
    if (existing) {
      const error = new Error('El email ya esta registrado');
      error.status = 409;
      error.type = 'ConflictError';
      throw error;
    }

    const password_hash = await AuthService.hashPassword(password);

    const paciente = await Paciente.create({
      nombre,
      apellido,
      segundo_apellido,
      email,
      telefono,
      fecha_nacimiento,
      password_hash,
    });

    // Send email verification
    const verificationToken = AuthService.generateEmailVerificationToken(paciente.id);
    await NotificationService.sendEmailVerification({
      email: paciente.email,
      nombre: paciente.nombre,
      token: verificationToken,
    });

    return {
      user: {
        id: paciente.id,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        email: paciente.email,
        role: 'paciente',
        email_verificado: paciente.email_verificado,
      },
      message: 'Registro exitoso. Por favor verifique su email para iniciar sesion.',
    };
  }

  static async login({ email, username, password }) {
    let user = null;
    let role = null;

    // Try to find user by email or username across all role tables
    if (email) {
      // Search in all tables by email
      user = await Paciente.findByEmail(email);
      if (user) { role = 'paciente'; }

      if (!user) {
        user = await Medico.findByEmail(email);
        if (user) { role = 'medico'; }
      }

      if (!user) {
        user = await Administrador.findByEmail(email);
        if (user) { role = 'administrador'; }
      }

      if (!user) {
        user = await Secretaria.findByEmail(email);
        if (user) { role = 'secretaria'; }
      }
    }

    if (!user && username) {
      // Search by username (medico, admin, secretaria)
      user = await Medico.findByUsername(username);
      if (user) { role = 'medico'; }

      if (!user) {
        user = await Administrador.findByUsername(username);
        if (user) { role = 'administrador'; }
      }

      if (!user) {
        user = await Secretaria.findByUsername(username);
        if (user) { role = 'secretaria'; }
      }
    }

    if (!user) {
      const error = new Error('Credenciales invalidas');
      error.status = 401;
      throw error;
    }

    const passwordValid = await AuthService.comparePassword(password, user.password_hash);
    if (!passwordValid) {
      const error = new Error('Credenciales invalidas');
      error.status = 401;
      throw error;
    }

    // Check if patient email is verified
    if (role === 'paciente' && !user.email_verificado) {
      const error = new Error('Debe verificar su email antes de iniciar sesion');
      error.status = 403;
      throw error;
    }

    const token = AuthService.generateToken({
      id: user.id,
      role,
      email: user.email,
    });

    const refreshToken = AuthService.generateRefreshToken({
      id: user.id,
      role,
    });

    return {
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        role,
        username: user.username || undefined,
      },
      token,
      refreshToken,
    };
  }

  static async verifyEmail(token) {
    try {
      const decoded = jwt.verify(token, env.jwtSecret);

      if (decoded.purpose !== 'email_verification') {
        const error = new Error('Token invalido');
        error.status = 400;
        throw error;
      }

      const paciente = await Paciente.verifyEmail(decoded.id);
      if (!paciente) {
        const error = new Error('Paciente no encontrado');
        error.status = 404;
        error.type = 'NotFoundError';
        throw error;
      }

      return { message: 'Email verificado exitosamente' };
    } catch (err) {
      if (err.status) throw err;
      const error = new Error('Token de verificacion invalido o expirado');
      error.status = 400;
      throw error;
    }
  }

  static async refreshToken(refreshTokenValue) {
    try {
      const decoded = jwt.verify(refreshTokenValue, env.jwtRefreshSecret);

      const token = AuthService.generateToken({
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
      });

      return { token };
    } catch (err) {
      const error = new Error('Refresh token invalido o expirado');
      error.status = 401;
      throw error;
    }
  }
}

module.exports = AuthService;
