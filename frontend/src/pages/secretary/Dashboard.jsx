import { useState, useEffect } from 'react';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const statusColors = {
  CONFIRMADA: { bg: '#dbeafe', color: '#1d4ed8' },
  COMPLETADA: { bg: '#dcfce7', color: '#16a34a' },
  CANCELADA: { bg: '#fee2e2', color: '#dc2626' },
  NO_SHOW: { bg: '#fef3c7', color: '#d97706' },
  RECONSULTA: { bg: '#e0e7ff', color: '#4f46e5' },
};

export default function SecretaryDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [filterDate]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/secretaria/citas?fecha=${filterDate}`);
      setAppointments(response.data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const markNoShow = async (id) => {
    if (!window.confirm('Marcar como NO_SHOW (paciente no se presento)?')) return;
    setMessage('');
    try {
      await api.patch(`/secretaria/citas/${id}/no-show`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, estado: 'NO_SHOW' } : a))
      );
      setMessage('Cita marcada como NO_SHOW');
    } catch (err) {
      setMessage('Error al marcar como NO_SHOW');
    }
  };

  const markReconsulta = async (id) => {
    if (!window.confirm('Marcar como RECONSULTA (reagendar al paciente)?')) return;
    setMessage('');
    try {
      await api.patch(`/secretaria/citas/${id}/reconsulta`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, estado: 'RECONSULTA' } : a))
      );
      setMessage('Cita marcada como RECONSULTA. El paciente sera reagendado.');
    } catch (err) {
      setMessage('Error al marcar como RECONSULTA');
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Panel de Secretaria</h1>
      <p style={styles.subtitle}>Bienvenida, {user?.nombre} - Gestion de citas</p>

      {message && (
        <div style={message.includes('Error') ? styles.error : styles.success}>{message}</div>
      )}

      <div style={styles.filterRow}>
        <label style={styles.label}>Filtrar por fecha:</label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={styles.dateInput}
        />
      </div>

      {loading ? (
        <p>Cargando citas...</p>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Hora</th>
                <th style={styles.th}>Paciente</th>
                <th style={styles.th}>Medico</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan="5" style={styles.empty}>
                    No hay citas para esta fecha.
                  </td>
                </tr>
              ) : (
                appointments.map((cita) => (
                  <tr key={cita.id}>
                    <td style={styles.td}>{cita.hora_inicio}</td>
                    <td style={styles.td}>{cita.paciente_nombre || 'Paciente'}</td>
                    <td style={styles.td}>{cita.medico_nombre || 'Medico'}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor: statusColors[cita.estado]?.bg || '#f1f5f9',
                          color: statusColors[cita.estado]?.color || '#475569',
                        }}
                      >
                        {cita.estado}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {cita.estado === 'CONFIRMADA' && (
                        <div style={styles.actions}>
                          <button
                            style={styles.noShowBtn}
                            onClick={() => markNoShow(cita.id)}
                          >
                            NO_SHOW
                          </button>
                        </div>
                      )}
                      {cita.estado === 'NO_SHOW' && (
                        <button
                          style={styles.reconsultaBtn}
                          onClick={() => markReconsulta(cita.id)}
                        >
                          RECONSULTA
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: '#1e293b' },
  subtitle: { margin: '0 0 1.5rem', color: '#64748b' },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  success: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  filterRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' },
  label: { fontSize: '0.9rem', color: '#374151', fontWeight: '500' },
  dateInput: {
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
  tableContainer: { overflowX: 'auto' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  th: {
    padding: '0.75rem 1rem',
    backgroundColor: '#f1f5f9',
    borderBottom: '2px solid #e2e8f0',
    textAlign: 'left',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#374151',
  },
  td: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    color: '#1e293b',
  },
  empty: { textAlign: 'center', color: '#64748b', padding: '2rem' },
  badge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  actions: { display: 'flex', gap: '0.5rem' },
  noShowBtn: {
    padding: '0.3rem 0.6rem',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    border: '1px solid #fde68a',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  reconsultaBtn: {
    padding: '0.3rem 0.6rem',
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    border: '1px solid #c7d2fe',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
};
