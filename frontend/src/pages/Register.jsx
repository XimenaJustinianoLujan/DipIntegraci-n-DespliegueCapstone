import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const steps = [
  { n: '1', text: 'Complete sus datos personales' },
  { n: '2', text: 'Verifique su correo electronico' },
  { n: '3', text: 'Agende su primera cita medica' },
];

export default function Register() {
  const { register: registerUser } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

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
    <div className="auth-wrap">
      <div className="auth-card">
        <aside className="auth-brand">
          <div style={styles.brandTop}>
            <span style={styles.logo} aria-hidden="true">✚</span>
            <span style={styles.brandName}>JOX Citas</span>
          </div>
          <h2 style={styles.brandHeading}>Cree su cuenta de paciente</h2>
          <p style={styles.brandText}>
            Unase a la plataforma y gestione su atencion medica de forma sencilla y segura.
          </p>
          <ul style={styles.stepList}>
            {steps.map((s) => (
              <li key={s.n} style={styles.step}>
                <span style={styles.stepNum}>{s.n}</span>
                <span>{s.text}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="auth-form">
          <h1 style={styles.title}>Registro de paciente</h1>
          <p style={styles.subtitle}>Complete sus datos para crear una cuenta</p>

          {error && <div style={styles.error}>{error}</div>}

          {success ? (
            <div style={styles.successBox}>
              <span style={styles.successIcon} aria-hidden="true">✓</span>
              <h3 style={styles.successTitle}>Registro exitoso</h3>
              <p style={styles.successText}>{success}</p>
              <Link to="/login" style={styles.successBtn}>Ir a iniciar sesion</Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div style={styles.field}>
                  <label style={styles.label} htmlFor="reg-nombre">Nombre completo</label>
                  <input
                    id="reg-nombre"
                    type="text"
                    style={styles.input}
                    placeholder="Juan Perez"
                    autoComplete="name"
                    {...register('nombre', {
                      required: 'El nombre es obligatorio',
                      pattern: { value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, message: 'Solo letras y espacios' },
                    })}
                  />
                  {errors.nombre && <span style={styles.fieldError}>{errors.nombre.message}</span>}
                </div>

                <div style={styles.field}>
                  <label style={styles.label} htmlFor="reg-email">Email</label>
                  <input
                    id="reg-email"
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

                <div style={styles.row}>
                  <div style={styles.field}>
                    <label style={styles.label} htmlFor="reg-telefono">Telefono</label>
                    <input
                      id="reg-telefono"
                      type="tel"
                      style={styles.input}
                      placeholder="78912345"
                      autoComplete="tel"
                      {...register('telefono', {
                        required: 'El telefono es obligatorio',
                        pattern: { value: /^\d{7,15}$/, message: '7 a 15 digitos' },
                      })}
                    />
                    {errors.telefono && <span style={styles.fieldError}>{errors.telefono.message}</span>}
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label} htmlFor="reg-fecha">Fecha de nacimiento</label>
                    <input
                      id="reg-fecha"
                      type="date"
                      style={styles.input}
                      max={new Date().toISOString().slice(0, 10)}
                      {...register('fecha_nacimiento', {
                        required: 'La fecha es obligatoria',
                      })}
                    />
                    {errors.fecha_nacimiento && (
                      <span style={styles.fieldError}>{errors.fecha_nacimiento.message}</span>
                    )}
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label} htmlFor="reg-password">Contrasena</label>
                  <div style={styles.passWrap}>
                    <input
                      id="reg-password"
                      type={showPass ? 'text' : 'password'}
                      style={{ ...styles.input, paddingRight: '2.9rem' }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...register('password', {
                        required: 'La contrasena es obligatoria',
                        minLength: { value: 8, message: 'Minimo 8 caracteres' },
                        pattern: {
                          value: /^(?=.*[A-Z])(?=.*\d).+$/,
                          message: 'Debe contener al menos 1 mayuscula y 1 numero',
                        },
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
                  {loading ? 'Registrando...' : 'Crear cuenta'}
                </button>
              </form>

              <p style={styles.notice}>
                Tras registrarse recibira un email de verificacion. Debe confirmar su correo
                antes de iniciar sesion.
              </p>
            </>
          )}

          <p style={styles.loginLink}>
            Ya tiene cuenta? <Link to="/login">Iniciar sesion</Link>
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
  brandHeading: { fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.2, margin: '0 0 0.75rem' },
  brandText: { fontSize: '0.95rem', opacity: 0.9, lineHeight: 1.6, margin: '0 0 2rem' },
  stepList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 'auto' },
  step: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', opacity: 0.95 },
  stepNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.18)',
    fontSize: '0.85rem',
    fontWeight: 700,
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
  row: { display: 'flex', gap: '0.85rem', flexWrap: 'wrap' },
  field: { marginBottom: '1.1rem', flex: '1 1 160px' },
  label: {
    display: 'block',
    marginBottom: '0.35rem',
    color: 'var(--color-text)',
    fontSize: '0.88rem',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '0.7rem 0.85rem',
    border: '1px solid var(--color-border)',
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
  notice: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: 'var(--color-warning-bg)',
    border: '1px solid #fde68a',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    color: '#92400e',
  },
  successBox: {
    textAlign: 'center',
    padding: '1.5rem 1rem',
    backgroundColor: 'var(--color-success-bg)',
    border: '1px solid #bbf7d0',
    borderRadius: 'var(--radius)',
  },
  successIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-success)',
    color: '#fff',
    fontSize: '1.6rem',
    fontWeight: 800,
    marginBottom: '0.75rem',
  },
  successTitle: { margin: '0 0 0.4rem', color: '#166534', fontSize: '1.2rem' },
  successText: { margin: '0 0 1.25rem', color: '#15803d', fontSize: '0.88rem', lineHeight: 1.5 },
  successBtn: {
    display: 'inline-block',
    padding: '0.6rem 1.25rem',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
  loginLink: {
    marginTop: '1.25rem',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
  },
};
