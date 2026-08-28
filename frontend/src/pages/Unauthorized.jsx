import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <span style={styles.icon} aria-hidden="true">🔒</span>
        <h1 style={styles.title}>Acceso denegado</h1>
        <p style={styles.message}>No tiene permisos para acceder a esta pagina.</p>
        <Link to="/" style={styles.link}>Volver al inicio</Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - var(--header-h) - 160px)',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '0.5rem',
    padding: '3rem 2.5rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow)',
    maxWidth: '420px',
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-danger-bg)',
    fontSize: '1.8rem',
    marginBottom: '0.5rem',
  },
  title: { color: 'var(--color-text)', fontSize: '1.6rem', margin: 0 },
  message: { color: 'var(--color-text-muted)', fontSize: '1rem', margin: '0 0 1rem' },
  link: {
    padding: '0.65rem 1.5rem',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
};
