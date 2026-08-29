const express = require('express');
const router = express.Router();
const db = require('../../config/database');

// GET /api/admin/stats - Dashboard summary: totals, status breakdown for today
// and appointment volume for the last 7 days (used by the admin charts).
router.get('/', async (req, res, next) => {
  try {
    const [doctorsResult, todayResult, porEstadoResult, ultimos7Result] = await Promise.all([
      db.query("SELECT COUNT(*)::int AS count FROM medicos WHERE estado = 'ACTIVO'"),
      db.query('SELECT COUNT(*)::int AS count FROM citas WHERE fecha = CURRENT_DATE'),
      db.query(
        `SELECT estado, COUNT(*)::int AS count
         FROM citas
         WHERE fecha = CURRENT_DATE
         GROUP BY estado
         ORDER BY estado`
      ),
      db.query(
        `SELECT d::date AS fecha, COUNT(c.id)::int AS count
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d
         LEFT JOIN citas c ON c.fecha = d::date AND c.estado != 'CANCELADA'
         GROUP BY d
         ORDER BY d`
      ),
    ]);

    res.json({
      doctors: doctorsResult.rows[0].count,
      todayCitas: todayResult.rows[0].count,
      porEstado: porEstadoResult.rows,
      ultimos7dias: ultimos7Result.rows,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
