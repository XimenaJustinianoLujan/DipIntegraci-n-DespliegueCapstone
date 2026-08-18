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

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/citas/mis-citas');
      const active = (response.data || []).filter(
        (cita) => cita.estado === 'CONFIRMADA'
      );
      setAppointments(active.slice(0, 5));
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Bienvenido/a, {user?.nombre}</h1>
      <p style={styles.subtitle}>Panel del paciente</p>

      <div style={styles.actions}>
        <Link to="/paciente/agendar" style={styles.actionCard}>
          <span style={styles.actionIcon}>📅</span>
          <span>Agendar Cita</span>
        </Link>
        <Link to="/paciente/mis-citas" style={styles.actionCard}>
          <span style={styles.actionIcon}>📋</span>
          <span>Mis Citas</span>
        </Link>
        <Link to="/paciente/ficha-clinica" style={styles.actionCard}>
          <span style={styles.actionIcon}>📄</span>
          <span>Ficha Clinica</span>
        </Link>
      </div>

      <h2 style={styles.sectionTitle}>Proximas Citas</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : appointments.length === 0 ? (
        <p style={styles.empty}>No tiene citas activas. <Link to="/paciente/agendar">Agendar una cita</Link></p>
      ) : (
        <div style={styles.list}>
          {appointments.map((cita) => (
            <div key={cita.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>{cita.medico_nombre || 'Dr.'}</strong>
                <span
                  style={{
                    ...styles.badge,
                    backgroundColor: statusColors[cita.estado]?.bg || '#f1f5f9',
                    color: statusColors[cita.estado]?.color || '#475569',
                  }}
                >
                  {cita.estado}
                </span>
              </div>
              <p style={styles.cardDate}>
                {cita.fecha} - {cita.hora_inicio}
              </p>
              {cita.especialidad && <p style={styles.cardSpec}>{cita.especialidad}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: '#1e293b' },
  subtitle: { margin: '0 0 2rem', color: '#64748b' },
  actions: { display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' },
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
    fontWeight: '500',
  },
  actionIcon: { fontSize: '2rem' },
  sectionTitle: { margin: '0 0 1rem', color: '#1e293b', fontSize: '1.2rem' },
  empty: { color: '#64748b' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card: {
    backgroundColor: 'white',
    padding: '1rem 1.5rem',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  cardDate: { margin: '0.5rem 0 0', color: '#475569', fontSize: '0.9rem' },
  cardSpec: { margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' },
};
