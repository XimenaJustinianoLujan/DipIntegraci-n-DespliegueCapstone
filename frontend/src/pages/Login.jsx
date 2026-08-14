import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      const routes = {
        paciente: '/paciente',
        medico: '/medico',
        administrador: '/admin',
        secretaria: '/secretaria',
      };
      navigate(routes[user.role] || '/');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Error al iniciar sesion. Verifique sus credenciales.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Iniciar Sesion</h2>
        <p style={styles.subtitle}>Ingrese sus credenciales para acceder al sistema</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)}>
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
            <label style={styles.label}>Contrasena</label>
            <input
              type="password"
              style={styles.input}
              placeholder="••••••••"
              {...register('password', {
                required: 'La contrasena es obligatoria',
                minLength: { value: 8, message: 'Minimo 8 caracteres' },
              })}
            />
            {errors.password && <span style={styles.fieldError}>{errors.password.message}</span>}
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesion'}
          </button>
        </form>

        <p style={styles.registerLink}>
          No tiene cuenta? <Link to="/register">Registrarse como paciente</Link>
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
    minHeight: '60vh',
  },
  card: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
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
  registerLink: { marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' },
};
