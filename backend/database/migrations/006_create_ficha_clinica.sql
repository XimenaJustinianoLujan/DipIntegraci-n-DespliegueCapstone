-- Migration 006: Create ficha_clinica and documentos_adjuntos tables

CREATE TABLE ficha_clinica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  cita_id UUID NOT NULL REFERENCES citas(id),
  medico_id UUID NOT NULL REFERENCES medicos(id),
  diagnostico TEXT NOT NULL,
  indicaciones TEXT,
  receta TEXT,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documentos_adjuntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_clinica_id UUID NOT NULL REFERENCES ficha_clinica(id),
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo_archivo VARCHAR(100) NOT NULL,
  ruta_archivo VARCHAR(500) NOT NULL,
  tamano_bytes INTEGER,
  descripcion TEXT,
  subido_por UUID NOT NULL REFERENCES medicos(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ficha_paciente ON ficha_clinica(paciente_id);
CREATE INDEX idx_ficha_cita ON ficha_clinica(cita_id);
CREATE INDEX idx_ficha_medico ON ficha_clinica(medico_id);
CREATE INDEX idx_documentos_ficha ON documentos_adjuntos(ficha_clinica_id);
