import dayjs from 'dayjs';
import useAppointmentWizard from './useAppointmentWizard';
import Step from './Step';
import SuccessPanel from './SuccessPanel';

export default function BookAppointment() {
  const {
    specialties,
    doctors,
    availableSlots,
    selectedSpecialty,
    setSelectedSpecialty,
    selectedDoctor,
    setSelectedDoctor,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    loadingSlots,
    loading,
    error,
    success,
    today,
    doctorName,
    specialtyName,
    handleSubmit,
  } = useAppointmentWizard();

  if (success) {
    return <SuccessPanel message={success} />;
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
  form: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    padding: '2rem',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    maxWidth: '620px',
  },
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
