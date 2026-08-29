export default function SpecialtiesTable({
  specialties,
  editingId,
  editForm,
  togglingId,
  saving,
  onStartEdit,
  onCancelEdit,
  onChangeEditField,
  onSaveEdit,
  onToggleActive,
}) {
  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Nombre</th>
            <th style={styles.th}>Descripcion</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {specialties.length === 0 ? (
            <tr>
              <td colSpan="4" style={styles.empty}>No hay especialidades registradas.</td>
            </tr>
          ) : (
            specialties.map((esp) => {
              const isEditing = editingId === esp.id;
              return (
                <tr key={esp.id} style={!esp.activo ? styles.rowInactive : undefined}>
                  <td style={styles.td}>
                    {isEditing ? (
                      <input
                        style={styles.editInput}
                        value={editForm.nombre}
                        onChange={(e) => onChangeEditField('nombre', e.target.value)}
                      />
                    ) : (
                      <strong>{esp.nombre}</strong>
                    )}
                  </td>
                  <td style={styles.td}>
                    {isEditing ? (
                      <input
                        style={styles.editInput}
                        value={editForm.descripcion}
                        onChange={(e) => onChangeEditField('descripcion', e.target.value)}
                      />
                    ) : (
                      esp.descripcion || '—'
                    )}
                  </td>
                  <td style={styles.td}>
                    <span className={`badge${esp.activo ? ' badge-activa' : ''}`}>
                      {esp.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      {isEditing ? (
                        <>
                          <button style={styles.actionBtn} onClick={() => onSaveEdit(esp.id)} disabled={saving}>
                            Guardar
                          </button>
                          <button style={styles.actionBtnGhost} onClick={onCancelEdit}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button style={styles.actionBtn} onClick={() => onStartEdit(esp)}>Editar</button>
                          <button
                            style={esp.activo ? styles.actionBtnDanger : styles.actionBtn}
                            onClick={() => onToggleActive(esp)}
                            disabled={togglingId === esp.id}
                          >
                            {esp.activo ? 'Desactivar' : 'Reactivar'}
                          </button>
                        </>
                      )}
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
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.9rem',
    color: 'var(--color-text)',
  },
  rowInactive: { opacity: 0.6 },
  editInput: {
    width: '100%',
    padding: '0.4rem 0.6rem',
    border: '1px solid var(--color-primary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
    boxSizing: 'border-box',
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
  actionBtnGhost: {
    padding: '0.35rem 0.7rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
  },
  actionBtnDanger: {
    padding: '0.35rem 0.7rem',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-surface)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--color-danger)',
  },
};
