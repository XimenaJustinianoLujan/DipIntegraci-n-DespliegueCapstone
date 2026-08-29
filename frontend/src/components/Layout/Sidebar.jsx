import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const sidebarLinks = {
  paciente: [
    { to: '/paciente', label: 'Inicio', icon: '🏠' },
    { to: '/paciente/agendar', label: 'Agendar Cita', icon: '📅' },
    { to: '/paciente/mis-citas', label: 'Mis Citas', icon: '📋' },
    { to: '/paciente/ficha-clinica', label: 'Ficha Clinica', icon: '📄' },
    { to: '/paciente/perfil', label: 'Mi Perfil', icon: '👤' },
  ],
  medico: [
    { to: '/medico', label: 'Inicio', icon: '🏠' },
    { to: '/medico/agenda', label: 'Mi Agenda', icon: '📅' },
    { to: '/medico/atender', label: 'Atender Paciente', icon: '🩺' },
  ],
  administrador: [
    { to: '/admin', label: 'Inicio', icon: '🏠' },
    { to: '/admin/medicos', label: 'Gestionar Medicos', icon: '👨‍⚕️' },
    { to: '/admin/especialidades', label: 'Especialidades', icon: '🏷️' },
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
  const homePath = `/${user.role === 'administrador' ? 'admin' : user.role}`;

  const isActive = (to) =>
    to === homePath
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <aside className="app-sidebar" style={styles.sidebar}>
      <p style={styles.sectionLabel}>Menu</p>
      <nav style={styles.nav}>
        {links.map((link) => {
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              style={{ ...styles.link, ...(active ? styles.activeLink : {}) }}
            >
              <span style={{ ...styles.iconTile, ...(active ? styles.iconTileActive : {}) }}>
                {link.icon}
              </span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-w)',
    flexShrink: 0,
    backgroundColor: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    padding: '1.25rem 0.75rem',
    minHeight: 'calc(100vh - var(--header-h))',
    position: 'sticky',
    top: 'var(--header-h)',
    alignSelf: 'flex-start',
  },
  sectionLabel: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--color-text-subtle)',
    padding: '0 0.75rem',
    marginBottom: '0.6rem',
  },
  nav: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    padding: '0.55rem 0.75rem',
    textDecoration: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '0.9rem',
    fontWeight: 500,
    borderRadius: 'var(--radius-sm)',
    transition: 'background-color 0.15s ease, color 0.15s ease',
  },
  activeLink: {
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-dark)',
    fontWeight: 600,
  },
  iconTile: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-surface-2)',
    fontSize: '0.95rem',
    flexShrink: 0,
  },
  iconTileActive: {
    backgroundColor: 'var(--color-primary-light)',
  },
};
