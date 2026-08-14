-- Migration 008: Create notificaciones table

CREATE TYPE tipo_notificacion AS ENUM ('CONFIRMACION_CITA', 'RECORDATORIO_24H', 'CANCELACION_ADMIN', 'CAMBIO_ESTADO');

CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id UUID NOT NULL,
  destinatario_rol VARCHAR(20) NOT NULL,
  tipo tipo_notificacion NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  email_destino VARCHAR(255),
  enviado BOOLEAN DEFAULT FALSE,
  enviado_at TIMESTAMP,
  error_envio TEXT,
  referencia_id UUID,
  referencia_tipo VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notificaciones_destinatario ON notificaciones(destinatario_id);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX idx_notificaciones_enviado ON notificaciones(enviado);
CREATE INDEX idx_notificaciones_fecha ON notificaciones(created_at);
