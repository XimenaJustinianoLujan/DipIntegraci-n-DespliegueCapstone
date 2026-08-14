import { useState, useEffect } from 'react';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';

export default function MedicalRecord() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

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

  if (loading) return <p>Cargando ficha clinica...</p>;

  return (
    <div>
      <h1 style={styles.title}>Mi Ficha Clinica</h1>
      <p style={styles.subtitle}>Historial de atenciones y diagnosticos</p>

      <div style={styles.patientInfo}>
        <h3 style={styles.infoTitle}>Datos del paciente</h3>
        <p><strong>Nombre:</strong> {user?.nombre}</p>
        <p><strong>Email:</strong> {user?.email}</p>
      </div>

      {records.length === 0 ? (
        <p style={styles.empty}>No tiene fichas clinicas registradas.</p>
      ) : (
        <div style={styles.list}>
          {records.map((record) => (
            <div key={record.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>Atencion del {record.fecha}</strong>
                <span style={styles.doctor}>Dr. {record.medico_nombre}</span>
              </div>
              <div style={styles.cardBody}>
                {record.diagnostico && (
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Diagnostico</h4>
                    <p>{record.diagnostico}</p>
                  </div>
                )}
                {record.indicaciones && (
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Indicaciones</h4>
                    <p>{record.indicaciones}</p>
                  </div>
                )}
                {record.receta && (
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Receta</h4>
                    <p>{record.receta}</p>
                  </div>
                )}
                {record.documentos && record.documentos.length > 0 && (
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Documentos adjuntos</h4>
                    <ul>
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
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: '#1e293b' },
  subtitle: { margin: '0 0 1.5rem', color: '#64748b' },
  patientInfo: {
    backgroundColor: 'white',
    padding: '1.25rem 1.5rem',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    marginBottom: '1.5rem',
  },
  infoTitle: { margin: '0 0 0.75rem', color: '#1e293b' },
  empty: { color: '#64748b' },
  list: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  card: {
    backgroundColor: 'white',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  doctor: { color: '#64748b', fontSize: '0.85rem' },
  cardBody: { padding: '1rem 1.5rem' },
  section: { marginBottom: '1rem' },
  sectionTitle: { margin: '0 0 0.3rem', color: '#374151', fontSize: '0.9rem' },
};
