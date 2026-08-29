export default function Step({ n, label, htmlFor, disabled, children }) {
  return (
    <div style={{ ...styles.step, ...(disabled ? styles.stepDisabled : {}) }}>
      <div style={styles.stepLabel}>
        <span style={styles.stepNum}>{n}</span>
        <label style={styles.label} htmlFor={htmlFor}>{label}</label>
      </div>
      {children}
    </div>
  );
}

const styles = {
  step: { marginBottom: '1.5rem' },
  stepDisabled: { opacity: 0.55 },
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
