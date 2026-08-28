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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const loadData = async () => {
    setLoading(true);
    try {
      const bloquesResponse = await api.get('/agenda/bloques-horarios');
      const bloques = bloquesResponse.data || [];

      const map = {};
      bloques.forEach((b) => {
        const hora = b.hora_inicio.substring(0, 5);
        map[`${b.dia_semana}:${hora}`] = b.id;
      });
      setBloquesMap(map);

      const scheduleResponse = await api.get(`/agenda/${user.id}/semana/${weekStart}`);
      const entries = scheduleResponse.data || [];

      const scheduleState = {};
      entries.forEach((entry) => {
        const hora = entry.hora_inicio.substring(0, 5);
        if (entry.disponible) scheduleState[`${entry.dia_semana}:${hora}`] = true;
      });
      setSchedule(scheduleState);
    } catch (err) {
      setSchedule({});
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (diaSemana, hora) => {
    const key = `${diaSemana}:${hora}`;
    setSchedule((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const selectedCount = Object.keys(schedule).length;

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const bloques = [];
      DAY_NUMBERS.forEach((diaSemana) => {
        const hours = diaSemana === 6 ? SATURDAY_HOURS : WEEKDAY_HOURS;
        hours.forEach((hora) => {
          const bloqueId = bloquesMap[`${diaSemana}:${hora}`];
          if (bloqueId) {
            bloques.push({ bloque_horario_id: bloqueId, disponible: !!schedule[`${diaSemana}:${hora}`] });
          }
        });
      });

      await api.post('/agenda', { fecha_inicio: weekStart, bloques });
      setMessage('Agenda guardada exitosamente');
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.message || 'Error al guardar la agenda'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={styles.title}>Mi Agenda Semanal</h1>
      <p style={styles.subtitle}>
        Toque los bloques en los que estara disponible para atender pacientes.
        L-V 8:00-19:00 · Sab 8:00-13:00 · bloques de 1 hora.
      </p>

      <div style={styles.toolbar}>
        <div style={styles.weekSelector}>
          <label style={styles.label} htmlFor="schedule-week">Semana del</label>
          <input
            id="schedule-week"
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            style={styles.dateInput}
          />
        </div>
        <span style={styles.counter}>{selectedCount} bloque(s) seleccionados</span>
      </div>

      {message && (
        <div style={message.includes('Error') ? styles.error : styles.success}>{message}</div>
      )}

      {loading ? (
        <div style={styles.skeleton} />
      ) : (
        <>
          <div style={styles.gridContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Hora</th>
                  {DAYS.map((day) => <th key={day} style={styles.th}>{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {WEEKDAY_HOURS.map((hour) => (
                  <tr key={hour}>
                    <td style={styles.hourCell}>{hour}</td>
                    {DAY_NUMBERS.map((diaSemana) => {
                      const isSaturday = diaSemana === 6;
                      if (isSaturday && !SATURDAY_HOURS.includes(hour)) {
                        return <td key={diaSemana} style={styles.disabledCell}>·</td>;
                      }
                      const isSelected = !!schedule[`${diaSemana}:${hour}`];
                      return (
                        <td
                          key={diaSemana}
                          style={{ ...styles.cell, ...(isSelected ? styles.selectedCell : {}) }}
                          onClick={() => toggleSlot(diaSemana, hour)}
                          title={isSelected ? 'Disponible (clic para quitar)' : 'Clic para marcar disponible'}
                        >
                          {isSelected ? '✓' : ''}
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
              <span style={{ ...styles.legendBox, backgroundColor: 'var(--color-primary)' }} /> Disponible
            </span>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendBox, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }} /> No disponible
            </span>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendBox, backgroundColor: '#eef2f7' }} /> Fuera de horario
            </span>
          </div>

          <button onClick={handleSave} style={styles.saveBtn} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Agenda'}
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  title: { margin: '0 0 0.25rem', color: 'var(--color-text)', fontSize: '1.7rem' },
  subtitle: { margin: '0 0 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  weekSelector: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  label: { fontSize: '0.9rem', color: 'var(--color-text)', fontWeight: 600 },
  dateInput: {
    padding: '0.55rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
  },
  counter: {
    padding: '0.35rem 0.8rem',
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-dark)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  error: {
    backgroundColor: 'var(--color-danger-bg)',
    border: '1px solid #fecaca',
    color: 'var(--color-danger)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  success: {
    backgroundColor: 'var(--color-success-bg)',
    border: '1px solid #bbf7d0',
    color: 'var(--color-success)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  gridContainer: {
    overflowX: 'auto',
    marginBottom: '1.25rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  table: { borderCollapse: 'collapse', width: '100%', backgroundColor: 'var(--color-surface)' },
  th: {
    padding: '0.75rem',
    backgroundColor: 'var(--color-surface-2)',
    borderBottom: '1px solid var(--color-border)',
    textAlign: 'center',
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  hourCell: {
    padding: '0.5rem 0.75rem',
    fontWeight: 700,
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
    borderRight: '1px solid var(--color-border)',
    borderBottom: '1px solid var(--color-border)',
    textAlign: 'center',
    backgroundColor: 'var(--color-surface-2)',
  },
  cell: {
    padding: '0.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    transition: 'background-color 0.12s',
    minWidth: '64px',
    color: '#fff',
    fontWeight: 700,
  },
  selectedCell: { backgroundColor: 'var(--color-primary)' },
  disabledCell: {
    padding: '0.5rem',
    textAlign: 'center',
    backgroundColor: '#eef2f7',
    color: '#cbd5e1',
    border: '1px solid var(--color-border)',
  },
  legend: { display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' },
  legendBox: { width: '16px', height: '16px', borderRadius: '4px', display: 'inline-block' },
  saveBtn: {
    padding: '0.75rem 2rem',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.98rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  skeleton: {
    height: '360px',
    borderRadius: 'var(--radius)',
    background: 'linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-border) 50%, var(--color-surface-2) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.3s ease infinite',
  },
};
