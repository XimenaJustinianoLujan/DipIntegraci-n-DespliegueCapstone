import { useState, useId } from 'react';

// Linea de una sola serie (tendencia en el tiempo -> un solo hue, el
// primario de la marca). Incluye tooltip al pasar el mouse/tocar cada punto,
// ejes recesivos y una etiqueta directa en el punto mas reciente.
const WIDTH = 560;
const HEIGHT = 160;
const PAD = { top: 16, right: 16, bottom: 26, left: 16 };

const dayLabel = (iso) =>
  new Date(iso).toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');

export default function WeeklyTrendChart({ data, title }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const gradientId = useId();

  if (!data || data.length === 0) return null;

  const values = data.map((d) => d.count);
  const max = Math.max(...values, 1);
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const points = data.map((d, i) => ({
    x: PAD.left + (innerW * i) / Math.max(data.length - 1, 1),
    y: PAD.top + innerH - (innerH * d.count) / max,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${PAD.top + innerH} L${points[0].x},${PAD.top + innerH} Z`;

  const active = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div style={styles.wrap}>
      {title && <h3 style={styles.title}>{title}</h3>}
      <div style={styles.svgWrap}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={styles.svg} role="img" aria-label={`${title}: ${data.map((d) => `${dayLabel(d.fecha)} ${d.count}`).join(', ')}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Linea base recesiva */}
          <line
            x1={PAD.left} y1={PAD.top + innerH} x2={WIDTH - PAD.right} y2={PAD.top + innerH}
            stroke="var(--color-border)" strokeWidth="1"
          />

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <g key={p.fecha}>
              {/* Area de interaccion mas grande que el punto visible */}
              <circle
                cx={p.x} cy={p.y} r="12" fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                onFocus={() => setHoverIdx(i)}
                onBlur={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                tabIndex={0}
                role="button"
                aria-label={`${dayLabel(p.fecha)}: ${p.count} citas`}
              >
                <title>{`${dayLabel(p.fecha)}: ${p.count} citas`}</title>
              </circle>
              <circle
                cx={p.x} cy={p.y}
                r={hoverIdx === i ? 5 : 3.5}
                fill="var(--color-surface)"
                stroke="var(--color-primary)"
                strokeWidth="2"
                style={styles.hoverDot}
              />
              <text x={p.x} y={HEIGHT - 8} textAnchor="middle" style={styles.axisLabel}>
                {dayLabel(p.fecha)}
              </text>
            </g>
          ))}
        </svg>

        {active && (
          <div
            style={{
              ...styles.tooltip,
              left: `${(active.x / WIDTH) * 100}%`,
              top: `${(active.y / HEIGHT) * 100}%`,
            }}
          >
            <strong>{active.count}</strong> {active.count === 1 ? 'cita' : 'citas'}
            <span style={styles.tooltipDate}> · {dayLabel(active.fecha)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  title: { margin: 0, fontSize: '0.95rem', color: 'var(--color-text)' },
  svgWrap: { position: 'relative', width: '100%' },
  svg: { width: '100%', height: 'auto', display: 'block', overflow: 'visible' },
  hoverDot: { transition: 'r 0.1s ease', pointerEvents: 'none' },
  axisLabel: {
    fontSize: '9px',
    fill: 'var(--color-text-subtle)',
    textTransform: 'capitalize',
  },
  tooltip: {
    position: 'absolute',
    transform: 'translate(-50%, -130%)',
    backgroundColor: 'var(--color-text)',
    color: 'var(--color-bg)',
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    boxShadow: 'var(--shadow-sm)',
  },
  tooltipDate: { fontWeight: 400, opacity: 0.85, textTransform: 'capitalize' },
};
