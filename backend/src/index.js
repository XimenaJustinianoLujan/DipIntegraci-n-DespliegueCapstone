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

// CORS configuration.
// Acepta: desarrollo local, cualquier URL listada en FRONTEND_URL (separadas por
// coma) y cualquier despliegue de Vercel (*.vercel.app), asi funcionan tanto la URL
// de produccion como las de preview. Se ignoran las barras finales.
const normalizeOrigin = (url) => url.trim().replace(/\/+$/, '');

const allowedOrigins = ['http://localhost:5173'];
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',')
    .map(normalizeOrigin)
    .filter(Boolean)
    .forEach((o) => allowedOrigins.push(o));
}

app.use(cors({
  origin: (origin, callback) => {
    // Permitir clientes sin Origin (curl, apps moviles, health checks).
    if (!origin) return callback(null, true);
    const cleaned = normalizeOrigin(origin);
    const isAllowed =
      allowedOrigins.includes(cleaned) ||
      /^https?:\/\/[^/]+\.vercel\.app$/.test(cleaned);
    return isAllowed
      ? callback(null, true)
      : callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
}));

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

// Start the HTTP server only when this file is run directly (e.g. `node src/index.js`
// or `npm run dev`). On serverless platforms like Vercel the module is imported, so
// require.main !== module and we must NOT bind a port — Vercel handles the HTTP layer.
if (require.main === module && process.env.NODE_ENV !== 'test') {
  const PORT = env.port;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${env.nodeEnv} mode`);
  });
}

module.exports = app;
