import { useState, useEffect, useMemo } from 'react';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const statusColors = {
  CONFIRMADA: { bg: '#dbeafe', color: '#1d4ed8' },
  COMPLETADA: { bg: '#dcfce7', color: '#16a34a' },
  CANCELADA: { bg: '#fee2e2', color: '#dc2626' },
  NO_SHOW: { bg: '#fef3c7', color: '#d97706' },
  RECONSULTA: { bg: '#e0e7ff', color: '#4f46e5' },
};

const filters = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'CONFIRMADA', label: 'Confirmadas' },
  { key: 'COMPLETADA', label: 'Completadas' },
  { key: 'CANCELADA', label: 'Canceladas' },
];

export default function MyAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('TODAS');

  useEffect(() => {
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
    fetchAppointments();
  }, [user.id]);

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

  const visible = useMemo(
    () =>
      activeFilter === 'TODAS'
        ? appointments
        : appointments.filter((a) => a.estado === activeFilter),
    [appointments, activeFilter]
  );

  const counts = useMemo(() => {
    const c = { TODAS: appointments.length };
    for (const a of appointments) c[a.estado] = (c[a.estado] || 0) + 1;
    return c;
  }, [appointments]);

  return (
    <div>
      <h1 style={styles.title}>Mis Citas</h1>
      <p style={styles.subtitle}>Historial y estado de todas sus citas medicas</p>

      <div style={styles.tabs}>
        {filters.map((f) => {
          const active = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }}
            >
              {f.label}
              <span style={{ ...styles.tabCount, ...(active ? styles.tabCountActive : {}) }}>
                {counts[f.key] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={styles.skeletonWrap}>
          {[0, 1, 2].map((i) => <div key={i} style={styles.skeleton} />)}
        </div>
      ) : visible.length === 0 ? (
        <div style={styles.emptyCard}>
          <span style={styles.emptyIcon}>🗂️</span>
          <p style={styles.emptyText}>No hay citas en esta categoria.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {visible.map((cita) => {
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
                    <strong style={styles.doctor}>{cita.medico_nombre || 'Medico'}</strong>
                    <p style={styles.meta}>
                      🕐 {cita.hora_inicio}
                      {cita.especialidad ? ` · ${cita.especialidad}` : ''}
                    </p>
                  </div>
                </div>
                <div style={styles.cardRight}>
                  <span className="badge" style={{ backgroundColor: c.bg, color: c.color }}>
                    {cita.estado}
                  </span>
                  {cita.estado === 'CONFIRMADA' && (
                    <button
                      style={styles.cancelBtn}
                      onClick={() => cancelAppointment(cita.id)}
                      disabled={cancellingId === cita.id}
                    >
                      {cancellingId === cita.id ? 'Cancelando...' : 'Cancelar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: 'var(--color-text)', fontSize: '1.7rem' },
  subtitle: { margin: '0 0 1.5rem', color: 'var(--color-text-muted)' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.5rem 0.9rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    color: 'var(--color-text-muted)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color: '#fff',
  },
  tabCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    padding: '0 0.35rem',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-surface-2)',
    color: 'var(--color-text-muted)',
    fontSize: '0.72rem',
    fontWeight: 700,
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' },
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
    flexWrap: 'wrap',
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
  cardRight: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  cancelBtn: {
    padding: '0.42rem 0.85rem',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-danger)',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 600,
  },
  skeletonWrap: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  skeleton: {
    height: '84px',
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
};
