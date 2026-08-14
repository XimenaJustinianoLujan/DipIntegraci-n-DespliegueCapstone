import { useState, useEffect } from 'react';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6]; // dia_semana: 1=Monday...6=Saturday

// L-V: 8:00-19:00 (11 blocks), Sab: 8:00-13:00 (5 blocks)
const WEEKDAY_HOURS = Array.from({ length: 11 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`);
const SATURDAY_HOURS = Array.from({ length: 5 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`);

function getNextMonday() {
  const today = dayjs();
  const daysUntilMonday = (8 - today.day()) % 7 || 7;
  return today.add(daysUntilMonday + 7, 'day').format('YYYY-MM-DD');
}

export default function Schedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState({});
  const [bloquesMap, setBloquesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [weekStart, setWeekStart] = useState(getNextMonday());

  useEffect(() => {
    loadData();
  }, [weekStart]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch block definitions (maps day+time to UUID)
      const bloquesResponse = await api.get('/agenda/bloques-horarios');
      const bloques = bloquesResponse.data || [];

      // Build a map: { "dia_semana:hora_inicio" -> bloque_horario_id }
      const map = {};
      bloques.forEach((b) => {
        const hora = b.hora_inicio.substring(0, 5); // "08:00:00" -> "08:00"
        const key = `${b.dia_semana}:${hora}`;
        map[key] = b.id;
      });
      setBloquesMap(map);

      // Fetch current schedule for this week
      const scheduleResponse = await api.get(`/agenda/${user.id}/semana/${weekStart}`);
      const entries = scheduleResponse.data || [];

      // Build schedule state: { "dia_semana:hora" -> boolean (disponible) }
      const scheduleState = {};
      entries.forEach((entry) => {
        const hora = entry.hora_inicio.substring(0, 5);
        const key = `${entry.dia_semana}:${hora}`;
        if (entry.disponible) {
          scheduleState[key] = true;
        }
      });
      setSchedule(scheduleState);
    } catch (err) {
      // Initialize empty schedule on error
      setSchedule({});
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (diaSemana, hora) => {
    const key = `${diaSemana}:${hora}`;
    setSchedule((prev) => {
      const newSchedule = { ...prev };
      if (newSchedule[key]) {
        delete newSchedule[key];
      } else {
        newSchedule[key] = true;
      }
      return newSchedule;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      // Build bloques array from selected slots
      const bloques = [];
      DAY_NUMBERS.forEach((diaSemana) => {
        const hours = diaSemana === 6 ? SATURDAY_HOURS : WEEKDAY_HOURS;
        hours.forEach((hora) => {
          const key = `${diaSemana}:${hora}`;
          const bloqueId = bloquesMap[key];
          if (bloqueId) {
            bloques.push({
              bloque_horario_id: bloqueId,
              disponible: !!schedule[key],
            });
          }
        });
      });

      await api.post('/agenda', {
        fecha_inicio: weekStart,
        bloques,
      });
      setMessage('Agenda guardada exitosamente');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error al guardar la agenda';
      setMessage(`Error: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Cargando agenda...</p>;

  return (
    <div>
      <h1 style={styles.title}>Mi Agenda Semanal</h1>
      <p style={styles.subtitle}>
        Seleccione los bloques horarios en los que esta disponible para atender pacientes.
        L-V: 8:00-19:00 | Sab: 8:00-13:00 | Bloques de 1 hora
      </p>

      <div style={styles.weekSelector}>
        <label style={styles.label}>Semana del:</label>
        <input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          style={styles.dateInput}
        />
      </div>

      {message && (
        <div style={message.includes('Error') ? styles.error : styles.success}>{message}</div>
      )}

      <div style={styles.gridContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Hora</th>
              {DAYS.map((day) => (
                <th key={day} style={styles.th}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAY_HOURS.map((hour) => (
              <tr key={hour}>
                <td style={styles.hourCell}>{hour}</td>
                {DAY_NUMBERS.map((diaSemana, dayIdx) => {
                  const isSaturday = diaSemana === 6;
                  const isOutOfRange = isSaturday && !SATURDAY_HOURS.includes(hour);

                  if (isOutOfRange) {
                    return <td key={diaSemana} style={styles.disabledCell}>-</td>;
                  }

                  const key = `${diaSemana}:${hour}`;
                  const isSelected = !!schedule[key];
                  return (
                    <td
                      key={diaSemana}
                      style={{
                        ...styles.cell,
                        ...(isSelected ? styles.selectedCell : styles.availableCell),
                      }}
                      onClick={() => toggleSlot(diaSemana, hour)}
                    >
                      {isSelected ? '\u2713' : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendBox, backgroundColor: '#2563eb' }}></span>
          Disponible
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendBox, backgroundColor: 'white', border: '1px solid #d1d5db' }}></span>
          No disponible
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendBox, backgroundColor: '#e2e8f0' }}></span>
          Fuera de horario
        </span>
      </div>

      <button onClick={handleSave} style={styles.saveBtn} disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar Agenda'}
      </button>
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: '#1e293b' },
  subtitle: { margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.9rem' },
  weekSelector: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' },
  label: { fontSize: '0.9rem', color: '#374151', fontWeight: '500' },
  dateInput: {
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  success: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  gridContainer: { overflowX: 'auto', marginBottom: '1.5rem' },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  th: {
    padding: '0.75rem',
    backgroundColor: '#f1f5f9',
    borderBottom: '2px solid #e2e8f0',
    textAlign: 'center',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#374151',
  },
  hourCell: {
    padding: '0.5rem 0.75rem',
    fontWeight: '500',
    fontSize: '0.8rem',
    color: '#475569',
    borderRight: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  cell: {
    padding: '0.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    border: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
    minWidth: '60px',
  },
  selectedCell: {
    backgroundColor: '#2563eb',
    color: 'white',
    fontWeight: '600',
  },
  availableCell: {
    backgroundColor: 'white',
  },
  disabledCell: {
    padding: '0.5rem',
    textAlign: 'center',
    backgroundColor: '#e2e8f0',
    color: '#94a3b8',
    border: '1px solid #e2e8f0',
  },
  legend: { display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#475569' },
  legendBox: { width: '16px', height: '16px', borderRadius: '3px', display: 'inline-block' },
  saveBtn: {
    padding: '0.75rem 2rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
};
