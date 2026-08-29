import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import StatusBreakdownBar from '../../components/charts/StatusBreakdownBar';
import { citaStatusClass } from '../../utils/citaStatus';
import { hoursUntilCita, findUpcomingWithin } from '../../utils/citaTiming';

const rawToday = new Date().toLocaleDateString('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const today = rawToday.charAt(0).toUpperCase() + rawToday.slice(1);

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayAppointments = async () => {
      try {
        const d = new Date().toISOString().slice(0, 10);
        const response = await api.get(`/citas/medico?fecha=${d}`);
        setTodayAppointments(response.data || []);
      } catch (err) {
        console.error('Error fetching today appointments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTodayAppointments();
  }, []);

  const confirmadas = todayAppointments.filter((c) => c.estado === 'CONFIRMADA').length;

  // Aviso en la app si la proxima cita CONFIRMADA arranca en menos de 2
  // horas -util para que el medico se organice sin depender de emails.
  const upcoming = findUpcomingWithin(
    todayAppointments.filter((c) => c.estado === 'CONFIRMADA'),
    2
  );

  const countsByEstado = useMemo(() => {
    const counts = {};
    for (const c of todayAppointments) counts[c.estado] = (counts[c.estado] || 0) + 1;
    return counts;
  }, [todayAppointments]);

  return (
    <div>
      <header style={styles.head}>
        <h1 style={styles.title}>Bienvenido, Dr. {user?.nombre}</h1>
        <p style={styles.subtitle}>Panel del medico · {today}</p>
      </header>

      {upcoming && (
        <div style={styles.reminderBanner} role="status">
          <span style={styles.reminderIcon}>🔔</span>
          <span>
            <strong>Proxima cita:</strong> {upcoming.cita.paciente_nombre || 'Paciente'}{' '}
            en {Math.max(0, Math.round(hoursUntilCita(upcoming.cita) * 60))} minutos
            {' '}({upcoming.cita.hora_inicio?.slice(0, 5)}).
          </span>
        </div>
      )}

      <section style={styles.stats}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{todayAppointments.length}</span>
          <span style={styles.statLabel}>Citas hoy</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValueAccent}>{confirmadas}</span>
          <span style={styles.statLabel}>Por atender</span>
        </div>
        <Link to="/medico/agenda" className="lift" style={styles.actionCard}>
          <span style={styles.actionIcon}>📅</span>
          <span style={styles.actionLabel}>Mi Agenda</span>
          <span style={styles.actionDesc}>Configure su disponibilidad</span>
        </Link>
        <Link to="/medico/atender" className="lift" style={styles.actionCard}>
          <span style={styles.actionIcon}>🩺</span>
          <span style={styles.actionLabel}>Atender Paciente</span>
          <span style={styles.actionDesc}>Complete fichas clinicas</span>
        </Link>
      </section>

      {!loading && todayAppointments.length > 0 && (
        <div style={styles.chartCard}>
          <StatusBreakdownBar counts={countsByEstado} title="Citas de hoy por estado" />
        </div>
      )}

      <h2 style={styles.sectionTitle}>Citas de hoy</h2>
      {loading ? (
        <div style={styles.skeletonWrap}>
          {[0, 1].map((i) => <div key={i} style={styles.skeleton} />)}
        </div>
      ) : todayAppointments.length === 0 ? (
        <div style={styles.emptyCard}>
          <span style={styles.emptyIcon}>☕</span>
          <p style={styles.emptyText}>No tiene citas programadas para hoy.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {todayAppointments.map((cita) => {
            return (
              <div key={cita.id} style={styles.card}>
                <div style={styles.cardLeft}>
                  <span style={styles.timePill}>{cita.hora_inicio}</span>
                  <strong style={styles.patient}>{cita.paciente_nombre || 'Paciente'}</strong>
                </div>
                <span className={citaStatusClass(cita.estado)}>
                  {cita.estado}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  head: { marginBottom: '1.75rem' },
  reminderBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.85rem 1.1rem',
    marginBottom: '1.5rem',
    backgroundColor: 'var(--color-warning-bg)',
    border: '1px solid #fde68a',
    borderRadius: 'var(--radius)',
    color: 'var(--color-text)',
    fontSize: '0.9rem',
  },
  reminderIcon: { fontSize: '1.2rem', flexShrink: 0 },
  title: { margin: '0 0 0.25rem', color: 'var(--color-text)', fontSize: '1.7rem' },
  subtitle: { margin: 0, color: 'var(--color-text-muted)' },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '2.25rem',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    padding: '1.35rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  statValue: { fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 },
  // Mismo numero, resaltado con el color de marca (para "por atender").
  statValueAccent: { fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 },
  statLabel: { fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    padding: '1.35rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    textDecoration: 'none',
    color: 'var(--color-text)',
  },
  actionIcon: { fontSize: '1.7rem' },
  actionLabel: { fontWeight: 700, fontSize: '0.98rem' },
  actionDesc: { fontSize: '0.8rem', color: 'var(--color-text-muted)' },
  chartCard: {
    padding: '1.35rem 1.5rem',
    marginBottom: '1.5rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  sectionTitle: { margin: '0 0 1rem', color: 'var(--color-text)', fontSize: '1.15rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    padding: '0.85rem 1.25rem',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  timePill: {
    padding: '0.3rem 0.7rem',
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-dark)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    fontWeight: 700,
  },
  patient: { color: 'var(--color-text)', fontSize: '0.98rem' },
  skeletonWrap: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  skeleton: {
    height: '58px',
    borderRadius: 'var(--radius)',
    background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-border) 50%, var(--color-surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.3s ease infinite',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '2.5rem 1.5rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius)',
    textAlign: 'center',
  },
  emptyIcon: { fontSize: '2.25rem' },
  emptyText: { margin: 0, color: 'var(--color-text-muted)' },
};
