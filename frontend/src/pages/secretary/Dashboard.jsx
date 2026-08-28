import { useState, useEffect, useMemo } from 'react';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';
import StatusBreakdownBar from '../../components/charts/StatusBreakdownBar';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, estado: 'NO_SHOW' } : a)));
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
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, estado: 'RECONSULTA' } : a)));
      setMessage('Cita marcada como RECONSULTA. El paciente sera reagendado.');
    } catch (err) {
      setMessage('Error al marcar como RECONSULTA');
    }
  };

  const countsByEstado = useMemo(() => {
    const counts = {};
    for (const a of appointments) counts[a.estado] = (counts[a.estado] || 0) + 1;
    return counts;
  }, [appointments]);

  return (
    <div>
      <h1 style={styles.title}>Panel de Secretaria</h1>
      <p style={styles.subtitle}>Bienvenida, {user?.nombre} · gestion de citas</p>

      {message && (
        <div style={message.includes('Error') ? styles.error : styles.success}>{message}</div>
      )}

      <div style={styles.filterRow}>
        <label style={styles.label} htmlFor="secretary-filter-date">📅 Filtrar por fecha:</label>
        <input
          id="secretary-filter-date"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={styles.dateInput}
        />
        <span style={styles.counter}>{appointments.length} cita(s)</span>
      </div>

      {!loading && appointments.length > 0 && (
        <div style={styles.chartCard}>
          <StatusBreakdownBar counts={countsByEstado} title="Citas del dia por estado" />
        </div>
      )}

      {loading ? (
        <div style={styles.skeleton} />
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
                  <td colSpan="5" style={styles.empty}>No hay citas para esta fecha.</td>
                </tr>
              ) : (
                appointments.map((cita) => {
                  const c = statusColors[cita.estado] || { bg: '#f1f5f9', color: '#475569' };
                  return (
                    <tr key={cita.id}>
                      <td style={styles.td}><strong>{cita.hora_inicio}</strong></td>
                      <td style={styles.td}>{cita.paciente_nombre || 'Paciente'}</td>
                      <td style={styles.td}>{cita.medico_nombre || 'Medico'}</td>
                      <td style={styles.td}>
                        <span className="badge" style={{ backgroundColor: c.bg, color: c.color }}>
                          {cita.estado}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {cita.estado === 'CONFIRMADA' && (
                          <button style={styles.noShowBtn} onClick={() => markNoShow(cita.id)}>NO_SHOW</button>
                        )}
                        {cita.estado === 'NO_SHOW' && (
                          <button style={styles.reconsultaBtn} onClick={() => markReconsulta(cita.id)}>RECONSULTA</button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: 'var(--color-text)', fontSize: '1.7rem' },
  subtitle: { margin: '0 0 1.5rem', color: 'var(--color-text-muted)' },
  error: {
    backgroundColor: 'var(--color-danger-bg)',
    border: '1px solid #fecaca',
    color: 'var(--color-danger)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  success: {
    backgroundColor: 'var(--color-success-bg)',
    border: '1px solid #bbf7d0',
    color: 'var(--color-success)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  filterRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  label: { fontSize: '0.9rem', color: 'var(--color-text)', fontWeight: 600 },
  dateInput: {
    padding: '0.55rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
  },
  counter: {
    padding: '0.35rem 0.8rem',
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-dark)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  chartCard: {
    padding: '1.35rem 1.5rem',
    marginBottom: '1.5rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  tableContainer: {
    overflowX: 'auto',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--color-surface)' },
  th: {
    padding: '0.85rem 1rem',
    backgroundColor: 'var(--color-surface-2)',
    borderBottom: '1px solid var(--color-border)',
    textAlign: 'left',
    fontSize: '0.78rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    color: 'var(--color-text-muted)',
  },
  td: {
    padding: '0.85rem 1rem',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.9rem',
    color: 'var(--color-text)',
  },
  empty: { textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' },
  noShowBtn: {
    padding: '0.35rem 0.7rem',
    backgroundColor: 'var(--color-warning-bg)',
    color: 'var(--color-warning)',
    border: '1px solid #fde68a',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: 700,
  },
  reconsultaBtn: {
    padding: '0.35rem 0.7rem',
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    border: '1px solid #c7d2fe',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: 700,
  },
  skeleton: {
    height: '220px',
    borderRadius: 'var(--radius)',
    background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-border) 50%, var(--color-surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.3s ease infinite',
  },
};
