import { useState, useEffect } from 'react';
import api from '../../config/api';

// El backend usa el enum en MAYUSCULAS (ACTIVO/BAJA/VACACION); mostramos una
// etiqueta capitalizada pero enviamos el valor que la API valida.
const statusMeta = {
  ACTIVO: { label: 'Activo', bg: '#dcfce7', color: '#16a34a' },
  BAJA: { label: 'Baja', bg: '#fee2e2', color: '#dc2626' },
  VACACION: { label: 'Vacacion', bg: '#fef3c7', color: '#d97706' },
};
const statusOptions = ['ACTIVO', 'BAJA', 'VACACION'];

export default function ManageDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/admin/medicos');
      setDoctors(response.data || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (doctorId, newStatus) => {
    setUpdatingId(doctorId);
    setMessage('');
    try {
      await api.patch(`/admin/medicos/${doctorId}/estado`, { estado: newStatus });
      setDoctors((prev) =>
        prev.map((doc) => (doc.id === doctorId ? { ...doc, estado: newStatus } : doc))
      );
      setMessage(`Estado del medico actualizado a ${statusMeta[newStatus]?.label || newStatus}`);
    } catch (err) {
      setMessage('Error al actualizar el estado del medico');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Gestionar Medicos</h1>
      <p style={styles.subtitle}>Cambie el estado de los medicos: Activo, Baja o Vacacion</p>

      {message && (
        <div style={message.includes('Error') ? styles.error : styles.success}>{message}</div>
      )}

      {loading ? (
        <div style={styles.skeleton} />
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Medico</th>
                <th style={styles.th}>Especialidad</th>
                <th style={styles.th}>Estado actual</th>
                <th style={styles.th}>Cambiar a</th>
              </tr>
            </thead>
            <tbody>
              {doctors.length === 0 ? (
                <tr>
                  <td colSpan="4" style={styles.empty}>No hay medicos registrados.</td>
                </tr>
              ) : (
                doctors.map((doc) => {
                  const meta = statusMeta[doc.estado] || { label: doc.estado || 'Activo', bg: '#f1f5f9', color: '#475569' };
                  return (
                    <tr key={doc.id}>
                      <td style={styles.td}>
                        <div style={styles.docCell}>
                          <span style={styles.docAvatar}>
                            {(doc.nombre?.[0] || '') + (doc.apellido?.[0] || '')}
                          </span>
                          <strong>Dr. {doc.nombre} {doc.apellido}</strong>
                        </div>
                      </td>
                      <td style={styles.td}>{doc.especialidad || '—'}</td>
                      <td style={styles.td}>
                        <span className="badge" style={{ backgroundColor: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {statusOptions
                            .filter((s) => s !== doc.estado)
                            .map((status) => (
                              <button
                                key={status}
                                style={styles.actionBtn}
                                onClick={() => changeStatus(doc.id, status)}
                                disabled={updatingId === doc.id}
                              >
                                {statusMeta[status].label}
                              </button>
                            ))}
                        </div>
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
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
  },
  td: {
    padding: '0.85rem 1rem',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.9rem',
    color: 'var(--color-text)',
  },
  docCell: { display: 'flex', alignItems: 'center', gap: '0.65rem' },
  docAvatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary-dark)',
    fontSize: '0.75rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  empty: { textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' },
  actions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  actionBtn: {
    padding: '0.35rem 0.7rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  skeleton: {
    height: '220px',
    borderRadius: 'var(--radius)',
    background: 'linear-gradient(90deg, #eef2f7 25%, #f6f8fb 50%, #eef2f7 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.3s ease infinite',
  },
};
