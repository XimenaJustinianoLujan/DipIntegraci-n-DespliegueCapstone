import { useState, useEffect } from 'react';
import api from '../../config/api';

// El backend usa el enum en MAYUSCULAS (ACTIVO/BAJA/VACACION); mostramos una
// etiqueta capitalizada pero enviamos el valor que la API valida.
const statusMeta = {
  ACTIVO: { label: 'Activo', bg: '#dcfce7', color: '#16a34a' },
  BAJA: { label: 'Baja', bg: '#fee2e2', color: '#dc2626' },
  VACACION: { label: 'Vacacion', bg: '#fef3c7', color: '#d97706' },
};
const statusOptions = ['ACTIVO', 'BAJA', 'VACACION'];

const emptyForm = {
  nombre: '',
  apellido: '',
  segundo_apellido: '',
  email: '',
  telefono: '',
  password: '',
  especialidad_id: '',
};

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
        <form onSubmit={submitForm} className="alert-in" style={styles.form}>
          <h3 style={styles.formTitle}>Datos del nuevo medico</h3>
          {formError && <div style={styles.error}>{formError}</div>}

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="new-medico-nombre">Nombre *</label>
              <input
                id="new-medico-nombre"
                name="nombre"
                type="text"
                style={styles.input}
                value={form.nombre}
                onChange={handleFormChange}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="new-medico-apellido">Apellido *</label>
              <input
                id="new-medico-apellido"
                name="apellido"
                type="text"
                style={styles.input}
                value={form.apellido}
                onChange={handleFormChange}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="new-medico-segundo">Segundo apellido</label>
              <input
                id="new-medico-segundo"
                name="segundo_apellido"
                type="text"
                style={styles.input}
                value={form.segundo_apellido}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="new-medico-email">Email *</label>
              <input
                id="new-medico-email"
                name="email"
                type="email"
                style={styles.input}
                value={form.email}
                onChange={handleFormChange}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="new-medico-telefono">Telefono</label>
              <input
                id="new-medico-telefono"
                name="telefono"
                type="tel"
                style={styles.input}
                placeholder="78912345"
                value={form.telefono}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="new-medico-especialidad">Especialidad</label>
              <select
                id="new-medico-especialidad"
                name="especialidad_id"
                style={styles.input}
                value={form.especialidad_id}
                onChange={handleFormChange}
              >
                <option value="">Sin especialidad</option>
                {especialidades.map((esp) => (
                  <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="new-medico-password">Contrasena inicial *</label>
              <input
                id="new-medico-password"
                name="password"
                type="password"
                style={styles.input}
                placeholder="Minimo 8, con 1 mayuscula y 1 numero"
                value={form.password}
                onChange={handleFormChange}
                required
              />
            </div>
          </div>

          <p style={styles.hint}>
            El nombre de usuario se genera automaticamente a partir del nombre
            y apellido (ej. Juan Perez → jperez). Se lo mostraremos apenas se
            cree la cuenta.
          </p>

          <button type="submit" style={styles.submitBtn} disabled={saving}>
            {saving ? 'Creando...' : 'Crear Medico'}
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
                <th style={styles.th}>Medico</th>
                <th style={styles.th}>Especialidad</th>
                <th style={styles.th}>Estado actual</th>
                <th style={styles.th}>Cambiar a</th>
              </tr>
            </thead>
            <tbody>
              {doctors.length === 0 ? (
                <tr>
                  <td colSpan="4" style={styles.empty}>No hay medicos registrados.</td>
                </tr>
              ) : (
                doctors.map((doc) => {
                  const meta = statusMeta[doc.estado] || { label: doc.estado || 'Activo', bg: '#f1f5f9', color: '#475569' };
                  return (
                    <tr key={doc.id}>
                      <td style={styles.td}>
                        <div style={styles.docCell}>
                          <span style={styles.docAvatar}>
                            {(doc.nombre?.[0] || '') + (doc.apellido?.[0] || '')}
                          </span>
                          <strong>Dr. {doc.nombre} {doc.apellido}</strong>
                        </div>
                      </td>
                      <td style={styles.td}>{doc.especialidad || '—'}</td>
                      <td style={styles.td}>
                        <span className="badge" style={{ backgroundColor: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {statusOptions
                            .filter((s) => s !== doc.estado)
                            .map((status) => (
                              <button
                                key={status}
                                style={styles.actionBtn}
                                onClick={() => changeStatus(doc.id, status)}
                                disabled={updatingId === doc.id}
                              >
                                {statusMeta[status].label}
                              </button>
                            ))}
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
  form: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    maxWidth: '720px',
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
  hint: { fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 1rem' },
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
    padding: '0.85rem 1rem',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.9rem',
    color: 'var(--color-text)',
  },
  docCell: { display: 'flex', alignItems: 'center', gap: '0.65rem' },
  docAvatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary-dark)',
    fontSize: '0.75rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    flexShrink: 0,
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
  skeleton: {
    height: '220px',
    borderRadius: 'var(--radius)',
    background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-border) 50%, var(--color-surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.3s ease infinite',
  },
};
