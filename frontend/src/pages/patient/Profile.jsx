import { useState, useEffect } from 'react';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';

// Solo letras y espacios (coincide con la validacion del backend).
const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
const PHONE_REGEX = /^\d{7,15}$/;

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    fecha_nacimiento: '',
  });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/pacientes/${user.id}`);
        setForm({
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          telefono: data.telefono || '',
          // La fecha viene como ISO; el input date necesita solo YYYY-MM-DD.
          fecha_nacimiento: data.fecha_nacimiento
            ? String(data.fecha_nacimiento).slice(0, 10)
            : '',
        });
        setEmail(data.email || '');
      } catch (err) {
        setError('No se pudieron cargar sus datos.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user.id]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess('');
  };

  const validate = () => {
    if (!form.nombre.trim() || !NAME_REGEX.test(form.nombre)) {
      return 'El nombre solo puede contener letras y espacios.';
    }
    if (!form.apellido.trim() || !NAME_REGEX.test(form.apellido)) {
      return 'El apellido solo puede contener letras y espacios.';
    }
    if (form.telefono && !PHONE_REGEX.test(form.telefono)) {
      return 'El telefono debe ser numerico, de 7 a 15 digitos.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      // Se omiten los campos vacios para no chocar con las validaciones opcionales.
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        telefono: form.telefono || undefined,
        fecha_nacimiento: form.fecha_nacimiento || undefined,
      };
      const { data } = await api.put(`/pacientes/${user.id}`, payload);
      // Refresca el nombre guardado (se ve en el saludo y el encabezado).
      updateUser({ nombre: data.nombre, apellido: data.apellido });
      setSuccess('Datos actualizados correctamente.');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Cargando perfil...</p>;

  return (
    <div>
      <h1 style={styles.title}>Mi Perfil</h1>
      <p style={styles.subtitle}>Consulte y actualice sus datos personales</p>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="profile-email">Email</label>
          <input id="profile-email" type="email" style={{ ...styles.input, ...styles.readonly }} value={email} disabled />
          <span style={styles.hint}>El email no se puede modificar.</span>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="profile-nombre">Nombre</label>
            <input
              id="profile-nombre"
              type="text"
              name="nombre"
              style={styles.input}
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="profile-apellido">Apellido</label>
            <input
              id="profile-apellido"
              type="text"
              name="apellido"
              style={styles.input}
              value={form.apellido}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="profile-telefono">Telefono</label>
            <input
              id="profile-telefono"
              type="tel"
              name="telefono"
              style={styles.input}
              value={form.telefono}
              onChange={handleChange}
              placeholder="Ej: 78912345"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="profile-fecha">Fecha de nacimiento</label>
            <input
              id="profile-fecha"
              type="date"
              name="fecha_nacimiento"
              style={styles.input}
              value={form.fecha_nacimiento}
              onChange={handleChange}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        <button type="submit" style={styles.submitBtn} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: 'var(--color-text)' },
  subtitle: { margin: '0 0 1.5rem', color: 'var(--color-text-muted)' },
  error: {
    backgroundColor: 'var(--color-danger-bg)',
    border: '1px solid #fecaca',
    color: 'var(--color-danger)',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  success: {
    backgroundColor: 'var(--color-success-bg)',
    border: '1px solid #bbf7d0',
    color: 'var(--color-success)',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  form: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: 'var(--shadow-sm)',
    maxWidth: '600px',
  },
  row: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  field: { marginBottom: '1.25rem', flex: '1 1 220px' },
  label: {
    display: 'block',
    marginBottom: '0.3rem',
    color: 'var(--color-text)',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  readonly: { backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' },
  hint: { fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginTop: '0.25rem', display: 'block' },
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
