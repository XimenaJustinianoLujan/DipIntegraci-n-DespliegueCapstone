export default function Step({ n, label, htmlFor, disabled, children }) {
  return (
    <div className={`wizard-step${disabled ? ' disabled' : ''}`}>
      <div style={styles.stepLabel}>
        <span style={styles.stepNum}>{n}</span>
        <label style={styles.label} htmlFor={htmlFor}>{label}</label>
      </div>
      {children}
    </div>
  );
}

// .wizard-step / .disabled en index.css: paso deshabilitado hasta
// completar el anterior, no un valor que dependa de datos.
const styles = {
  stepLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
  stepNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-dark)',
    fontSize: '0.78rem',
    fontWeight: 800,
  },
  label: { color: 'var(--color-text)', fontSize: '0.9rem', fontWeight: 600 },
};
