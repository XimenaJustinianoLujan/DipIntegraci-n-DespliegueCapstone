// Ilustraciones lineales propias para estados vacios. Trazo simple en el
// color de marca (currentColor), livianas (SVG inline, sin assets externos)
// y coherentes con el resto del sistema de diseno.

function Base({ children, size = 96 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: 'var(--color-primary)' }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function EmptyCalendar(props) {
  return (
    <Base {...props}>
      <rect x="14" y="20" width="68" height="58" rx="8" stroke="currentColor" strokeWidth="3" opacity="0.35" />
      <rect x="14" y="20" width="68" height="16" rx="8" fill="currentColor" opacity="0.14" />
      <line x1="30" y1="12" x2="30" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <line x1="66" y1="12" x2="66" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <circle cx="34" cy="52" r="4" fill="currentColor" opacity="0.3" />
      <circle cx="48" cy="52" r="4" fill="currentColor" opacity="0.55" />
      <circle cx="62" cy="52" r="4" fill="currentColor" opacity="0.3" />
      <circle cx="34" cy="65" r="4" fill="currentColor" opacity="0.3" />
      <circle cx="48" cy="65" r="4" fill="currentColor" opacity="0.3" />
    </Base>
  );
}

export function EmptyFolder(props) {
  return (
    <Base {...props}>
      <path
        d="M16 32c0-3.3 2.7-6 6-6h14l6 8h22c3.3 0 6 2.7 6 6v28c0 3.3-2.7 6-6 6H22c-3.3 0-6-2.7-6-6V32Z"
        stroke="currentColor" strokeWidth="3" strokeLinejoin="round" opacity="0.4"
      />
      <path d="M16 40h64" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <circle cx="48" cy="56" r="10" fill="currentColor" opacity="0.12" />
      <path d="M44 56.5l3 3 6-6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </Base>
  );
}

export function EmptyClipboard(props) {
  return (
    <Base {...props}>
      <rect x="24" y="16" width="48" height="66" rx="6" stroke="currentColor" strokeWidth="3" opacity="0.35" />
      <rect x="38" y="10" width="20" height="12" rx="4" fill="currentColor" opacity="0.4" />
      <line x1="34" y1="38" x2="62" y2="38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      <line x1="34" y1="50" x2="62" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      <line x1="34" y1="62" x2="52" y2="62" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
    </Base>
  );
}

export function EmptyPeople(props) {
  return (
    <Base {...props}>
      <circle cx="36" cy="34" r="12" stroke="currentColor" strokeWidth="3" opacity="0.4" />
      <path d="M16 76c0-12 9-20 20-20s20 8 20 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <circle cx="68" cy="30" r="8" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M56 58c2-6 7-10 12-10s10 4 12 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
    </Base>
  );
}

export function SuccessBurst({ size = 88 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="48" cy="48" r="34" fill="var(--color-success)" opacity="0.14" className="success-burst-ring" />
      <circle cx="48" cy="48" r="24" fill="var(--color-success)" />
      <path
        d="M37 49l7 7 15-16"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="success-burst-check"
        pathLength="1"
      />
    </svg>
  );
}
