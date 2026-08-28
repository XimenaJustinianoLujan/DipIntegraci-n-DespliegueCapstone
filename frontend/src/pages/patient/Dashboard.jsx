import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { EmptyCalendar } from '../../components/illustrations/EmptyState';

const statusColors = {
  CONFIRMADA: { bg: '#dbeafe', color: '#1d4ed8' },
  COMPLETADA: { bg: '#dcfce7', color: '#16a34a' },
  CANCELADA: { bg: '#fee2e2', color: '#dc2626' },
  NO_SHOW: { bg: '#fef3c7', color: '#d97706' },
  RECONSULTA: { bg: '#e0e7ff', color: '#4f46e5' },
};

const actions = [
  { to: '/paciente/agendar', icon: '📅', label: 'Agendar Cita', desc: 'Reserve un nuevo turno' },
  { to: '/paciente/mis-citas', icon: '📋', label: 'Mis Citas', desc: 'Historial y estados' },
  { to: '/paciente/ficha-clinica', icon: '📄', label: 'Ficha Clinica', desc: 'Diagnosticos y recetas' },
  { to: '/paciente/perfil', icon: '👤', label: 'Mi Perfil', desc: 'Sus datos personales' },
];

const rawToday = new Date().toLocaleDateString('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const today = rawToday.charAt(0).toUpperCase() + rawToday.slice(1);

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data } = await api.get(`/pacientes/${user.id}/citas?estado=CONFIRMADA`);
        setAppointments((data || []).slice(0, 5));
      } catch (err) {
        console.error('Error fetching appointments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [user.id]);

  return (
    <div>
      <header style={styles.head}>
        <h1 style={styles.title}>Hola, {user?.nombre} 👋</h1>
        <p style={styles.subtitle}>
          Panel del paciente · {today}
        </p>
      </header>

      <section style={styles.actions}>
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="lift" style={styles.actionCard}>
            <span style={styles.actionIcon}>{a.icon}</span>
            <span style={styles.actionLabel}>{a.label}</span>
            <span style={styles.actionDesc}>{a.desc}</span>
          </Link>
        ))}
      </section>

      <div style={styles.sectionHead}>
        <h2 style={styles.sectionTitle}>Proximas citas</h2>
        <Link to="/paciente/mis-citas" style={styles.seeAll}>Ver todas →</Link>
      </div>

      {loading ? (
        <div style={styles.skeletonWrap}>
          {[0, 1].map((i) => <div key={i} style={styles.skeleton} />)}
        </div>
      ) : appointments.length === 0 ? (
        <div style={styles.emptyCard}>
          <EmptyCalendar size={72} />
          <p style={styles.emptyText}>No tiene citas confirmadas.</p>
          <Link to="/paciente/agendar" style={styles.emptyBtn}>Agendar una cita</Link>
        </div>
      ) : (
        <div style={styles.list}>
          {appointments.map((cita) => {
            const c = statusColors[cita.estado] || { bg: '#f1f5f9', color: '#475569' };
            return (
              <div key={cita.id} style={styles.card}>
                <div style={styles.cardLeft}>
                  <span style={styles.dateBadge}>
                    <span style={styles.dateDay}>
                      {cita.fecha ? String(cita.fecha).slice(8, 10) : '--'}
                    </span>
                    <span style={styles.dateMonth}>
                      {cita.fecha
                        ? new Date(cita.fecha).toLocaleDateString('es-ES', { month: 'short' })
                        : ''}
                    </span>
                  </span>
                  <div>
                    <strong style={styles.doctor}>{cita.medico_nombre || 'Medico asignado'}</strong>
                    <p style={styles.meta}>
                      🕐 {cita.hora_inicio}
                      {cita.especialidad ? ` · ${cita.especialidad}` : ''}
                    </p>
                  </div>
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
  date: { textTransform: 'capitalize' },
  actions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2.25rem',
  },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    padding: '1.35rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    textDecoration: 'none',
    color: 'var(--color-text)',
  },
  actionIcon: { fontSize: '1.8rem', marginBottom: '0.25rem' },
  actionLabel: { fontWeight: 700, fontSize: '1rem' },
  actionDesc: { fontSize: '0.82rem', color: 'var(--color-text-muted)' },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  sectionTitle: { margin: 0, color: 'var(--color-text)', fontSize: '1.15rem' },
  seeAll: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  dateBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    height: '52px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-dark)',
    flexShrink: 0,
  },
  dateDay: { fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 },
  dateMonth: { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' },
  doctor: { color: 'var(--color-text)', fontSize: '0.98rem' },
  meta: { margin: '0.2rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' },
  skeletonWrap: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  skeleton: {
    height: '76px',
    borderRadius: 'var(--radius)',
    background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-border) 50%, var(--color-surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.3s ease infinite',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '2.5rem 1.5rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius)',
    textAlign: 'center',
  },
  emptyIcon: { fontSize: '2.25rem' },
  emptyText: { margin: 0, color: 'var(--color-text-muted)' },
  emptyBtn: {
    marginTop: '0.4rem',
    padding: '0.55rem 1.15rem',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
