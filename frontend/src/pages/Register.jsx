import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await registerUser(data);
      setSuccess(
        'Registro exitoso. Se ha enviado un email de verificacion a su correo. Debe validar su email antes de iniciar sesion.'
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Registro de Paciente</h2>
        <p style={styles.subtitle}>Complete sus datos para crear una cuenta</p>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={styles.field}>
            <label style={styles.label}>Nombre completo</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Juan Perez"
              {...register('nombre', {
                required: 'El nombre es obligatorio',
                pattern: {
                  value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
                  message: 'Solo letras y espacios',
                },
              })}
            />
            {errors.nombre && <span style={styles.fieldError}>{errors.nombre.message}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              placeholder="correo@ejemplo.com"
              {...register('email', {
                required: 'El email es obligatorio',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Formato de email invalido',
                },
              })}
            />
            {errors.email && <span style={styles.fieldError}>{errors.email.message}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Telefono</label>
            <input
              type="tel"
              style={styles.input}
              placeholder="1155667788"
              {...register('telefono', {
                required: 'El telefono es obligatorio',
                pattern: {
                  value: /^\d{7,15}$/,
                  message: 'Formato numerico, entre 7 y 15 digitos',
                },
              })}
            />
            {errors.telefono && <span style={styles.fieldError}>{errors.telefono.message}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Contrasena</label>
            <input
              type="password"
              style={styles.input}
              placeholder="••••••••"
              {...register('password', {
                required: 'La contrasena es obligatoria',
                minLength: { value: 8, message: 'Minimo 8 caracteres' },
                pattern: {
                  value: /^(?=.*[A-Z])(?=.*\d).+$/,
                  message: 'Debe contener al menos 1 mayuscula y 1 numero',
                },
              })}
            />
            {errors.password && <span style={styles.fieldError}>{errors.password.message}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Fecha de nacimiento</label>
            <input
              type="date"
              style={styles.input}
              {...register('fecha_nacimiento', {
                required: 'La fecha de nacimiento es obligatoria',
              })}
            />
            {errors.fecha_nacimiento && (
              <span style={styles.fieldError}>{errors.fecha_nacimiento.message}</span>
            )}
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p style={styles.notice}>
          Despues de registrarse, recibira un email de verificacion. Debe confirmar su correo antes de poder iniciar sesion.
        </p>

        <p style={styles.loginLink}>
          Ya tiene cuenta? <Link to="/login">Iniciar Sesion</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem 0',
  },
  card: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '450px',
  },
  title: { margin: '0 0 0.5rem', color: '#1e293b', fontSize: '1.5rem' },
  subtitle: { margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.9rem' },
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
  field: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '0.3rem', color: '#374151', fontSize: '0.9rem', fontWeight: '500' },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  fieldError: { color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' },
  button: {
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
  notice: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '4px',
    fontSize: '0.8rem',
    color: '#92400e',
  },
  loginLink: { marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' },
};
