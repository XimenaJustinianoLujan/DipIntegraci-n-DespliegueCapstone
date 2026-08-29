import { statusMeta, statusOptions } from './doctorStatus';

export default function DoctorsTable({ doctors, updatingId, onChangeStatus }) {
  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Medico</th>
            <th style={styles.th}>Especialidad</th>
            <th style={styles.th}>Estado actual</th>
            <th style={styles.th}>Cambiar a</th>
          </tr>
        </thead>
        <tbody>
          {doctors.length === 0 ? (
            <tr>
              <td colSpan="4" style={styles.empty}>No hay medicos registrados.</td>
            </tr>
          ) : (
            doctors.map((doc) => {
              const meta = statusMeta[doc.estado] || { label: doc.estado || 'Activo', badgeClass: '' };
              return (
                <tr key={doc.id}>
                  <td style={styles.td}>
                    <div style={styles.docCell}>
                      <span style={styles.docAvatar}>
                        {(doc.nombre?.[0] || '') + (doc.apellido?.[0] || '')}
                      </span>
                      <strong>Dr. {doc.nombre} {doc.apellido}</strong>
                    </div>
                  </td>
                  <td style={styles.td}>{doc.especialidad || '—'}</td>
                  <td style={styles.td}>
                    <span className={`badge ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      {statusOptions
                        .filter((s) => s !== doc.estado)
                        .map((status) => (
                          <button
                            key={status}
                            style={styles.actionBtn}
                            onClick={() => onChangeStatus(doc.id, status)}
                            disabled={updatingId === doc.id}
                          >
                            {statusMeta[status].label}
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  tableContainer: {
    overflowX: 'auto',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--color-surface)' },
  th: {
    padding: '0.85rem 1rem',
    backgroundColor: 'var(--color-surface-2)',
    borderBottom: '1px solid var(--color-border)',
    textAlign: 'left',
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
  },
  td: {
    padding: '0.85rem 1rem',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.9rem',
    color: 'var(--color-text)',
  },
  docCell: { display: 'flex', alignItems: 'center', gap: '0.65rem' },
  docAvatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary-dark)',
    fontSize: '0.75rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  empty: { textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' },
  actions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  actionBtn: {
    padding: '0.35rem 0.7rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-surface)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
};
