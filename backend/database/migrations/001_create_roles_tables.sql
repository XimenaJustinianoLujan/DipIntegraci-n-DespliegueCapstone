-- Migration 001: Create role tables (pacientes, medicos, administradores, secretarias)

-- Enum for doctor status
CREATE TYPE estado_medico AS ENUM ('ACTIVO', 'BAJA', 'VACACION');

-- Pacientes (Patients)
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  segundo_apellido VARCHAR(100),
  email VARCHAR(255) NOT NULL UNIQUE,
  email_verificado BOOLEAN DEFAULT FALSE,
  telefono VARCHAR(20),
  fecha_nacimiento DATE,
  password_hash VARCHAR(255) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Medicos (Doctors)
CREATE TABLE medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  segundo_apellido VARCHAR(100),
  email VARCHAR(255) NOT NULL UNIQUE,
  telefono VARCHAR(20),
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  estado estado_medico DEFAULT 'ACTIVO',
  especialidad_id UUID,
  activo BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Administradores (Admins)
CREATE TABLE administradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  telefono VARCHAR(20),
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Secretarias (Secretaries)
CREATE TABLE secretarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  telefono VARCHAR(20),
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pacientes_email ON pacientes(email);
CREATE INDEX idx_medicos_username ON medicos(username);
CREATE INDEX idx_medicos_especialidad ON medicos(especialidad_id);
CREATE INDEX idx_medicos_estado ON medicos(estado);
