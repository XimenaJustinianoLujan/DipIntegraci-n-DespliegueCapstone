const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const { registerValidator, loginValidator, verifyEmailValidator } = require('../validators/auth.validator');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/register - Patient registration
router.post('/register', authLimiter, registerValidator, validate, async (req, res, next) => {
  try {
    const result = await AuthService.registerPaciente(req.body);
    res.status(201).json({
      message: 'Registro exitoso. Verifique su email.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, loginValidator, validate, async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const result = await AuthService.login({ email, username, password });
    res.json({
      message: 'Inicio de sesion exitoso',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', verifyEmailValidator, validate, async (req, res, next) => {
  try {
    const result = await AuthService.verifyEmail(req.body.token);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh-token
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Datos invalidos',
        message: 'Refresh token es requerido',
      });
    }
    const result = await AuthService.refreshToken(refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
