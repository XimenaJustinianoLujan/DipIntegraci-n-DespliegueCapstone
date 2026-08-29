import dayjs from 'dayjs';

// Horas que faltan para que arranque una cita (fecha 'YYYY-MM-DD' +
// hora_inicio 'HH:MM' o 'HH:MM:SS', como llegan del backend). Negativo
// si ya paso. Se usa para las alertas de "cita proxima" en los
// dashboards -sin mandar ningun email, solo un aviso al entrar a la app.
export function hoursUntilCita(cita) {
  if (!cita?.fecha || !cita?.hora_inicio) return null;
  const start = dayjs(`${String(cita.fecha).slice(0, 10)}T${cita.hora_inicio.slice(0, 5)}`);
  if (!start.isValid()) return null;
  return start.diff(dayjs(), 'hour', true);
}

// La proxima cita confirmada que arranca dentro de las proximas
// `withinHours` horas (y no paso ya), o null si no hay ninguna.
export function findUpcomingWithin(citas, withinHours) {
  const upcoming = (citas || [])
    .map((cita) => ({ cita, hours: hoursUntilCita(cita) }))
    .filter(({ hours }) => hours !== null && hours >= 0 && hours <= withinHours)
    .sort((a, b) => a.hours - b.hours);
  return upcoming[0] || null;
}
