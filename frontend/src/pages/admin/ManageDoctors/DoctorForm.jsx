export const emptyForm = {
  nombre: '',
  apellido: '',
  segundo_apellido: '',
  email: '',
  telefono: '',
  password: '',
  especialidad_id: '',
};

// Formulario de alta de medico. No hace fetch por su cuenta: recibe el
// estado del form y los handlers desde ManageDoctors/index.jsx, que es
// quien conoce las especialidades disponibles y que hacer con el resultado.
export default function DoctorForm({ form, especialidades, formError, saving, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="alert-in" style={styles.form}>
      <h3 style={styles.formTitle}>Datos del nuevo medico</h3>
      {formError && <div style={styles.error}>{formError}</div>}

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="new-medico-nombre">Nombre *</label>
          <input
            id="new-medico-nombre"
            name="nombre"
            type="text"
            style={styles.input}
            value={form.nombre}
            onChange={onChange}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="new-medico-apellido">Apellido *</label>
          <input
            id="new-medico-apellido"
            name="apellido"
            type="text"
            style={styles.input}
            value={form.apellido}
            onChange={onChange}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="new-medico-segundo">Segundo apellido</label>
          <input
            id="new-medico-segundo"
            name="segundo_apellido"
            type="text"
            style={styles.input}
            value={form.segundo_apellido}
            onChange={onChange}
          />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="new-medico-email">Email *</label>
          <input
            id="new-medico-email"
            name="email"
            type="email"
            style={styles.input}
            value={form.email}
            onChange={onChange}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="new-medico-telefono">Telefono</label>
          <input
            id="new-medico-telefono"
            name="telefono"
            type="tel"
            style={styles.input}
            placeholder="78912345"
            value={form.telefono}
            onChange={onChange}
          />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="new-medico-especialidad">Especialidad</label>
          <select
            id="new-medico-especialidad"
            name="especialidad_id"
            style={styles.input}
            value={form.especialidad_id}
            onChange={onChange}
          >
            <option value="">Sin especialidad</option>
            {especialidades.map((esp) => (
              <option key={esp.id} value={esp.id}>{esp.nombre}</option>
            ))}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="new-medico-password">Contrasena inicial *</label>
          <input
            id="new-medico-password"
            name="password"
            type="password"
            style={styles.input}
            placeholder="Minimo 8, con 1 mayuscula y 1 numero"
            value={form.password}
            onChange={onChange}
            required
          />
        </div>
      </div>

      <p style={styles.hint}>
        El nombre de usuario se genera automaticamente a partir del nombre
        y apellido (ej. Juan Perez → jperez). Se lo mostraremos apenas se
        cree la cuenta.
      </p>

      <button type="submit" style={styles.submitBtn} disabled={saving}>
        {saving ? 'Creando...' : 'Crear Medico'}
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
    maxWidth: '720px',
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
  hint: { fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0 0 1rem' },
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
