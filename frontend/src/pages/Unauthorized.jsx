import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Acceso Denegado</h1>
      <p style={styles.message}>No tiene permisos para acceder a esta pagina.</p>
      <Link to="/" style={styles.link}>Volver al inicio</Link>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    textAlign: 'center',
  },
  title: { color: '#dc2626', fontSize: '2rem', margin: '0 0 1rem' },
  message: { color: '#64748b', fontSize: '1.1rem', marginBottom: '1.5rem' },
  link: {
    padding: '0.6rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '4px',
  },
};
