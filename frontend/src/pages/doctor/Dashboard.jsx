import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const statusColors = {
  CONFIRMADA: { bg: '#dbeafe', color: '#1d4ed8' },
  COMPLETADA: { bg: '#dcfce7', color: '#16a34a' },
  CANCELADA: { bg: '#fee2e2', color: '#dc2626' },
  NO_SHOW: { bg: '#fef3c7', color: '#d97706' },
  RECONSULTA: { bg: '#e0e7ff', color: '#4f46e5' },
};

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

  return (
    <div>
      <header style={styles.head}>
        <h1 style={styles.title}>Bienvenido, Dr. {user?.nombre}</h1>
        <p style={styles.subtitle}>Panel del medico · {today}</p>
      </header>

      <section style={styles.stats}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{todayAppointments.length}</span>
          <span style={styles.statLabel}>Citas hoy</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ ...styles.statValue, color: 'var(--color-primary)' }}>{confirmadas}</span>
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
            const c = statusColors[cita.estado] || { bg: '#f1f5f9', color: '#475569' };
            return (
              <div key={cita.id} style={styles.card}>
                <div style={styles.cardLeft}>
                  <span style={styles.timePill}>{cita.hora_inicio}</span>
                  <strong style={styles.patient}>{cita.paciente_nombre || 'Paciente'}</strong>
                </div>
                <span className="badge" style={{ backgroundColor: c.bg, color: c.color }}>
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
