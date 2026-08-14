import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import dayjs from 'dayjs';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSpecialties();
  }, []);

  useEffect(() => {
    if (selectedSpecialty) {
      fetchDoctors(selectedSpecialty);
    } else {
      setDoctors([]);
      setSelectedDoctor('');
    }
  }, [selectedSpecialty]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots(selectedDoctor, selectedDate);
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDoctor, selectedDate]);

  const fetchSpecialties = async () => {
    try {
      const response = await api.get('/medicos/especialidades');
      setSpecialties(response.data || []);
    } catch (err) {
      // Fallback specialties if endpoint not available
      setSpecialties([]);
    }
  };

  const fetchDoctors = async (especialidadId) => {
    try {
      const response = await api.get(`/medicos?especialidad_id=${especialidadId}`);
      setDoctors(response.data || []);
    } catch (err) {
      setDoctors([]);
    }
  };

  const fetchAvailableSlots = async (doctorId, date) => {
    try {
      const response = await api.get(`/agenda/disponibilidad?medico_id=${doctorId}&fecha=${date}`);
      setAvailableSlots(response.data || []);
    } catch (err) {
      setAvailableSlots([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      setError('Complete todos los campos');
      return;
    }

    const appointmentDate = dayjs(selectedDate);
    if (appointmentDate.isBefore(dayjs(), 'day')) {
      setError('No puede agendar citas en fechas pasadas');
      return;
    }

    setLoading(true);
    try {
      await api.post('/citas', {
        medico_id: selectedDoctor,
        especialidad_id: selectedSpecialty,
        fecha: selectedDate,
        hora_inicio: selectedSlot,
      });
      setSuccess('Cita agendada exitosamente con estado CONFIRMADA');
      setTimeout(() => navigate('/paciente/mis-citas'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al agendar la cita');
    } finally {
      setLoading(false);
    }
  };

  const today = dayjs().format('YYYY-MM-DD');

  return (
    <div>
      <h1 style={styles.title}>Agendar Cita</h1>
      <p style={styles.subtitle}>Seleccione especialidad, medico, fecha y horario disponible</p>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Especialidad</label>
          <select
            style={styles.select}
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
          >
            <option value="">Seleccione una especialidad</option>
            {specialties.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.nombre}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Medico</label>
          <select
            style={styles.select}
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            disabled={!selectedSpecialty}
          >
            <option value="">Seleccione un medico</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                Dr. {doc.nombre} {doc.apellido}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Fecha</label>
          <input
            type="date"
            style={styles.input}
            value={selectedDate}
            min={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={!selectedDoctor}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Horario disponible</label>
          {availableSlots.length > 0 ? (
            <div style={styles.slotsGrid}>
              {availableSlots.map((slot) => (
                <button
                  key={slot.hora_inicio || slot}
                  type="button"
                  style={{
                    ...styles.slotBtn,
                    ...(selectedSlot === (slot.hora_inicio || slot) ? styles.slotBtnActive : {}),
                  }}
                  onClick={() => setSelectedSlot(slot.hora_inicio || slot)}
                >
                  {slot.hora_inicio || slot}
                </button>
              ))}
            </div>
          ) : (
            <p style={styles.noSlots}>
              {selectedDoctor && selectedDate
                ? 'No hay horarios disponibles para esta fecha'
                : 'Seleccione medico y fecha para ver horarios'}
            </p>
          )}
        </div>

        <button type="submit" style={styles.submitBtn} disabled={loading}>
          {loading ? 'Agendando...' : 'Confirmar Cita'}
        </button>
      </form>
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
  form: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    maxWidth: '600px',
  },
  field: { marginBottom: '1.25rem' },
  label: { display: 'block', marginBottom: '0.3rem', color: '#374151', fontSize: '0.9rem', fontWeight: '500' },
  select: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  slotsGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  slotBtn: {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  slotBtnActive: {
    backgroundColor: '#2563eb',
    color: 'white',
    borderColor: '#2563eb',
  },
  noSlots: { color: '#64748b', fontSize: '0.85rem' },
  submitBtn: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
};
