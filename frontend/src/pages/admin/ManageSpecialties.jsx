import { useState, useEffect } from 'react';
import api from '../../config/api';

const emptyForm = { nombre: '', descripcion: '' };

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
        <form onSubmit={submitForm} className="alert-in" style={styles.form}>
          <h3 style={styles.formTitle}>Nueva especialidad</h3>
          {formError && <div style={styles.error}>{formError}</div>}

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="new-esp-nombre">Nombre *</label>
              <input
                id="new-esp-nombre"
                type="text"
                style={styles.input}
                placeholder="Ej: Odontologia"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                required
              />
            </div>
            <div style={{ ...styles.field, flex: '2 1 260px' }}>
              <label style={styles.label} htmlFor="new-esp-desc">Descripcion</label>
              <input
                id="new-esp-desc"
                type="text"
                style={styles.input}
                placeholder="Breve descripcion (opcional)"
                value={form.descripcion}
                onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              />
            </div>
          </div>

          <button type="submit" style={styles.submitBtn} disabled={saving}>
            {saving ? 'Creando...' : 'Crear Especialidad'}
          </button>
        </form>
      )}

      {loading ? (
        <div style={styles.skeleton} />
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Descripcion</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {specialties.length === 0 ? (
                <tr>
                  <td colSpan="4" style={styles.empty}>No hay especialidades registradas.</td>
                </tr>
              ) : (
                specialties.map((esp) => {
                  const isEditing = editingId === esp.id;
                  return (
                    <tr key={esp.id} style={!esp.activo ? styles.rowInactive : undefined}>
                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.editInput}
                            value={editForm.nombre}
                            onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))}
                          />
                        ) : (
                          <strong>{esp.nombre}</strong>
                        )}
                      </td>
                      <td style={styles.td}>
                        {isEditing ? (
                          <input
                            style={styles.editInput}
                            value={editForm.descripcion}
                            onChange={(e) => setEditForm((p) => ({ ...p, descripcion: e.target.value }))}
                          />
                        ) : (
                          esp.descripcion || '—'
                        )}
                      </td>
                      <td style={styles.td}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: esp.activo ? '#dcfce7' : '#f1f5f9',
                            color: esp.activo ? '#16a34a' : '#64748b',
                          }}
                        >
                          {esp.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {isEditing ? (
                            <>
                              <button style={styles.actionBtn} onClick={() => saveEdit(esp.id)} disabled={saving}>
                                Guardar
                              </button>
                              <button style={styles.actionBtnGhost} onClick={cancelEdit}>Cancelar</button>
                            </>
                          ) : (
                            <>
                              <button style={styles.actionBtn} onClick={() => startEdit(esp)}>Editar</button>
                              <button
                                style={esp.activo ? styles.actionBtnDanger : styles.actionBtn}
                                onClick={() => toggleActive(esp)}
                                disabled={togglingId === esp.id}
                              >
                                {esp.activo ? 'Desactivar' : 'Reactivar'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
  form: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    maxWidth: '640px',
  },
  formTitle: { margin: '0 0 1rem', color: 'var(--color-text)', fontSize: '1.05rem' },
  row: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  field: { marginBottom: '1.1rem', flex: '1 1 180px' },
  label: {
    display: 'block',
    marginBottom: '0.3rem',
    color: 'var(--color-text)',
    fontSize: '0.88rem',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  submitBtn: {
    padding: '0.65rem 1.5rem',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tableContainer: {
    overflowX: 'auto',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--color-surface)' },
  th: {
    padding: '0.85rem 1rem',
    backgroundColor: 'var(--color-surface-2)',
    borderBottom: '1px solid var(--color-border)',
    textAlign: 'left',
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
  },
  td: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.9rem',
    color: 'var(--color-text)',
  },
  rowInactive: { opacity: 0.6 },
  editInput: {
    width: '100%',
    padding: '0.4rem 0.6rem',
    border: '1px solid var(--color-primary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    boxSizing: 'border-box',
  },
  empty: { textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' },
  actions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  actionBtn: {
    padding: '0.35rem 0.7rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-surface)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  actionBtnGhost: {
    padding: '0.35rem 0.7rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
  },
  actionBtnDanger: {
    padding: '0.35rem 0.7rem',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-surface)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--color-danger)',
  },
  skeleton: {
    height: '220px',
    borderRadius: 'var(--radius)',
    background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-border) 50%, var(--color-surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.3s ease infinite',
  },
};
