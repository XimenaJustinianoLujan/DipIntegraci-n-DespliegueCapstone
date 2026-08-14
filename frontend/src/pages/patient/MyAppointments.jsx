import { useState, useEffect } from 'react';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const statusColors = {
  CONFIRMADA: { bg: '#dbeafe', color: '#1d4ed8' },
  COMPLETADA: { bg: '#dcfce7', color: '#16a34a' },
  CANCELADA: { bg: '#fee2e2', color: '#dc2626' },
  NO_SHOW: { bg: '#fef3c7', color: '#d97706' },
  RECONSULTA: { bg: '#e0e7ff', color: '#4f46e5' },
};

export default function MyAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await api.get(`/pacientes/${user.id}/citas`);
      setAppointments(response.data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (id) => {
    if (!window.confirm('Esta seguro que desea cancelar esta cita?')) return;
    setCancellingId(id);
    try {
      await api.patch(`/citas/${id}/cancelar`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, estado: 'CANCELADA' } : a))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cancelar la cita');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <p>Cargando citas...</p>;

  return (
    <div>
      <h1 style={styles.title}>Mis Citas</h1>
      <p style={styles.subtitle}>Historial y estado de todas sus citas medicas</p>

      {appointments.length === 0 ? (
        <p style={styles.empty}>No tiene citas registradas.</p>
      ) : (
        <div style={styles.list}>
          {appointments.map((cita) => (
            <div key={cita.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <strong style={styles.doctorName}>
                    {cita.medico_nombre || 'Medico'}
                  </strong>
                  {cita.especialidad && (
                    <span style={styles.specialty}> - {cita.especialidad}</span>
                  )}
                </div>
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
              <div style={styles.cardBody}>
                <p style={styles.dateTime}>
                  📅 {cita.fecha} &nbsp; 🕐 {cita.hora_inicio}
                </p>
                {cita.estado === 'CONFIRMADA' && (
                  <button
                    style={styles.cancelBtn}
                    onClick={() => cancelAppointment(cita.id)}
                    disabled={cancellingId === cita.id}
                  >
                    {cancellingId === cita.id ? 'Cancelando...' : 'Cancelar Cita'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: '#1e293b' },
  subtitle: { margin: '0 0 1.5rem', color: '#64748b' },
  empty: { color: '#64748b' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card: {
    backgroundColor: 'white',
    padding: '1.25rem 1.5rem',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  doctorName: { color: '#1e293b' },
  specialty: { color: '#64748b', fontSize: '0.85rem' },
  badge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  cardBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.75rem',
  },
  dateTime: { margin: 0, color: '#475569', fontSize: '0.9rem' },
  cancelBtn: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
};
