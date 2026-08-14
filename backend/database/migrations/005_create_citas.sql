-- Migration 005: Create citas (appointments) table

-- Enum for appointment states
CREATE TYPE estado_cita AS ENUM ('CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_SHOW', 'RECONSULTA');

CREATE TABLE citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  medico_id UUID NOT NULL REFERENCES medicos(id),
  especialidad_id UUID NOT NULL REFERENCES especialidades(id),
  agenda_id UUID NOT NULL REFERENCES agenda_medico(id),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado estado_cita DEFAULT 'CONFIRMADA',
  motivo_consulta TEXT,
  motivo_cancelacion TEXT,
  cancelado_por UUID,
  cancelado_por_rol VARCHAR(20),
  notas TEXT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Partial unique index: only one active (non-cancelled) appointment per time slot per doctor
CREATE UNIQUE INDEX idx_citas_unica_activa
  ON citas (medico_id, fecha, hora_inicio)
  WHERE estado != 'CANCELADA';

-- Indexes
CREATE INDEX idx_citas_paciente ON citas(paciente_id);
CREATE INDEX idx_citas_medico ON citas(medico_id);
CREATE INDEX idx_citas_fecha ON citas(fecha);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_citas_especialidad ON citas(especialidad_id);
CREATE INDEX idx_citas_paciente_estado ON citas(paciente_id, estado);
