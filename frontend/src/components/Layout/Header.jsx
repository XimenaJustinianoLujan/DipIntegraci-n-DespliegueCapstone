import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navByRole = {
  paciente: [
    { to: '/paciente', label: 'Dashboard', icon: '🏠' },
    { to: '/paciente/agendar', label: 'Agendar Cita', icon: '📅' },
    { to: '/paciente/mis-citas', label: 'Mis Citas', icon: '📋' },
    { to: '/paciente/ficha-clinica', label: 'Ficha Clinica', icon: '📄' },
    { to: '/paciente/perfil', label: 'Mi Perfil', icon: '👤' },
  ],
  medico: [
    { to: '/medico', label: 'Dashboard', icon: '🏠' },
    { to: '/medico/agenda', label: 'Mi Agenda', icon: '📅' },
    { to: '/medico/atender', label: 'Atender Paciente', icon: '🩺' },
  ],
  administrador: [
    { to: '/admin', label: 'Dashboard', icon: '🏠' },
    { to: '/admin/medicos', label: 'Gestionar Medicos', icon: '👨‍⚕️' },
    { to: '/admin/especialidades', label: 'Especialidades', icon: '🏷️' },
    { to: '/admin/turnos-domingo', label: 'Turnos Domingo', icon: '🚑' },
  ],
  secretaria: [
    { to: '/secretaria', label: 'Dashboard', icon: '🏠' },
  ],
};

const roleLabels = {
  paciente: 'Paciente',
  medico: 'Medico',
  administrador: 'Administrador',
  secretaria: 'Secretaria',
};

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = theme === 'dark';

  // Cierra el menu movil al navegar a otra ruta.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = user ? navByRole[user.role] || [] : [];

  const isActive = (to) =>
    to === `/${user?.role === 'administrador' ? 'admin' : user?.role}`
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <Link to="/" style={styles.brand}>
          <span style={styles.logo} aria-hidden="true">✚</span>
          <span style={styles.brandText}>
            JOX <span style={styles.brandThin}>Citas</span>
          </span>
        </Link>

        <nav style={styles.nav}>
          {isAuthenticated ? (
            <>
              <div className="desktop-nav-links" style={styles.navLinks}>
                {links.map((link) => {
                  const active = isActive(link.to);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`header-nav-link${active ? ' active' : ''}`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <button
                className="desktop-nav-links"
                onClick={() => window.dispatchEvent(new CustomEvent('jox:open-command-palette'))}
                style={styles.cmdkBtn}
                title="Buscar acciones (Ctrl+K)"
              >
                <span aria-hidden="true">🔍</span>
                <kbd style={styles.cmdkKbd}>Ctrl K</kbd>
              </button>

              <div className="header-user-box" style={styles.userBox}>
                <span style={styles.avatar}>{initials(user.nombre)}</span>
                <span style={styles.userMeta}>
                  <span style={styles.userName}>{user.nombre}</span>
                  <span style={styles.userRole}>{roleLabels[user.role] || user.role}</span>
                </span>
                <button onClick={handleLogout} style={styles.logoutBtn} title="Cerrar sesion">
                  Salir
                </button>
              </div>

              <button
                onClick={toggleTheme}
                style={styles.themeBtn}
                aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
                title={isDark ? 'Tema claro' : 'Tema oscuro'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>

              <button
                className="mobile-menu-btn"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'Cerrar menu' : 'Abrir menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            </>
          ) : (
            <div style={styles.navLinks}>
              <button
                onClick={toggleTheme}
                style={styles.themeBtn}
                aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
                title={isDark ? 'Tema claro' : 'Tema oscuro'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <Link to="/login" className="header-nav-link">Iniciar Sesion</Link>
              <Link to="/register" className="header-nav-link cta">
                Registrarse
              </Link>
            </div>
          )}
        </nav>
      </div>

      {isAuthenticated && (
        <div className={`mobile-menu-panel${menuOpen ? ' open' : ''}`}>
          <div style={styles.mobileUser}>
            <span style={styles.avatar}>{initials(user.nombre)}</span>
            <span style={styles.userMeta}>
              <span style={styles.mobileUserName}>{user.nombre}</span>
              <span style={styles.mobileUserRole}>
                {roleLabels[user.role] || user.role}
              </span>
            </span>
          </div>
          {links.map((link) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`header-mobile-link${active ? ' active' : ''}`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
          <button onClick={toggleTheme} style={styles.mobileThemeBtn}>
            <span>{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? 'Tema claro' : 'Tema oscuro'}</span>
          </button>
          <button onClick={handleLogout} style={styles.mobileLogoutBtn}>
            Cerrar sesion
          </button>
        </div>
      )}
    </header>
  );
}

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#fff',
    boxShadow: '0 2px 10px rgba(30, 64, 175, 0.25)',
  },
  inner: {
    maxWidth: '1320px',
    margin: '0 auto',
    height: 'var(--header-h)',
    padding: '0 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    color: '#fff',
    textDecoration: 'none',
    flexShrink: 0,
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    background: '#fff',
    color: '#2563eb',
    borderRadius: '10px',
    fontSize: '1.15rem',
    fontWeight: 800,
    boxShadow: '0 2px 6px rgba(0,0,0,.15)',
  },
  brandText: { fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em' },
  brandThin: { fontWeight: 400, opacity: 0.85 },
  nav: { display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' },
  navLinks: { display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' },
  // Los links de nav (activo + CTA de registro) viven como clases CSS
  // (.header-nav-link / .active / .cta en index.css): son estado
  // interactivo, no estilos que dependan de datos, asi que una clase
  // real es mas simple que armar el objeto a mano en cada render.
  userBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    paddingLeft: '1rem',
    borderLeft: '1px solid rgba(255,255,255,0.22)',
  },
  avatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  userMeta: { display: 'flex', flexDirection: 'column', lineHeight: 1.15 },
  userName: { fontSize: '0.85rem', fontWeight: 600 },
  userRole: { fontSize: '0.72rem', opacity: 0.8 },
  // Mismo texto que userName/userRole, pero sobre el panel movil (fondo
  // claro/oscuro segun tema) en vez del header azul: necesitan su propio
  // color, no son el mismo estilo con un solo campo distinto.
  mobileUserName: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' },
  mobileUserRole: { fontSize: '0.72rem', opacity: 0.8, color: 'var(--color-text-muted)' },
  logoutBtn: {
    marginLeft: '0.4rem',
    backgroundColor: 'rgba(255,255,255,0.14)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.28)',
    padding: '0.4rem 0.85rem',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 600,
  },
  mobileUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.5rem 0.6rem 0.85rem',
    borderBottom: '1px solid var(--color-border)',
    marginBottom: '0.4rem',
  },
  // .header-mobile-link / .active en index.css (mismo criterio que los
  // links del nav de escritorio).
  cmdkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.4rem 0.65rem',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.22)',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  cmdkKbd: {
    fontFamily: 'inherit',
    fontSize: '0.68rem',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '4px',
    padding: '0.1rem 0.35rem',
  },
  themeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.24)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
    flexShrink: 0,
  },
  mobileThemeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    marginTop: '0.4rem',
    padding: '0.7rem 0.75rem',
    backgroundColor: 'var(--color-surface-2)',
    color: 'var(--color-text)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
  },
  mobileLogoutBtn: {
    marginTop: '0.5rem',
    padding: '0.65rem',
    backgroundColor: 'var(--color-danger-bg)',
    color: 'var(--color-danger)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
