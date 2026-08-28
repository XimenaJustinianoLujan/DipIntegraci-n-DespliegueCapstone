import { useState, useEffect } from 'react';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { EmptyClipboard } from '../../components/illustrations/EmptyState';

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
}

export default function MedicalRecord() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await api.get(`/fichas-clinicas/${user.id}`);
        setRecords(response.data || []);
      } catch (err) {
        console.error('Error fetching medical records:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [user.id]);

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
                  <strong style={styles.cardDate}>📅 Atencion del {record.fecha}</strong>
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
                      <h4 style={styles.sectionTitle}>📎 Documentos adjuntos</h4>
                      <ul style={styles.docList}>
                        {record.documentos.map((doc, idx) => (
                          <li key={idx}>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              {doc.nombre || `Documento ${idx + 1}`}
                            </a>
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
  docList: { margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.9rem' },
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
