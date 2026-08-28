export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.inner}>
        <span style={styles.brand}>
          <span style={styles.dot} aria-hidden="true">✚</span>
          Vitalia Citas
        </span>
        <span style={styles.copy}>
          &copy; {new Date().getFullYear()} Plataforma de Citas Medicas · Todos los derechos reservados
        </span>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    backgroundColor: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border)',
    marginTop: 'auto',
  },
  inner: {
    maxWidth: '1320px',
    margin: '0 auto',
    padding: '1rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    fontSize: '0.85rem',
  },
  dot: { color: 'var(--color-primary)' },
  copy: { color: 'var(--color-text-subtle)', fontSize: '0.8rem' },
};
