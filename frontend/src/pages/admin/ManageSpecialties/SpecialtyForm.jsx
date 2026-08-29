export const emptyForm = { nombre: '', descripcion: '' };

// Formulario de alta de especialidad. Sin fetch propio: recibe el estado
// del form y los handlers desde ManageSpecialties/index.jsx.
export default function SpecialtyForm({ form, formError, saving, onChangeField, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="alert-in" style={styles.form}>
      <h3 style={styles.formTitle}>Nueva especialidad</h3>
      {formError && <div style={styles.error}>{formError}</div>}

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="new-esp-nombre">Nombre *</label>
          <input
            id="new-esp-nombre"
            type="text"
            style={styles.input}
            placeholder="Ej: Odontologia"
            value={form.nombre}
            onChange={(e) => onChangeField('nombre', e.target.value)}
            required
          />
        </div>
        <div style={{ ...styles.field, flex: '2 1 260px' }}>
          <label style={styles.label} htmlFor="new-esp-desc">Descripcion</label>
          <input
            id="new-esp-desc"
            type="text"
            style={styles.input}
            placeholder="Breve descripcion (opcional)"
            value={form.descripcion}
            onChange={(e) => onChangeField('descripcion', e.target.value)}
          />
        </div>
      </div>

      <button type="submit" style={styles.submitBtn} disabled={saving}>
        {saving ? 'Creando...' : 'Crear Especialidad'}
      </button>
    </form>
  );
}

const styles = {
  error: {
    backgroundColor: 'var(--color-danger-bg)',
    border: '1px solid #fecaca',
    color: 'var(--color-danger)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  form: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    maxWidth: '640px',
  },
  formTitle: { margin: '0 0 1rem', color: 'var(--color-text)', fontSize: '1.05rem' },
  row: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  field: { marginBottom: '1.1rem', flex: '1 1 180px' },
  label: {
    display: 'block',
    marginBottom: '0.3rem',
    color: 'var(--color-text)',
    fontSize: '0.88rem',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  submitBtn: {
    padding: '0.65rem 1.5rem',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
