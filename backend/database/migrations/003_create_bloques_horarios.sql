-- Migration 003: Create bloques_horarios (time blocks) table

-- Days of week: 1=Monday, 2=Tuesday, ..., 6=Saturday, 7=Sunday
CREATE TABLE bloques_horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  es_emergencia BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_hora_fin_mayor CHECK (hora_fin > hora_inicio)
);

-- Monday to Friday: 8:00-19:00 (1-hour blocks)
INSERT INTO bloques_horarios (dia_semana, hora_inicio, hora_fin, es_emergencia)
SELECT
  dia,
  (hora || ':00')::TIME,
  ((hora + 1) || ':00')::TIME,
  FALSE
FROM
  generate_series(1, 5) AS dia,
  generate_series(8, 18) AS hora;

-- Saturday: 8:00-13:00 (1-hour blocks)
INSERT INTO bloques_horarios (dia_semana, hora_inicio, hora_fin, es_emergencia)
SELECT
  6,
  (hora || ':00')::TIME,
  ((hora + 1) || ':00')::TIME,
  FALSE
FROM
  generate_series(8, 12) AS hora;

-- Sunday: 24h emergency (1-hour blocks)
INSERT INTO bloques_horarios (dia_semana, hora_inicio, hora_fin, es_emergencia)
SELECT
  7,
  (hora || ':00')::TIME,
  ((hora + 1) || ':00')::TIME,
  TRUE
FROM
  generate_series(0, 23) AS hora;

-- Indexes
CREATE INDEX idx_bloques_dia ON bloques_horarios(dia_semana);
CREATE INDEX idx_bloques_horario ON bloques_horarios(dia_semana, hora_inicio);
