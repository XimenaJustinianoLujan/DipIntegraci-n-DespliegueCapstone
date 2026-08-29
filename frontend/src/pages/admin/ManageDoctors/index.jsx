import { useState, useEffect } from 'react';
import api from '../../../config/api';
import DoctorForm, { emptyForm } from './DoctorForm';
import DoctorsTable from './DoctorsTable';
import { statusMeta } from './doctorStatus';

export default function ManageDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newDoctorInfo, setNewDoctorInfo] = useState(null);

  useEffect(() => {
    fetchDoctors();
    fetchEspecialidades();
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

  const fetchEspecialidades = async () => {
    try {
      const response = await api.get('/medicos/especialidades');
      setEspecialidades(response.data || []);
    } catch (err) {
      console.error('Error fetching especialidades:', err);
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

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openForm = () => {
    setForm(emptyForm);
    setFormError('');
    setNewDoctorInfo(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormError('');
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        segundo_apellido: form.segundo_apellido.trim() || undefined,
        email: form.email.trim(),
        telefono: form.telefono.trim() || undefined,
        password: form.password,
        especialidad_id: form.especialidad_id || undefined,
      };
      const { data } = await api.post('/admin/medicos', payload);
      setNewDoctorInfo({
        nombre: data.medico.nombre,
        apellido: data.medico.apellido,
        username: data.medico.username,
      });
      setFormOpen(false);
      fetchDoctors();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error al crear el medico');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={styles.headRow}>
        <div>
          <h1 style={styles.title}>Gestionar Medicos</h1>
          <p style={styles.subtitle}>Agregue medicos nuevos y cambie su estado: Activo, Baja o Vacacion</p>
        </div>
        <button style={styles.addBtn} onClick={formOpen ? closeForm : openForm}>
          {formOpen ? 'Cancelar' : '+ Agregar Medico'}
        </button>
      </div>

      {message && (
        <div className="alert-in" style={message.includes('Error') ? styles.error : styles.success}>{message}</div>
      )}

      {newDoctorInfo && (
        <div className="alert-in" style={styles.successBox}>
          <strong>Medico creado:</strong> Dr. {newDoctorInfo.nombre} {newDoctorInfo.apellido}
          <br />
          Su nombre de usuario para iniciar sesion es{' '}
          <code style={styles.usernameTag}>{newDoctorInfo.username}</code>.
          Comuniquele este usuario y la contrasena que definio — el sistema
          no tiene un flujo de recuperacion de contrasena, asi que anotelos
          en un lugar seguro.
          <button style={styles.dismissBtn} onClick={() => setNewDoctorInfo(null)}>Entendido</button>
        </div>
      )}

      {formOpen && (
        <DoctorForm
          form={form}
          especialidades={especialidades}
          formError={formError}
          saving={saving}
          onChange={handleFormChange}
          onSubmit={submitForm}
        />
      )}

      {loading ? (
        <div style={styles.skeleton} />
      ) : (
        <DoctorsTable doctors={doctors} updatingId={updatingId} onChangeStatus={changeStatus} />
      )}
    </div>
  );
}

const styles = {
  headRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '0.5rem',
  },
  title: { margin: '0 0 0.25rem', color: 'var(--color-text)', fontSize: '1.7rem' },
  subtitle: { margin: '0 0 1.5rem', color: 'var(--color-text-muted)' },
  addBtn: {
    padding: '0.6rem 1.1rem',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
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
  successBox: {
    backgroundColor: 'var(--color-success-bg)',
    border: '1px solid #bbf7d0',
    color: 'var(--color-text)',
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '1.25rem',
    fontSize: '0.88rem',
    lineHeight: 1.6,
    position: 'relative',
  },
  usernameTag: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '0.1rem 0.4rem',
    fontWeight: 700,
  },
  dismissBtn: {
    display: 'block',
    marginTop: '0.6rem',
    padding: '0.35rem 0.8rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    color: 'var(--color-text)',
  },
  skeleton: {
    height: '220px',
    borderRadius: 'var(--radius)',
    background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-border) 50%, var(--color-surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.3s ease infinite',
  },
};
