import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navByRole = {
  paciente: [
    { to: '/paciente', label: 'Dashboard' },
    { to: '/paciente/agendar', label: 'Agendar Cita' },
    { to: '/paciente/mis-citas', label: 'Mis Citas' },
    { to: '/paciente/ficha-clinica', label: 'Ficha Clinica' },
  ],
  medico: [
    { to: '/medico', label: 'Dashboard' },
    { to: '/medico/agenda', label: 'Mi Agenda' },
    { to: '/medico/atender', label: 'Atender Paciente' },
  ],
  administrador: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/medicos', label: 'Gestionar Medicos' },
    { to: '/admin/turnos-domingo', label: 'Turnos Domingo' },
  ],
  secretaria: [
    { to: '/secretaria', label: 'Dashboard' },
  ],
};

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = user ? navByRole[user.role] || [] : [];

  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <Link to="/" style={styles.brandLink}>
          Clinica - Citas Medicas
        </Link>
      </div>
      <nav style={styles.nav}>
        {isAuthenticated ? (
          <>
            {links.map((link) => (
              <Link key={link.to} to={link.to} style={styles.link}>
                {link.label}
              </Link>
            ))}
            <span style={styles.userInfo}>
              {user.nombre} ({user.role})
            </span>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Cerrar Sesion
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={styles.link}>Iniciar Sesion</Link>
            <Link to="/register" style={styles.link}>Registrarse</Link>
          </>
        )}
      </nav>
    </header>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#2563eb',
    color: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  brand: { fontSize: '1.25rem', fontWeight: 'bold' },
  brandLink: { color: 'white', textDecoration: 'none' },
  nav: { display: 'flex', alignItems: 'center', gap: '1rem' },
  link: { color: 'white', textDecoration: 'none', fontSize: '0.9rem' },
  userInfo: { fontSize: '0.85rem', opacity: 0.9 },
  logoutBtn: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '0.4rem 0.8rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
};
