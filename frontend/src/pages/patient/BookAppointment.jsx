import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import dayjs from 'dayjs';
import { SuccessBurst } from '../../components/illustrations/EmptyState';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await api.get('/medicos/especialidades');
        setSpecialties(response.data || []);
      } catch (err) {
        setSpecialties([]);
      }
    };
    fetchSpecialties();
  }, []);

  useEffect(() => {
    if (!selectedSpecialty) {
      setDoctors([]);
      setSelectedDoctor('');
      return;
    }
    const fetchDoctors = async () => {
      try {
        const response = await api.get(`/medicos?especialidad_id=${selectedSpecialty}`);
        setDoctors(response.data || []);
      } catch (err) {
        setDoctors([]);
      }
    };
    fetchDoctors();
  }, [selectedSpecialty]);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setAvailableSlots([]);
      return;
    }
    const fetchAvailableSlots = async () => {
      setLoadingSlots(true);
      setSelectedSlot('');
      try {
        const response = await api.get(
          `/agenda/disponibilidad?medico_id=${selectedDoctor}&fecha=${selectedDate}`
        );
        setAvailableSlots(response.data || []);
      } catch (err) {
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchAvailableSlots();
  }, [selectedDoctor, selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      setError('Complete todos los campos (especialidad, medico, fecha y horario).');
      return;
    }
    if (dayjs(selectedDate).isBefore(dayjs(), 'day')) {
      setError('No puede agendar citas en fechas pasadas.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/citas', {
        medico_id: selectedDoctor,
        especialidad_id: selectedSpecialty,
        fecha: selectedDate,
        // El backend valida hora_inicio como HH:MM exacto, pero la agenda
        // devuelve HH:MM:SS (formato TIME de Postgres) -> normalizar aqui,
        // que es el unico punto donde arma el payload de creacion de cita.
        hora_inicio: selectedSlot.slice(0, 5),
      });
      setSuccess('Cita agendada exitosamente con estado CONFIRMADA.');
      setTimeout(() => navigate('/paciente/mis-citas'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al agendar la cita.');
    } finally {
      setLoading(false);
    }
  };

  const today = dayjs().format('YYYY-MM-DD');
  const doctorName = doctors.find((d) => d.id === selectedDoctor);
  const specialtyName = specialties.find((s) => s.id === selectedSpecialty);

  if (success) {
    return (
      <div style={styles.successPanel}>
        <SuccessBurst />
        <h2 style={styles.successTitle}>¡Cita confirmada!</h2>
        <p style={styles.successText}>{success}</p>
        <p style={styles.successHint}>Redirigiendo a Mis Citas...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={styles.title}>Agendar Cita</h1>
      <p style={styles.subtitle}>Seleccione especialidad, medico, fecha y horario disponible</p>

      {error && <div className="alert-in" style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <Step n="1" label="Especialidad" htmlFor="book-especialidad">
          <select
            id="book-especialidad"
            style={styles.select}
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
          >
            <option value="">Seleccione una especialidad</option>
            {specialties.map((spec) => (
              <option key={spec.id} value={spec.id}>{spec.nombre}</option>
            ))}
          </select>
        </Step>

        <Step n="2" label="Medico" htmlFor="book-medico" disabled={!selectedSpecialty}>
          <select
            id="book-medico"
            style={styles.select}
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            disabled={!selectedSpecialty}
          >
            <option value="">Seleccione un medico</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>Dr. {doc.nombre} {doc.apellido}</option>
            ))}
          </select>
        </Step>

        <Step n="3" label="Fecha" htmlFor="book-fecha" disabled={!selectedDoctor}>
          <input
            id="book-fecha"
            type="date"
            style={styles.select}
            value={selectedDate}
            min={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={!selectedDoctor}
          />
        </Step>

        <Step n="4" label="Horario disponible" disabled={!selectedDate}>
          {loadingSlots ? (
            <p style={styles.noSlots}>Buscando horarios disponibles...</p>
          ) : availableSlots.length > 0 ? (
            <div style={styles.slotsGrid}>
              {availableSlots.map((slot) => {
                const value = slot.hora_inicio || slot;
                const active = selectedSlot === value;
                return (
                  <button
                    key={value}
                    type="button"
                    style={{ ...styles.slotBtn, ...(active ? styles.slotBtnActive : {}) }}
                    onClick={() => setSelectedSlot(value)}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={styles.noSlots}>
              {selectedDoctor && selectedDate
                ? 'No hay horarios disponibles para esta fecha.'
                : 'Seleccione medico y fecha para ver horarios.'}
            </p>
          )}
        </Step>

        {selectedSlot && (
          <div style={styles.summary}>
            <span style={styles.summaryIcon}>🗓️</span>
            <span>
              <strong>{specialtyName?.nombre}</strong> con{' '}
              <strong>Dr. {doctorName?.nombre} {doctorName?.apellido}</strong>
              <br />
              {dayjs(selectedDate).format('DD/MM/YYYY')} a las {selectedSlot}
            </span>
          </div>
        )}

        <button type="submit" style={styles.submitBtn} disabled={loading || !selectedSlot}>
          {loading ? 'Agendando...' : 'Confirmar Cita'}
        </button>
      </form>
    </div>
  );
}

function Step({ n, label, htmlFor, disabled, children }) {
  return (
    <div style={{ ...styles.step, ...(disabled ? styles.stepDisabled : {}) }}>
      <div style={styles.stepLabel}>
        <span style={styles.stepNum}>{n}</span>
        <label style={styles.label} htmlFor={htmlFor}>{label}</label>
      </div>
      {children}
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
  successPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '0.4rem',
    padding: '3rem 1.5rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow)',
    maxWidth: '460px',
    margin: '2rem auto',
  },
  successTitle: { margin: '0.75rem 0 0', color: 'var(--color-text)', fontSize: '1.4rem' },
  successText: { margin: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem' },
  successHint: { margin: '0.5rem 0 0', color: 'var(--color-text-subtle)', fontSize: '0.82rem' },
  form: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    padding: '2rem',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    maxWidth: '620px',
  },
  step: { marginBottom: '1.5rem' },
  stepDisabled: { opacity: 0.55 },
  stepLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
  stepNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-dark)',
    fontSize: '0.78rem',
    fontWeight: 800,
  },
  label: { color: 'var(--color-text)', fontSize: '0.9rem', fontWeight: 600 },
  select: {
    width: '100%',
    padding: '0.7rem 0.85rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.92rem',
    boxSizing: 'border-box',
    backgroundColor: 'var(--color-surface)',
  },
  slotsGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  slotBtn: {
    padding: '0.5rem 1rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-surface)',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  slotBtnActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    borderColor: 'var(--color-primary)',
  },
  noSlots: { color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.25rem',
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-light)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    color: 'var(--color-text)',
    lineHeight: 1.5,
  },
  summaryIcon: { fontSize: '1.4rem', flexShrink: 0 },
  submitBtn: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.98rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
