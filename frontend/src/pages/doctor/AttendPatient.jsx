import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../config/api';
import dayjs from 'dayjs';

export default function AttendPatient() {
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const response = await api.get(`/citas/medico?fecha=${today}&estado=CONFIRMADA`);
      setAppointments(response.data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    if (!selectedAppointment) {
      setMessage('Seleccione una cita para atender');
      return;
    }

    setSubmitting(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('cita_id', selectedAppointment.id);
      formData.append('diagnostico', data.diagnostico);
      formData.append('indicaciones', data.indicaciones);
      formData.append('receta', data.receta);
      if (file) {
        formData.append('documento', file);
      }

      await api.post('/fichas-clinicas', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage('Ficha clinica guardada exitosamente. Cita marcada como COMPLETADA.');
      setSelectedAppointment(null);
      reset();
      setFile(null);
      fetchAppointments();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error al guardar la ficha clinica');
    } finally {
      setSubmitting(false);
    }
  };

  const markNoShow = async (appointmentId) => {
    if (!window.confirm('Marcar como NO_SHOW (paciente no se presento)?')) return;
    try {
      await api.patch(`/citas/${appointmentId}/no-show`);
      setAppointments((prev) =>
        prev.filter((a) => a.id !== appointmentId)
      );
      setMessage('Cita marcada como NO_SHOW');
    } catch (err) {
      setMessage('Error al marcar como NO_SHOW');
    }
  };

  if (loading) return <p>Cargando citas...</p>;

  return (
    <div>
      <h1 style={styles.title}>Atender Paciente</h1>
      <p style={styles.subtitle}>Seleccione una cita y complete la ficha clinica</p>

      {message && (
        <div style={message.includes('Error') ? styles.error : styles.success}>{message}</div>
      )}

      <div style={styles.columns}>
        <div style={styles.appointmentsList}>
          <h3 style={styles.sectionTitle}>Citas Confirmadas de Hoy</h3>
          {appointments.length === 0 ? (
            <p style={styles.empty}>No hay citas pendientes para atender.</p>
          ) : (
            appointments.map((cita) => (
              <div
                key={cita.id}
                style={{
                  ...styles.appointmentCard,
                  ...(selectedAppointment?.id === cita.id ? styles.selectedCard : {}),
                }}
                onClick={() => setSelectedAppointment(cita)}
              >
                <strong>{cita.paciente_nombre || 'Paciente'}</strong>
                <span style={styles.appointmentTime}>{cita.hora_inicio}</span>
                <button
                  style={styles.noShowBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    markNoShow(cita.id);
                  }}
                >
                  NO_SHOW
                </button>
              </div>
            ))
          )}
        </div>

        <div style={styles.formContainer}>
          <h3 style={styles.sectionTitle}>Ficha Clinica</h3>
          {selectedAppointment ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <p style={styles.patientLabel}>
                Paciente: <strong>{selectedAppointment.paciente_nombre || 'Paciente'}</strong>
              </p>

              <div style={styles.field}>
                <label style={styles.label}>Diagnostico</label>
                <textarea
                  style={styles.textarea}
                  rows="3"
                  {...register('diagnostico', { required: 'El diagnostico es obligatorio' })}
                />
                {errors.diagnostico && (
                  <span style={styles.fieldError}>{errors.diagnostico.message}</span>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Indicaciones</label>
                <textarea
                  style={styles.textarea}
                  rows="3"
                  {...register('indicaciones')}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Receta</label>
                <textarea
                  style={styles.textarea}
                  rows="3"
                  {...register('receta')}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Documento adjunto (analisis, radiografias)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>

              <button type="submit" style={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar Ficha y Completar Cita'}
              </button>
            </form>
          ) : (
            <p style={styles.empty}>Seleccione una cita de la lista para completar la ficha clinica.</p>
          )}
        </div>
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
  columns: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
  appointmentsList: {
    flex: '0 0 300px',
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionTitle: { margin: '0 0 1rem', color: '#1e293b', fontSize: '1rem' },
  empty: { color: '#64748b', fontSize: '0.9rem' },
  appointmentCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  selectedCard: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  appointmentTime: { color: '#64748b', fontSize: '0.8rem' },
  noShowBtn: {
    padding: '0.2rem 0.5rem',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    border: '1px solid #fde68a',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '0.7rem',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    minWidth: '300px',
  },
  patientLabel: { marginBottom: '1rem', color: '#475569' },
  field: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '0.3rem', color: '#374151', fontSize: '0.9rem', fontWeight: '500' },
  textarea: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  fieldError: { color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' },
  submitBtn: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
};
