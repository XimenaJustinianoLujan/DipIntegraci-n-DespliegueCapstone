import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ doctors: 0, todayCitas: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data || { doctors: 0, todayCitas: 0 });
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Panel de Administracion</h1>
      <p style={styles.subtitle}>Bienvenido, {user?.nombre}</p>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{stats.doctors}</span>
          <span style={styles.statLabel}>Medicos Activos</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{stats.todayCitas}</span>
          <span style={styles.statLabel}>Citas Hoy</span>
        </div>
      </div>

      <h2 style={styles.sectionTitle}>Acciones</h2>
      <div style={styles.actions}>
        <Link to="/admin/medicos" style={styles.actionCard}>
          <span style={styles.actionIcon}>👨‍⚕️</span>
          <span style={styles.actionLabel}>Gestionar Medicos</span>
          <span style={styles.actionDesc}>Cambiar estado: Activo, Baja, Vacacion</span>
        </Link>
        <Link to="/admin/turnos-domingo" style={styles.actionCard}>
          <span style={styles.actionIcon}>🚑</span>
          <span style={styles.actionLabel}>Turnos Domingo</span>
          <span style={styles.actionDesc}>Asignar medicos para emergencias dominicales</span>
        </Link>
      </div>
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: '#1e293b' },
  subtitle: { margin: '0 0 2rem', color: '#64748b' },
  statsGrid: { display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1.5rem 2rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    minWidth: '150px',
  },
  statValue: { fontSize: '2rem', fontWeight: '700', color: '#2563eb' },
  statLabel: { fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' },
  sectionTitle: { margin: '0 0 1rem', color: '#1e293b', fontSize: '1.2rem' },
  actions: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.5rem 2rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textDecoration: 'none',
    color: '#1e293b',
    minWidth: '200px',
    textAlign: 'center',
  },
  actionIcon: { fontSize: '2.5rem' },
  actionLabel: { fontWeight: '600', fontSize: '1rem' },
  actionDesc: { fontSize: '0.8rem', color: '#64748b' },
};
