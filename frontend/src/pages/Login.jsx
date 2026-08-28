import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: '📅', text: 'Agende sus citas en linea en segundos' },
  { icon: '🔔', text: 'Recordatorios y notificaciones automaticas' },
  { icon: '📄', text: 'Su historial clinico siempre a la mano' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
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

  const fillDemo = () => {
    setValue('email', 'paciente@clinica.com');
    setValue('password', 'Paciente123!');
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <aside className="auth-brand">
          <div style={styles.brandTop}>
            <span style={styles.logo} aria-hidden="true">✚</span>
            <span style={styles.brandName}>Vitalia Citas</span>
          </div>
          <h2 style={styles.brandHeading}>Su salud, mejor organizada</h2>
          <p style={styles.brandText}>
            Plataforma integral para gestionar citas medicas, agendas y fichas clinicas
            en un solo lugar.
          </p>
          <ul style={styles.featureList}>
            {features.map((f) => (
              <li key={f.text} style={styles.feature}>
                <span style={styles.featureIcon}>{f.icon}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="auth-form">
          <h1 style={styles.title}>Iniciar sesion</h1>
          <p style={styles.subtitle}>Ingrese sus credenciales para acceder al sistema</p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                style={styles.input}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
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
              <label style={styles.label} htmlFor="login-password">Contrasena</label>
              <div style={styles.passWrap}>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  style={{ ...styles.input, paddingRight: '2.9rem' }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', {
                    required: 'La contrasena es obligatoria',
                    minLength: { value: 8, message: 'Minimo 8 caracteres' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  style={styles.passToggle}
                  aria-label={showPass ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span style={styles.fieldError}>{errors.password.message}</span>}
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesion'}
            </button>
          </form>

          <button type="button" onClick={fillDemo} style={styles.demoBtn}>
            Usar cuenta de demostracion
          </button>

          <p style={styles.registerLink}>
            No tiene cuenta? <Link to="/register">Registrarse como paciente</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  brandTop: { display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '38px',
    height: '38px',
    background: '#fff',
    color: '#2563eb',
    borderRadius: '10px',
    fontSize: '1.25rem',
    fontWeight: 800,
  },
  brandName: { fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' },
  brandHeading: { fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.2, margin: '0 0 0.75rem' },
  brandText: { fontSize: '0.95rem', opacity: 0.9, lineHeight: 1.6, margin: '0 0 2rem' },
  featureList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: 'auto' },
  feature: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', opacity: 0.95 },
  featureIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.15)',
    fontSize: '1rem',
    flexShrink: 0,
  },
  title: { margin: '0 0 0.35rem', color: 'var(--color-text)', fontSize: '1.6rem' },
  subtitle: { margin: '0 0 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' },
  error: {
    backgroundColor: 'var(--color-danger-bg)',
    border: '1px solid #fecaca',
    color: 'var(--color-danger)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  field: { marginBottom: '1.1rem' },
  label: {
    display: 'block',
    marginBottom: '0.35rem',
    color: '#374151',
    fontSize: '0.88rem',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '0.7rem 0.85rem',
    border: '1px solid #d1d5db',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.92rem',
    boxSizing: 'border-box',
  },
  passWrap: { position: 'relative' },
  passToggle: {
    position: 'absolute',
    right: '0.5rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    fontSize: '1.05rem',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
  },
  fieldError: { color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' },
  button: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.98rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.35rem',
  },
  demoBtn: {
    width: '100%',
    marginTop: '0.85rem',
    padding: '0.65rem',
    backgroundColor: 'transparent',
    color: 'var(--color-primary)',
    border: '1px dashed #bfdbfe',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  registerLink: {
    marginTop: '1.25rem',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
  },
};
