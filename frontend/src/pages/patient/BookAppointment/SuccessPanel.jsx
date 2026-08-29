import { SuccessBurst } from '../../../components/illustrations/EmptyState';

export default function SuccessPanel({ message }) {
  return (
    <div style={styles.successPanel}>
      <SuccessBurst />
      <h2 style={styles.successTitle}>¡Cita confirmada!</h2>
      <p style={styles.successText}>{message}</p>
      <p style={styles.successHint}>Redirigiendo a Mis Citas...</p>
    </div>
  );
}

const styles = {
  successPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '0.4rem',
    padding: '3rem 1.5rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow)',
    maxWidth: '460px',
    margin: '2rem auto',
  },
  successTitle: { margin: '0.75rem 0 0', color: 'var(--color-text)', fontSize: '1.4rem' },
  successText: { margin: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem' },
  successHint: { margin: '0.5rem 0 0', color: 'var(--color-text-subtle)', fontSize: '0.82rem' },
};
