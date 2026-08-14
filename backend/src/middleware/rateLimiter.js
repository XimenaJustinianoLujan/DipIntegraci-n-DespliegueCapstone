const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const isTest = env.nodeEnv === 'test' || process.env.NODE_ENV === 'test';

const generalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: isTest ? 0 : env.rateLimitMaxRequests, // 0 = disabled in test
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Ha excedido el limite de solicitudes. Intente de nuevo mas tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 0 : 10,
  message: {
    error: 'Demasiados intentos',
    message: 'Demasiados intentos de autenticacion. Intente de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

module.exports = {
  generalLimiter,
  authLimiter,
};
