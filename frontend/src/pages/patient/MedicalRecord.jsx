import { useState, useEffect } from 'react';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { EmptyClipboard } from '../../components/illustrations/EmptyState';

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}

// Formatea 'YYYY-MM-DD' (o un timestamp ISO como '2026-08-29T00:00:00.000Z',
// que es como llega si Postgres devuelve la columna como Date) a DD/MM/YYYY
// con manipulacion de string pura -sin pasar por Date/dayjs-, que
// interpretan un valor sin hora segun la zona horaria del navegador y
// pueden correr el dia (mismo tipo de bug ya visto en otros lados de la
// app con getDay() y comparaciones de fecha).
function formatFecha(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// El endpoint de descarga exige el token Bearer (como cualquier otro
// endpoint de la API), asi que un <a href> comun no sirve -el navegador
// no manda el header al navegar directo-. Se pide como blob autenticado
// via axios y se dispara la descarga con un link temporal en memoria.
async function downloadDocumento(fichaId, doc) {
  const response = await api.get(`/fichas-clinicas/${fichaId}/documentos/${doc.id}/download`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = doc.nombre_archivo || 'documento';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function MedicalRecord() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await api.get(`/fichas-clinicas/${user.id}`);
        const base = response.data || [];

        // GET /fichas-clinicas/:pacienteId no trae los documentos
        // adjuntos de cada atencion (viven en un endpoint aparte, por
        // ficha); se completan aca para poder mostrar los estudios que
        // el medico haya subido (analisis, radiografias, etc.).
        const withDocs = await Promise.all(
          base.map(async (record) => {
            try {
              const docsRes = await api.get(`/fichas-clinicas/${record.id}/documentos`);
              return { ...record, documentos: docsRes.data || [] };
            } catch (err) {
              return { ...record, documentos: [] };
            }
          })
        );
        setRecords(withDocs);
      } catch (err) {
        console.error('Error fetching medical records:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [user.id]);

  const handleDownload = async (fichaId, doc) => {
    setDownloadingId(doc.id);
    try {
      await downloadDocumento(fichaId, doc);
    } catch (err) {
      window.alert('No se pudo descargar el documento. Intente nuevamente.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Mi Ficha Clinica</h1>
      <p style={styles.subtitle}>Historial de atenciones, diagnosticos y recetas</p>

      <div style={styles.patientCard}>
        <span style={styles.avatar}>{initials(user?.nombre)}</span>
        <div>
          <strong style={styles.patientName}>{user?.nombre}</strong>
          <p style={styles.patientEmail}>{user?.email}</p>
        </div>
        <span style={styles.recordCount}>
          {records.length} {records.length === 1 ? 'atencion' : 'atenciones'}
        </span>
      </div>

      {loading ? (
        <div style={styles.skeletonWrap}>
          {[0, 1].map((i) => <div key={i} style={styles.skeleton} />)}
        </div>
      ) : records.length === 0 ? (
        <div style={styles.emptyCard}>
          <EmptyClipboard size={80} />
          <p style={styles.emptyText}>Aun no tiene atenciones registradas.</p>
          <p style={styles.emptyHint}>
            Su historial clinico aparecera aqui despues de su primera consulta.
          </p>
        </div>
      ) : (
        <div style={styles.timeline}>
          {records.map((record) => (
            <div key={record.id} style={styles.item}>
              <span style={styles.dot} aria-hidden="true" />
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <strong style={styles.cardDate}>📅 Atencion del {formatFecha(record.fecha)}</strong>
                  <span style={styles.doctor}>Dr. {record.medico_nombre}</span>
                </div>
                <div style={styles.cardBody}>
                  {record.diagnostico && (
                    <Section title="Diagnostico" icon="🩺" text={record.diagnostico} />
                  )}
                  {record.indicaciones && (
                    <Section title="Indicaciones" icon="📋" text={record.indicaciones} />
                  )}
                  {record.receta && (
                    <Section title="Receta" icon="💊" text={record.receta} />
                  )}
                  {record.documentos && record.documentos.length > 0 && (
                    <div style={styles.section}>
                      <h4 style={styles.sectionTitle}>📎 Estudios y documentos</h4>
                      <ul style={styles.docList}>
                        {record.documentos.map((doc) => (
                          <li key={doc.id} style={styles.docItem}>
                            <span style={styles.docName}>{doc.nombre_archivo}</span>
                            <button
                              type="button"
                              style={styles.docDownloadBtn}
                              onClick={() => handleDownload(record.id, doc)}
                              disabled={downloadingId === doc.id}
                            >
                              {downloadingId === doc.id ? 'Descargando...' : '⬇ Descargar'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, text }) {
  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>{icon} {title}</h4>
      <p style={styles.sectionText}>{text}</p>
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: 'var(--color-text)', fontSize: '1.7rem' },
  subtitle: { margin: '0 0 1.5rem', color: 'var(--color-text-muted)' },
  patientCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    padding: '1.25rem 1.5rem',
    marginBottom: '1.75rem',
  },
  avatar: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-light)',
    color: 'var(--color-primary-dark)',
    fontSize: '1rem',
    fontWeight: 800,
    flexShrink: 0,
  },
  patientName: { color: 'var(--color-text)', fontSize: '1.05rem' },
  patientEmail: { margin: '0.15rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' },
  recordCount: {
    marginLeft: 'auto',
    padding: '0.35rem 0.8rem',
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-dark)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  timeline: { display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '0.5rem' },
  item: { position: 'relative', paddingLeft: '1.5rem' },
  dot: {
    position: 'absolute',
    left: 0,
    top: '1.4rem',
    width: '11px',
    height: '11px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    border: '2px solid var(--color-surface)',
    boxShadow: '0 0 0 2px var(--color-primary-light)',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.9rem 1.35rem',
    backgroundColor: 'var(--color-surface-2)',
    borderBottom: '1px solid var(--color-border)',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  cardDate: { color: 'var(--color-text)', fontSize: '0.95rem' },
  doctor: { color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 600 },
  cardBody: { padding: '1.25rem 1.35rem' },
  section: { marginBottom: '1rem' },
  sectionTitle: { margin: '0 0 0.3rem', color: 'var(--color-primary-dark)', fontSize: '0.85rem' },
  sectionText: { margin: 0, color: 'var(--color-text)', fontSize: '0.92rem', lineHeight: 1.55 },
  docList: { margin: '0.4rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  docItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--color-surface-2)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.88rem',
  },
  docName: { color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  docDownloadBtn: {
    flexShrink: 0,
    padding: '0.3rem 0.7rem',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  skeletonWrap: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  skeleton: {
    height: '120px',
    borderRadius: 'var(--radius)',
    background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-border) 50%, var(--color-surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.3s ease infinite',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '2.75rem 1.5rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius)',
    textAlign: 'center',
  },
  emptyIcon: { fontSize: '2.5rem' },
  emptyText: { margin: 0, color: 'var(--color-text)', fontWeight: 600 },
  emptyHint: { margin: 0, color: 'var(--color-text-muted)', fontSize: '0.85rem' },
};
