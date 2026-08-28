import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ doctors: 0, todayCitas: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/stats');
        setStats(response.data || { doctors: 0, todayCitas: 0 });
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <header style={styles.head}>
        <h1 style={styles.title}>Panel de Administracion</h1>
        <p style={styles.subtitle}>Bienvenido, {user?.nombre}</p>
      </header>

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statIcon}>👨‍⚕️</span>
          <div>
            <span style={styles.statValue}>{stats.doctors}</span>
            <span style={styles.statLabel}>Medicos activos</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statIcon}>📅</span>
          <div>
            <span style={styles.statValue}>{stats.todayCitas}</span>
            <span style={styles.statLabel}>Citas hoy</span>
          </div>
        </div>
      </section>

      <h2 style={styles.sectionTitle}>Acciones</h2>
      <div style={styles.actions}>
        <Link to="/admin/medicos" className="lift" style={styles.actionCard}>
          <span style={styles.actionIcon}>👨‍⚕️</span>
          <span style={styles.actionLabel}>Gestionar Medicos</span>
          <span style={styles.actionDesc}>Cambiar estado: Activo, Baja, Vacacion</span>
        </Link>
        <Link to="/admin/turnos-domingo" className="lift" style={styles.actionCard}>
          <span style={styles.actionIcon}>🚑</span>
          <span style={styles.actionLabel}>Turnos Domingo</span>
          <span style={styles.actionDesc}>Asignar medicos para emergencias dominicales</span>
        </Link>
      </div>
    </div>
  );
}

const styles = {
  head: { marginBottom: '1.75rem' },
  title: { margin: '0 0 0.25rem', color: 'var(--color-text)', fontSize: '1.7rem' },
  subtitle: { margin: 0, color: 'var(--color-text-muted)' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '2.25rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  statIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    height: '52px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-primary-50)',
    fontSize: '1.6rem',
    flexShrink: 0,
  },
  statValue: { display: 'block', fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 },
  statLabel: { fontSize: '0.82rem', color: 'var(--color-text-muted)' },
  sectionTitle: { margin: '0 0 1rem', color: 'var(--color-text)', fontSize: '1.15rem' },
  actions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
  },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    padding: '1.5rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    textDecoration: 'none',
    color: 'var(--color-text)',
  },
  actionIcon: { fontSize: '2rem', marginBottom: '0.25rem' },
  actionLabel: { fontWeight: 700, fontSize: '1.02rem' },
  actionDesc: { fontSize: '0.82rem', color: 'var(--color-text-muted)' },
};
