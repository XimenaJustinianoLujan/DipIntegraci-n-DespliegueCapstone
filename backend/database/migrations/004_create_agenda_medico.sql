-- Migration 004: Create agenda_medico (doctor schedule) table

CREATE TABLE agenda_medico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL REFERENCES medicos(id),
  bloque_horario_id UUID NOT NULL REFERENCES bloques_horarios(id),
  fecha DATE NOT NULL,
  disponible BOOLEAN DEFAULT TRUE,
  confirmado BOOLEAN DEFAULT FALSE,
  creado_por UUID,
  creado_por_rol VARCHAR(20) DEFAULT 'medico',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_agenda_medico_bloque_fecha UNIQUE (medico_id, bloque_horario_id, fecha)
);

-- Indexes
CREATE INDEX idx_agenda_medico ON agenda_medico(medico_id);
CREATE INDEX idx_agenda_fecha ON agenda_medico(fecha);
CREATE INDEX idx_agenda_disponible ON agenda_medico(medico_id, fecha, disponible);
