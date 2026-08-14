-- Migration 002: Create especialidades (specialties) table

CREATE TABLE especialidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key to medicos table
ALTER TABLE medicos
  ADD CONSTRAINT fk_medicos_especialidad
  FOREIGN KEY (especialidad_id) REFERENCES especialidades(id);

-- Seed common specialties
INSERT INTO especialidades (nombre, descripcion) VALUES
  ('Medicina General', 'Consultas generales y chequeos preventivos'),
  ('Cardiologia', 'Enfermedades del corazon y sistema cardiovascular'),
  ('Dermatologia', 'Enfermedades de la piel'),
  ('Ginecologia', 'Salud reproductiva femenina'),
  ('Neurologia', 'Enfermedades del sistema nervioso'),
  ('Oftalmologia', 'Enfermedades de los ojos'),
  ('Ortopedia', 'Enfermedades del sistema musculoesqueletico'),
  ('Pediatria', 'Atencion medica infantil'),
  ('Psiquiatria', 'Trastornos mentales y emocionales'),
  ('Traumatologia', 'Lesiones y traumatismos');
