import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const sidebarLinks = {
  paciente: [
    { to: '/paciente', label: 'Inicio', icon: '🏠' },
    { to: '/paciente/agendar', label: 'Agendar Cita', icon: '📅' },
    { to: '/paciente/mis-citas', label: 'Mis Citas', icon: '📋' },
    { to: '/paciente/ficha-clinica', label: 'Ficha Clinica', icon: '📄' },
  ],
  medico: [
    { to: '/medico', label: 'Inicio', icon: '🏠' },
    { to: '/medico/agenda', label: 'Mi Agenda', icon: '📅' },
    { to: '/medico/atender', label: 'Atender Paciente', icon: '🩺' },
  ],
  administrador: [
    { to: '/admin', label: 'Inicio', icon: '🏠' },
    { to: '/admin/medicos', label: 'Gestionar Medicos', icon: '👨‍⚕️' },
    { to: '/admin/turnos-domingo', label: 'Turnos Domingo', icon: '🚑' },
  ],
  secretaria: [
    { to: '/secretaria', label: 'Inicio', icon: '🏠' },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const links = sidebarLinks[user.role] || [];

  return (
    <aside style={styles.sidebar}>
      <nav>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              ...styles.link,
              ...(location.pathname === link.to ? styles.activeLink : {}),
            }}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '220px',
    backgroundColor: '#f8fafc',
    borderRight: '1px solid #e2e8f0',
    padding: '1rem 0',
    minHeight: 'calc(100vh - 130px)',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    textDecoration: 'none',
    color: '#475569',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s',
  },
  activeLink: {
    backgroundColor: '#e0e7ff',
    color: '#2563eb',
    fontWeight: '600',
    borderRight: '3px solid #2563eb',
  },
};
