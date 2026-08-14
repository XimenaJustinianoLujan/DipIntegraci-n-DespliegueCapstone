import { useState, useEffect } from 'react';
import api from '../../config/api';
import dayjs from 'dayjs';

export default function SundayShifts() {
  const [doctors, setDoctors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [docsRes, assignRes] = await Promise.all([
        api.get('/admin/medicos?estado=Activo'),
        api.get('/admin/turnos-domingo'),
      ]);
      setDoctors(docsRes.data || []);
      setAssignments(assignRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getNextSundays = () => {
    const sundays = [];
    let current = dayjs().startOf('week').add(7, 'day'); // next Sunday
    if (current.day() !== 0) {
      current = current.day(0);
    }
    for (let i = 0; i < 4; i++) {
      sundays.push(current.add(i * 7, 'day').format('YYYY-MM-DD'));
    }
    return sundays;
  };

  const assignDoctor = async () => {
    if (!selectedDoctor || !selectedDate) {
      setMessage('Seleccione un medico y una fecha');
      return;
    }
    setMessage('');
    try {
      await api.post('/admin/turnos-domingo', {
        medico_id: selectedDoctor,
        fecha: selectedDate,
      });
      setMessage('Medico asignado al turno dominical exitosamente');
      setSelectedDoctor('');
      setSelectedDate('');
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error al asignar turno');
    }
  };

  const removeAssignment = async (id) => {
    if (!window.confirm('Remover esta asignacion?')) return;
    try {
      await api.delete(`/admin/turnos-domingo/${id}`);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setMessage('Asignacion removida');
    } catch (err) {
      setMessage('Error al remover asignacion');
    }
  };

  const sundays = getNextSundays();

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <h1 style={styles.title}>Turnos de Domingo - Emergencias</h1>
      <p style={styles.subtitle}>
        Asigne medicos para atender emergencias los domingos (24h, sin cita previa, por orden de llegada)
      </p>

      {message && (
        <div style={message.includes('Error') ? styles.error : styles.success}>{message}</div>
      )}

      <div style={styles.assignForm}>
        <h3 style={styles.sectionTitle}>Asignar Medico</h3>
        <div style={styles.formRow}>
          <select
            style={styles.select}
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            <option value="">Seleccione un medico</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                Dr. {doc.nombre} {doc.apellido} - {doc.especialidad}
              </option>
            ))}
          </select>

          <select
            style={styles.select}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option value="">Seleccione domingo</option>
            {sundays.map((date) => (
              <option key={date} value={date}>
                Domingo {dayjs(date).format('DD/MM/YYYY')}
              </option>
            ))}
          </select>

          <button style={styles.assignBtn} onClick={assignDoctor}>
            Asignar
          </button>
        </div>
      </div>

      <div style={styles.assignmentsList}>
        <h3 style={styles.sectionTitle}>Asignaciones Actuales</h3>
        {assignments.length === 0 ? (
          <p style={styles.empty}>No hay asignaciones para los proximos domingos.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Medico</th>
                <th style={styles.th}>Especialidad</th>
                <th style={styles.th}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td style={styles.td}>
                    Domingo {dayjs(a.fecha).format('DD/MM/YYYY')}
                  </td>
                  <td style={styles.td}>Dr. {a.medico_nombre}</td>
                  <td style={styles.td}>{a.especialidad}</td>
                  <td style={styles.td}>
                    <button
                      style={styles.removeBtn}
                      onClick={() => removeAssignment(a.id)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: '#1e293b' },
  subtitle: { margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.9rem' },
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
  assignForm: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  sectionTitle: { margin: '0 0 1rem', color: '#1e293b', fontSize: '1rem' },
  formRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' },
  select: {
    padding: '0.6rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.9rem',
    minWidth: '200px',
  },
  assignBtn: {
    padding: '0.6rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  assignmentsList: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  empty: { color: '#64748b', fontSize: '0.9rem' },
  table: { width: '100%', borderCollapse: 'collapse' },
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
  removeBtn: {
    padding: '0.3rem 0.6rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
};
