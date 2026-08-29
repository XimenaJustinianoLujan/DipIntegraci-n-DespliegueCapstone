import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Comandos de navegacion por rol. Mismas rutas que Header/Sidebar; se
// mantiene una lista propia y pequena aqui (5 items o menos por rol) porque
// el palette agrega ademas comandos de accion (tema, salir) que no viven en
// la navegacion normal.
const navByRole = {
  paciente: [
    { to: '/paciente', label: 'Ir a Dashboard', icon: '🏠' },
    { to: '/paciente/agendar', label: 'Agendar Cita', icon: '📅' },
    { to: '/paciente/mis-citas', label: 'Ver Mis Citas', icon: '📋' },
    { to: '/paciente/ficha-clinica', label: 'Ver Ficha Clinica', icon: '📄' },
    { to: '/paciente/perfil', label: 'Ir a Mi Perfil', icon: '👤' },
  ],
  medico: [
    { to: '/medico', label: 'Ir a Dashboard', icon: '🏠' },
    { to: '/medico/agenda', label: 'Ver Mi Agenda', icon: '📅' },
    { to: '/medico/atender', label: 'Atender Paciente', icon: '🩺' },
  ],
  administrador: [
    { to: '/admin', label: 'Ir a Dashboard', icon: '🏠' },
    { to: '/admin/medicos', label: 'Gestionar Medicos', icon: '👨‍⚕️' },
    { to: '/admin/especialidades', label: 'Especialidades', icon: '🏷️' },
    { to: '/admin/turnos-domingo', label: 'Ver Turnos Domingo', icon: '🚑' },
  ],
  secretaria: [
    { to: '/secretaria', label: 'Ir a Dashboard', icon: '🏠' },
  ],
};

export default function CommandPalette() {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIdx(0);
  }, []);

  // Atajo global: Ctrl/Cmd+K abre; Escape cierra.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  // Permite abrirlo tambien desde un boton (ej. el "hint" del header) sin
  // acoplar componentes: se dispara un CustomEvent en vez de levantar estado.
  useEffect(() => {
    const openFromEvent = () => setOpen(true);
    window.addEventListener('jox:open-command-palette', openFromEvent);
    return () => window.removeEventListener('jox:open-command-palette', openFromEvent);
  }, []);

  useEffect(() => {
    if (open) {
      // Pequena espera para que el modal ya este en el DOM al enfocar.
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  const commands = useMemo(() => {
    if (!user) return [];
    const navCommands = (navByRole[user.role] || []).map((c) => ({
      ...c,
      action: () => navigate(c.to),
    }));
    const themeCommand = {
      label: theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
      icon: theme === 'dark' ? '☀️' : '🌙',
      action: toggleTheme,
    };
    const logoutCommand = {
      label: 'Cerrar sesion',
      icon: '🚪',
      action: () => {
        logout();
        navigate('/login');
      },
    };
    return [...navCommands, themeCommand, logoutCommand];
  }, [user, theme, navigate, toggleTheme, logout]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const runCommand = (cmd) => {
    if (!cmd) return;
    cmd.action();
    close();
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(filtered[activeIdx]);
    }
  };

  if (!isAuthenticated || !open) return null;

  return (
    <div style={styles.overlay} onClick={close} role="presentation">
      <div
        style={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
      >
        <div style={styles.inputRow}>
          <span style={styles.searchIcon} aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Buscar una accion o pagina..."
            style={styles.input}
            aria-label="Buscar comando"
          />
          <kbd style={styles.escHint}>Esc</kbd>
        </div>

        <div style={styles.list} role="listbox">
          {filtered.length === 0 ? (
            <p style={styles.empty}>Sin resultados para "{query}".</p>
          ) : (
            filtered.map((cmd, idx) => (
              <button
                key={cmd.label}
                type="button"
                role="option"
                aria-selected={idx === activeIdx}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => runCommand(cmd)}
                className="cmdpalette-item"
              >
                <span style={styles.itemIcon}>{cmd.icon}</span>
                <span>{cmd.label}</span>
              </button>
            ))
          )}
        </div>

        <div style={styles.footer}>
          <span><kbd style={styles.kbd}>↑↓</kbd> navegar</span>
          <span><kbd style={styles.kbd}>Enter</kbd> seleccionar</span>
          <span><kbd style={styles.kbd}>Ctrl</kbd>+<kbd style={styles.kbd}>K</kbd> abrir/cerrar</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    backgroundColor: 'rgba(11, 18, 32, 0.55)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '12vh',
  },
  panel: {
    width: '100%',
    maxWidth: '560px',
    margin: '0 1rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    animation: 'paletteIn 0.14s ease both',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.9rem 1.1rem',
    borderBottom: '1px solid var(--color-border)',
  },
  searchIcon: { fontSize: '0.95rem', opacity: 0.6 },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: '1rem',
    color: 'var(--color-text)',
  },
  escHint: {
    fontSize: '0.7rem',
    fontFamily: 'inherit',
    color: 'var(--color-text-subtle)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '0.15rem 0.4rem',
  },
  list: { maxHeight: '340px', overflowY: 'auto', padding: '0.5rem' },
  empty: { padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' },
  // .cmdpalette-item (+ [aria-selected="true"], que el boton ya trae) en
  // index.css: la seleccion por teclado/mouse ya se refleja en el propio
  // atributo aria-selected, asi que estilarla ahi evita duplicar el
  // estado en una clase aparte.
  itemIcon: { fontSize: '1.05rem', width: '1.4rem', textAlign: 'center', flexShrink: 0 },
  footer: {
    display: 'flex',
    gap: '1.25rem',
    padding: '0.6rem 1.1rem',
    borderTop: '1px solid var(--color-border)',
    fontSize: '0.72rem',
    color: 'var(--color-text-subtle)',
  },
  kbd: {
    fontFamily: 'inherit',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '0.05rem 0.35rem',
    marginRight: '0.15rem',
  },
};
