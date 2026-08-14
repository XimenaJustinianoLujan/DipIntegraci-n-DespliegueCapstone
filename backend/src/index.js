const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const pacientesRoutes = require('./routes/pacientes.routes');
const medicosRoutes = require('./routes/medicos.routes');
const citasRoutes = require('./routes/citas.routes');
const agendaRoutes = require('./routes/agenda.routes');
const fichaClinicaRoutes = require('./routes/fichaClinica.routes');
const adminRoutes = require('./routes/admin.routes');
const secretariaRoutes = require('./routes/secretaria.routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/medicos', medicosRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/fichas-clinicas', fichaClinicaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/secretaria', secretariaRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'No encontrado',
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
  });
});

// Error handler
app.use(errorHandler);

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const PORT = env.port;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${env.nodeEnv} mode`);
  });
}

module.exports = app;
