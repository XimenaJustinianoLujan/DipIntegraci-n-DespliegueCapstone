import { useState, useEffect } from 'react';
import api from '../../../config/api';
import SpecialtyForm, { emptyForm } from './SpecialtyForm';
import SpecialtiesTable from './SpecialtiesTable';

export default function ManageSpecialties() {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    try {
      const response = await api.get('/admin/especialidades');
      setSpecialties(response.data || []);
    } catch (err) {
      console.error('Error fetching especialidades:', err);
    } finally {
      setLoading(false);
    }
  };

  const openForm = () => {
    setForm(emptyForm);
    setFormError('');
    setFormOpen(true);
  };

  const handleFormFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/admin/especialidades', {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
      });
      setMessage('Especialidad creada exitosamente');
      setFormOpen(false);
      fetchSpecialties();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error al crear la especialidad');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (esp) => {
    setEditingId(esp.id);
    setEditForm({ nombre: esp.nombre, descripcion: esp.descripcion || '' });
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/admin/especialidades/${id}`, {
        nombre: editForm.nombre.trim(),
        descripcion: editForm.descripcion.trim() || '',
      });
      setMessage('Especialidad actualizada exitosamente');
      setEditingId(null);
      fetchSpecialties();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error al actualizar la especialidad');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (esp) => {
    setTogglingId(esp.id);
    setMessage('');
    try {
      await api.put(`/admin/especialidades/${esp.id}`, { activo: !esp.activo });
      setSpecialties((prev) =>
        prev.map((e) => (e.id === esp.id ? { ...e, activo: !esp.activo } : e))
      );
      setMessage(esp.activo ? 'Especialidad desactivada' : 'Especialidad reactivada');
    } catch (err) {
      setMessage('Error al cambiar el estado de la especialidad');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <div style={styles.headRow}>
        <div>
          <h1 style={styles.title}>Gestionar Especialidades</h1>
          <p style={styles.subtitle}>Agregue, edite o desactive las especialidades medicas disponibles</p>
        </div>
        <button style={styles.addBtn} onClick={formOpen ? () => setFormOpen(false) : openForm}>
          {formOpen ? 'Cancelar' : '+ Agregar Especialidad'}
        </button>
      </div>

      {message && (
        <div className="alert-in" style={message.includes('Error') ? styles.error : styles.success}>{message}</div>
      )}

      {formOpen && (
        <SpecialtyForm
          form={form}
          formError={formError}
          saving={saving}
          onChangeField={handleFormFieldChange}
          onSubmit={submitForm}
        />
      )}

      {loading ? (
        <div style={styles.skeleton} />
      ) : (
        <SpecialtiesTable
          specialties={specialties}
          editingId={editingId}
          editForm={editForm}
          togglingId={togglingId}
          saving={saving}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onChangeEditField={handleEditFieldChange}
          onSaveEdit={saveEdit}
          onToggleActive={toggleActive}
        />
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
  skeleton: {
    height: '220px',
    borderRadius: 'var(--radius)',
    background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-border) 50%, var(--color-surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.3s ease infinite',
  },
};
