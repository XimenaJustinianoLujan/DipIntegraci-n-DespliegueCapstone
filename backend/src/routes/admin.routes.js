const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Apply auth and admin-only to every /api/admin/* route once, aqui, antes
// de delegar a los subrouters por dominio. El archivo completo llego a
// tener 426 lineas mezclando 5 dominios distintos (citas, turnos domingo,
// stats, medicos, especialidades); se dividio en backend/src/routes/admin/
// para que cada uno sea mas facil de ubicar y de testear por separado.
// Las rutas publicas (/api/admin/...) no cambian.
router.use(auth, authorize('administrador'));

router.use('/citas', require('./admin/citas.routes'));
router.use('/turnos-domingo', require('./admin/turnosDomingo.routes'));
router.use('/stats', require('./admin/stats.routes'));
router.use('/medicos', require('./admin/medicos.routes'));
router.use('/especialidades', require('./admin/especialidades.routes'));

module.exports = router;
