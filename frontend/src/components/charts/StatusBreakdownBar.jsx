// Barra apilada horizontal: muestra como se reparten las citas por estado
// (parte-del-todo). Colores fijos por estado (identidad), iguales a los
// badges usados en el resto de la app y sin cambiar entre temas, siguiendo
// la convencion de "status colors reservados" de la guia de dataviz.
const STATUS_ORDER = ['CONFIRMADA', 'COMPLETADA', 'RECONSULTA', 'NO_SHOW', 'CANCELADA'];

const STATUS_META = {
  CONFIRMADA: { label: 'Confirmadas', color: '#2563eb' },
  COMPLETADA: { label: 'Completadas', color: '#16a34a' },
  RECONSULTA: { label: 'Reconsulta', color: '#4f46e5' },
  NO_SHOW: { label: 'No show', color: '#d97706' },
  CANCELADA: { label: 'Canceladas', color: '#dc2626' },
};

export default function StatusBreakdownBar({ counts, title, emptyText }) {
  const total = STATUS_ORDER.reduce((sum, key) => sum + (counts[key] || 0), 0);

  if (total === 0) {
    return (
      <div style={styles.wrap}>
        {title && <h3 style={styles.title}>{title}</h3>}
        <p style={styles.empty}>{emptyText || 'Sin datos para mostrar.'}</p>
      </div>
    );
  }

  const segments = STATUS_ORDER
    .map((key) => ({ key, count: counts[key] || 0, ...STATUS_META[key] }))
    .filter((s) => s.count > 0);

  return (
    <div style={styles.wrap}>
      {title && <h3 style={styles.title}>{title}</h3>}

      <div style={styles.bar} role="img" aria-label={`Distribucion de citas: ${segments.map((s) => `${s.label} ${s.count}`).join(', ')}`}>
        {segments.map((s) => (
          <div
            key={s.key}
            style={{
              flex: `${s.count} 0 auto`,
              backgroundColor: s.color,
            }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>

      <ul style={styles.legend}>
        {segments.map((s) => (
          <li key={s.key} style={styles.legendItem}>
            <span style={{ ...styles.dot, backgroundColor: s.color }} aria-hidden="true" />
            <span style={styles.legendLabel}>{s.label}</span>
            <span style={styles.legendValue}>{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  title: { margin: 0, fontSize: '0.95rem', color: 'var(--color-text)' },
  empty: { margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' },
  bar: {
    display: 'flex',
    width: '100%',
    height: '14px',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    backgroundColor: 'var(--color-surface-2)',
    gap: '2px',
  },
  legend: {
    listStyle: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem 1.1rem',
    margin: 0,
    padding: 0,
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' },
  dot: { width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0 },
  legendLabel: { color: 'var(--color-text-muted)' },
  legendValue: { color: 'var(--color-text)', fontWeight: 700 },
};
