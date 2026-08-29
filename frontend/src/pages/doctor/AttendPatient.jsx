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
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [notas, setNotas] = useState('');
  const [savingNotas, setSavingNotas] = useState(false);
  const [notasMessage, setNotasMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Historial clinico del paciente seleccionado -para que el medico no
  // atienda a ciegas: diagnosticos, indicaciones y recetas de consultas
  // anteriores, sin importar con que medico haya sido. El endpoint ya
  // permite a cualquier medico ver el historial de cualquier paciente
  // (GET /fichas-clinicas/:pacienteId), solo faltaba conectarlo aca.
  useEffect(() => {
    if (!selectedAppointment?.paciente_id) {
      setHistory([]);
      return;
    }
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await api.get(`/fichas-clinicas/${selectedAppointment.paciente_id}`);
        setHistory(response.data || []);
      } catch (err) {
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [selectedAppointment?.paciente_id]);

  // La nota ya viene en la propia cita (GET /citas/medico trae `notas`
  // para el medico tratante), no hace falta un fetch aparte.
  useEffect(() => {
    setNotas(selectedAppointment?.notas || '');
    setNotasMessage('');
  }, [selectedAppointment?.id]);

  const saveNotas = async () => {
    if (!selectedAppointment) return;
    setSavingNotas(true);
    setNotasMessage('');
    try {
      await api.patch(`/citas/${selectedAppointment.id}/notas`, { notas });
      setNotasMessage('Nota guardada');
    } catch (err) {
      setNotasMessage('Error al guardar la nota');
    } finally {
      setSavingNotas(false);
    }
  };

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
      if (file) formData.append('documento', file);

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
      setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
      if (selectedAppointment?.id === appointmentId) setSelectedAppointment(null);
      setMessage('Cita marcada como NO_SHOW');
    } catch (err) {
      setMessage('Error al marcar como NO_SHOW');
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Atender Paciente</h1>
      <p style={styles.subtitle}>Seleccione una cita y complete la ficha clinica</p>

      {message && (
        <div style={message.includes('Error') ? styles.error : styles.success}>{message}</div>
      )}

      <div style={styles.columns}>
        <div style={styles.appointmentsList}>
          <h3 style={styles.sectionTitle}>Citas confirmadas de hoy</h3>
          {loading ? (
            <p style={styles.empty}>Cargando...</p>
          ) : appointments.length === 0 ? (
            <div style={styles.emptyMini}>
              <span style={styles.emptyIcon}>✅</span>
              <p style={styles.empty}>No hay citas pendientes para atender.</p>
            </div>
          ) : (
            appointments.map((cita) => {
              const active = selectedAppointment?.id === cita.id;
              return (
                <div
                  key={cita.id}
                  className={`appointment-card${active ? ' selected' : ''}`}
                  onClick={() => setSelectedAppointment(cita)}
                >
                  <div>
                    <strong style={styles.patientName}>{cita.paciente_nombre || 'Paciente'}</strong>
                    <span style={styles.apptTime}>🕐 {cita.hora_inicio}</span>
                  </div>
                  <button
                    style={styles.noShowBtn}
                    onClick={(e) => { e.stopPropagation(); markNoShow(cita.id); }}
                  >
                    NO_SHOW
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div style={styles.formContainer}>
          <h3 style={styles.sectionTitle}>Ficha clinica</h3>
          {selectedAppointment ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={styles.patientBanner}>
                <span style={styles.bannerIcon}>🩺</span>
                <span>
                  Atendiendo a <strong>{selectedAppointment.paciente_nombre || 'Paciente'}</strong>
                  {' · '}{selectedAppointment.hora_inicio}
                </span>
              </div>

              <details style={styles.historyBox} open={history.length > 0}>
                <summary style={styles.historySummary}>
                  📖 Historial clinico del paciente
                  {historyLoading ? ' (cargando...)' : ` (${history.length})`}
                </summary>
                {!historyLoading && history.length === 0 && (
                  <p style={styles.historyEmpty}>Sin atenciones previas registradas.</p>
                )}
                <div style={styles.historyList}>
                  {history.map((h) => (
                    <div key={h.id} style={styles.historyItem}>
                      <div style={styles.historyItemHead}>
                        <strong>{dayjs(h.fecha).format('DD/MM/YYYY')}</strong>
                        <span style={styles.historyItemDoctor}>Dr. {h.medico_nombre}{h.especialidad ? ` · ${h.especialidad}` : ''}</span>
                      </div>
                      {h.diagnostico && <p style={styles.historyItemText}><strong>Dx:</strong> {h.diagnostico}</p>}
                      {h.receta && <p style={styles.historyItemText}><strong>Receta:</strong> {h.receta}</p>}
                    </div>
                  ))}
                </div>
              </details>

              <div style={styles.notasBox}>
                <label style={styles.label} htmlFor="attend-notas">
                  🔒 Nota privada (solo visible para medicos y administracion)
                </label>
                <textarea
                  id="attend-notas"
                  style={styles.textarea}
                  rows="2"
                  placeholder="Ej: alergico a la penicilina, antecedente relevante..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  maxLength={1000}
                />
                <div style={styles.notasFooter}>
                  {notasMessage && <span style={styles.notasMessage}>{notasMessage}</span>}
                  <button type="button" style={styles.notasSaveBtn} onClick={saveNotas} disabled={savingNotas}>
                    {savingNotas ? 'Guardando...' : 'Guardar nota'}
                  </button>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="attend-diagnostico">Diagnostico *</label>
                <textarea
                  id="attend-diagnostico"
                  style={styles.textarea}
                  rows="3"
                  placeholder="Describa el diagnostico"
                  {...register('diagnostico', { required: 'El diagnostico es obligatorio' })}
                />
                {errors.diagnostico && <span style={styles.fieldError}>{errors.diagnostico.message}</span>}
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="attend-indicaciones">Indicaciones</label>
                <textarea id="attend-indicaciones" style={styles.textarea} rows="3" placeholder="Indicaciones para el paciente" {...register('indicaciones')} />
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="attend-receta">Receta</label>
                <textarea id="attend-receta" style={styles.textarea} rows="3" placeholder="Medicamentos y dosis" {...register('receta')} />
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="attend-documento">Documento adjunto (analisis, radiografias)</label>
                <input
                  id="attend-documento"
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  style={styles.fileInput}
                />
                {file && <span style={styles.fileName}>📎 {file.name}</span>}
              </div>

              <button type="submit" style={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar ficha y completar cita'}
              </button>
            </form>
          ) : (
            <div style={styles.emptyMini}>
              <span style={styles.emptyIcon}>👈</span>
              <p style={styles.empty}>Seleccione una cita de la lista para completar la ficha clinica.</p>
            </div>
          )}
        </div>
      </div>
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
  columns: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' },
  appointmentsList: {
    flex: '0 0 300px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    padding: '1.35rem',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  sectionTitle: { margin: '0 0 1rem', color: 'var(--color-text)', fontSize: '1rem' },
  empty: { color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 },
  emptyMini: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '2rem 1rem',
    textAlign: 'center',
  },
  emptyIcon: { fontSize: '1.9rem' },
  // .appointment-card / .selected en index.css: seleccion de tarjeta,
  // no un valor que dependa de datos.
  patientName: { display: 'block', fontSize: '0.9rem', color: 'var(--color-text)' },
  apptTime: { fontSize: '0.78rem', color: 'var(--color-text-muted)' },
  noShowBtn: {
    padding: '0.25rem 0.55rem',
    backgroundColor: 'var(--color-warning-bg)',
    color: 'var(--color-warning)',
    border: '1px solid #fde68a',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.68rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  formContainer: {
    flex: 1,
    minWidth: '300px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    padding: '1.5rem',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  patientBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '1.25rem',
    fontSize: '0.9rem',
    color: 'var(--color-text)',
  },
  bannerIcon: { fontSize: '1.2rem' },
  historyBox: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.75rem 1rem',
    marginBottom: '1.25rem',
    backgroundColor: 'var(--color-surface-2)',
  },
  historySummary: {
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.88rem',
    color: 'var(--color-text)',
  },
  historyEmpty: { margin: '0.6rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    marginTop: '0.75rem',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  historyItem: {
    padding: '0.6rem 0.75rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
  },
  historyItemHead: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.4rem',
    fontSize: '0.82rem',
    color: 'var(--color-text)',
    marginBottom: '0.3rem',
  },
  historyItemDoctor: { color: 'var(--color-text-muted)', fontWeight: 500 },
  historyItemText: { margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.4 },
  notasBox: {
    padding: '0.75rem 1rem',
    marginBottom: '1.25rem',
    backgroundColor: 'var(--color-warning-bg)',
    border: '1px dashed #fde68a',
    borderRadius: 'var(--radius-sm)',
  },
  notasFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  notasMessage: { fontSize: '0.8rem', color: 'var(--color-text-muted)' },
  notasSaveBtn: {
    padding: '0.4rem 0.9rem',
    backgroundColor: 'var(--color-warning)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  field: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '0.35rem', color: 'var(--color-text)', fontSize: '0.88rem', fontWeight: 600 },
  textarea: {
    width: '100%',
    padding: '0.65rem 0.85rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  fileInput: { fontSize: '0.85rem' },
  fileName: { display: 'block', marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--color-primary-dark)' },
  fieldError: { color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' },
  submitBtn: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: 'var(--color-success)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
