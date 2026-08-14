import { useState, useEffect } from 'react';
import api from '../../config/api';

const statusOptions = ['Activo', 'Baja', 'Vacacion'];

const statusColors = {
  Activo: { bg: '#dcfce7', color: '#16a34a' },
  Baja: { bg: '#fee2e2', color: '#dc2626' },
  Vacacion: { bg: '#fef3c7', color: '#d97706' },
};

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
      setMessage(`Estado del medico actualizado a ${newStatus}`);
    } catch (err) {
      setMessage('Error al actualizar el estado del medico');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <p>Cargando medicos...</p>;

  return (
    <div>
      <h1 style={styles.title}>Gestionar Medicos</h1>
      <p style={styles.subtitle}>Cambie el estado de los medicos: Activo, Baja o Vacacion</p>

      {message && (
        <div style={message.includes('Error') ? styles.error : styles.success}>{message}</div>
      )}

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Especialidad</th>
              <th style={styles.th}>Estado Actual</th>
              <th style={styles.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {doctors.length === 0 ? (
              <tr>
                <td colSpan="4" style={styles.empty}>No hay medicos registrados.</td>
              </tr>
            ) : (
              doctors.map((doc) => (
                <tr key={doc.id}>
                  <td style={styles.td}>
                    Dr. {doc.nombre} {doc.apellido}
                  </td>
                  <td style={styles.td}>{doc.especialidad}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.badge,
                        backgroundColor: statusColors[doc.estado]?.bg || '#f1f5f9',
                        color: statusColors[doc.estado]?.color || '#475569',
                      }}
                    >
                      {doc.estado || 'Activo'}
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
                            {status}
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
  actionBtn: {
    padding: '0.3rem 0.6rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
};
