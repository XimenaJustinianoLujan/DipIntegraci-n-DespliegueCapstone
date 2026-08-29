import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../config/api';
import dayjs from 'dayjs';

// Encapsula el flujo de 4 pasos (especialidad -> medico -> fecha -> horario)
// con sus fetches en cascada: cada paso depende del anterior, asi que cada
// selector limpia y vuelve a cargar el siguiente cuando cambia.
export default function useAppointmentWizard() {
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

  return {
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
  };
}
