# DBD v2 - Documento de Base de Datos

## Plataforma de Citas Medicas

**Version:** 2.0  
**Fecha:** Agosto 2024  
**Motor:** PostgreSQL 15+

---

## 1. Modelo Entidad-Relacion

### 1.1 Diagrama General

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  pacientes   │       │     medicos      │       │ administradores  │
│──────────────│       │──────────────────│       │──────────────────│
│ id (PK)      │       │ id (PK)          │       │ id (PK)          │
│ nombre       │       │ nombre           │       │ nombre           │
│ apellido     │       │ apellido         │       │ apellido         │
│ email (UQ)   │       │ segundo_apellido │       │ email (UQ)       │
│ password     │       │ username (UQ)    │       │ username (UQ)    │
│ telefono     │       │ password         │       │ password         │
│ dni (UQ)     │       │ especialidad     │       │ created_at       │
│ fecha_nac    │       │ estado           │       │ updated_at       │
│ email_verify │       │ created_at       │       └──────────────────┘
│ verify_token │       │ updated_at       │
│ created_at   │       │ deleted_at       │       ┌──────────────────┐
│ updated_at   │       └────────┬─────────┘       │   secretarias    │
│ deleted_at   │                │                  │──────────────────│
└──────┬───────┘                │                  │ id (PK)          │
       │                        │                  │ nombre           │
       │                        │                  │ apellido         │
       │    ┌───────────────────┴──────┐           │ email (UQ)       │
       │    │                          │           │ username (UQ)    │
       │    │       citas              │           │ password         │
       └────┤──────────────────────────├───────────│ created_at       │
            │ id (PK)                  │           │ updated_at       │
            │ paciente_id (FK)         │           └──────────────────┘
            │ medico_id (FK)           │
            │ fecha                    │
            │ bloque_horario_id (FK)   │
            │ especialidad             │
            │ motivo                   │
            │ estado                   │
            │ cancelado_por            │
            │ motivo_cancelacion       │
            │ created_at               │
            │ updated_at               │
            │ deleted_at               │
            └──────────┬───────────────┘
                       │
            ┌──────────┴───────────────┐
            │     ficha_clinica        │
            │──────────────────────────│
            │ id (PK)                  │
            │ cita_id (FK, UQ)         │
            │ paciente_id (FK)         │
            │ medico_id (FK)           │
            │ diagnostico              │
            │ indicaciones             │
            │ receta                   │
            │ created_at               │
            └──────────┬───────────────┘
                       │
            ┌──────────┴───────────────┐
            │  ficha_documentos        │
            │──────────────────────────│
            │ id (PK)                  │
            │ ficha_clinica_id (FK)    │
            │ tipo                     │
            │ nombre_archivo           │
            │ ruta_archivo             │
            │ mime_type                │
            │ tamano_bytes             │
            │ descripcion              │
            │ created_at               │
            └──────────────────────────┘
```

### 1.2 Tablas de Agenda

```
┌──────────────────────┐       ┌──────────────────────────┐
│   bloques_horarios   │       │      agenda_medico       │
│──────────────────────│       │──────────────────────────│
│ id (PK)              │       │ id (PK)                  │
│ dia_semana           │       │ medico_id (FK)           │
│ hora_inicio          │       │ bloque_horario_id (FK)   │
│ hora_fin             │       │ semana_inicio (DATE)     │
│ activo               │       │ fecha_especifica (DATE)  │
│ created_at           │       │ activo                   │
└──────────────────────┘       │ created_at               │
                               │ updated_at               │
                               └──────────────────────────┘

┌──────────────────────────────┐
│   turnos_domingo             │
│──────────────────────────────│
│ id (PK)                      │
│ medico_id (FK)               │
│ fecha (DATE)                 │
│ asignado_por (FK -> admin)   │
│ created_at                   │
└──────────────────────────────┘
```

### 1.3 Tabla de Auditoria

```
┌──────────────────────────────┐
│        audit_log             │
│──────────────────────────────│
│ id (PK)                      │
│ usuario_id                   │
│ usuario_rol                  │
│ accion                       │
│ entidad                      │
│ entidad_id                   │
│ datos_anteriores (JSONB)     │
│ datos_nuevos (JSONB)         │
│ motivo                       │
│ ip_address                   │
│ user_agent                   │
│ created_at                   │
└──────────────────────────────┘
```

---

## 2. Definicion de Tablas (DDL)

### 2.1 Tabla: pacientes

```sql
CREATE TABLE pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(15),
    dni VARCHAR(10) NOT NULL UNIQUE,
    fecha_nacimiento DATE,
    email_verificado BOOLEAN DEFAULT FALSE,
    token_verificacion VARCHAR(255),
    token_verificacion_expira TIMESTAMP,
    token_recuperacion VARCHAR(255),
    token_recuperacion_expira TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL,
    
    CONSTRAINT chk_email_formato CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$'),
    CONSTRAINT chk_telefono_formato CHECK (telefono ~ '^\d{8,15}$'),
    CONSTRAINT chk_nombre_no_vacio CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_apellido_no_vacio CHECK (LENGTH(TRIM(apellido)) > 0)
);

CREATE INDEX idx_pacientes_email ON pacientes(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_pacientes_dni ON pacientes(dni) WHERE deleted_at IS NULL;
```

### 2.2 Tabla: medicos

```sql
CREATE TABLE medicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    segundo_apellido VARCHAR(100),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    especialidad VARCHAR(100) NOT NULL,
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'baja', 'vacacion')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL,
    
    CONSTRAINT chk_medico_nombre_no_vacio CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT chk_medico_apellido_no_vacio CHECK (LENGTH(TRIM(apellido)) > 0)
);

CREATE INDEX idx_medicos_username ON medicos(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_medicos_especialidad ON medicos(especialidad) WHERE deleted_at IS NULL AND estado = 'activo';
```

### 2.3 Tabla: administradores

```sql
CREATE TABLE administradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.4 Tabla: secretarias

```sql
CREATE TABLE secretarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.5 Tabla: bloques_horarios

```sql
CREATE TABLE bloques_horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_hora_valida CHECK (hora_fin > hora_inicio),
    CONSTRAINT chk_bloque_una_hora CHECK (hora_fin - hora_inicio = INTERVAL '1 hour'),
    CONSTRAINT uq_bloque_dia_hora UNIQUE (dia_semana, hora_inicio, hora_fin)
);

-- Poblado inicial: L-V (1-5) de 8:00 a 19:00, Sabado (6) de 8:00 a 13:00
-- dia_semana: 1=Lunes, 2=Martes, ..., 5=Viernes, 6=Sabado, 7=Domingo
```

### 2.6 Tabla: agenda_medico

```sql
CREATE TABLE agenda_medico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medico_id UUID NOT NULL REFERENCES medicos(id),
    bloque_horario_id UUID NOT NULL REFERENCES bloques_horarios(id),
    semana_inicio DATE NOT NULL,
    fecha_especifica DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT uq_agenda_medico_bloque_fecha UNIQUE (medico_id, bloque_horario_id, fecha_especifica)
);

CREATE INDEX idx_agenda_medico_semana ON agenda_medico(medico_id, semana_inicio);
CREATE INDEX idx_agenda_medico_fecha ON agenda_medico(medico_id, fecha_especifica) WHERE activo = TRUE;
```

### 2.7 Tabla: citas

```sql
CREATE TABLE citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    medico_id UUID NOT NULL REFERENCES medicos(id),
    fecha DATE NOT NULL,
    bloque_horario_id UUID NOT NULL REFERENCES bloques_horarios(id),
    especialidad VARCHAR(100) NOT NULL,
    motivo TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADA' 
        CHECK (estado IN ('CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_SHOW', 'RECONSULTA')),
    cancelado_por UUID,
    motivo_cancelacion TEXT,
    reconsulta_de UUID REFERENCES citas(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL,
    
    CONSTRAINT chk_fecha_futura CHECK (fecha >= CURRENT_DATE)
);

-- Indice parcial unico: solo una cita activa por bloque horario por fecha
-- (excluye CANCELADA y NO_SHOW)
CREATE UNIQUE INDEX idx_cita_unica_bloque_activa 
    ON citas(fecha, bloque_horario_id) 
    WHERE estado NOT IN ('CANCELADA', 'NO_SHOW');

-- Indice para consultas frecuentes
CREATE INDEX idx_citas_paciente ON citas(paciente_id, estado) WHERE deleted_at IS NULL;
CREATE INDEX idx_citas_medico_fecha ON citas(medico_id, fecha) WHERE deleted_at IS NULL;
CREATE INDEX idx_citas_fecha_estado ON citas(fecha, estado) WHERE deleted_at IS NULL;

-- Indice parcial: maximo 3 citas activas por paciente
-- (Se implementa via CHECK en la logica de negocio, no como constraint de DB)
```

### 2.8 Tabla: ficha_clinica

```sql
CREATE TABLE ficha_clinica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cita_id UUID NOT NULL UNIQUE REFERENCES citas(id),
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    medico_id UUID NOT NULL REFERENCES medicos(id),
    diagnostico TEXT NOT NULL,
    indicaciones TEXT,
    receta TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_diagnostico_no_vacio CHECK (LENGTH(TRIM(diagnostico)) > 0)
);

CREATE INDEX idx_ficha_paciente ON ficha_clinica(paciente_id);
CREATE INDEX idx_ficha_medico ON ficha_clinica(medico_id);
```

### 2.9 Tabla: ficha_documentos

```sql
CREATE TABLE ficha_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ficha_clinica_id UUID NOT NULL REFERENCES ficha_clinica(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('analisis', 'radiografia', 'receta', 'otro')),
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tamano_bytes INTEGER NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documentos_ficha ON ficha_documentos(ficha_clinica_id);
```

### 2.10 Tabla: turnos_domingo

```sql
CREATE TABLE turnos_domingo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medico_id UUID NOT NULL REFERENCES medicos(id),
    fecha DATE NOT NULL,
    asignado_por UUID NOT NULL REFERENCES administradores(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_es_domingo CHECK (EXTRACT(DOW FROM fecha) = 0),
    CONSTRAINT uq_turno_medico_fecha UNIQUE (medico_id, fecha)
);

CREATE INDEX idx_turnos_domingo_fecha ON turnos_domingo(fecha);
```

### 2.11 Tabla: notificaciones

```sql
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    usuario_rol VARCHAR(20) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
        'confirmacion_cita', 
        'recordatorio_24h', 
        'cancelacion_admin',
        'verificacion_email',
        'recuperacion_password'
    )),
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    email_enviado BOOLEAN DEFAULT FALSE,
    leida BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id, usuario_rol, leida);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo, email_enviado);
```

### 2.12 Tabla: audit_log

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID,
    usuario_rol VARCHAR(20),
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    entidad_id UUID,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    motivo TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_entidad ON audit_log(entidad, entidad_id);
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id, created_at);
CREATE INDEX idx_audit_fecha ON audit_log(created_at);
CREATE INDEX idx_audit_accion ON audit_log(accion);
```

---

## 3. Datos Iniciales (Seed)

### 3.1 Bloques Horarios

```sql
-- Generar bloques para Lunes a Viernes (8:00 - 19:00)
INSERT INTO bloques_horarios (dia_semana, hora_inicio, hora_fin)
SELECT 
    dia,
    (hora || ':00')::TIME,
    ((hora + 1) || ':00')::TIME
FROM 
    generate_series(1, 5) AS dia,
    generate_series(8, 18) AS hora;

-- Generar bloques para Sabado (8:00 - 13:00)
INSERT INTO bloques_horarios (dia_semana, hora_inicio, hora_fin)
SELECT 
    6,
    (hora || ':00')::TIME,
    ((hora + 1) || ':00')::TIME
FROM 
    generate_series(8, 12) AS hora;
```

### 3.2 Administrador Inicial

```sql
-- Password: Admin123! (bcrypt hash)
INSERT INTO administradores (nombre, apellido, email, username, password_hash)
VALUES (
    'Administrador',
    'Principal',
    'admin@clinica.com',
    'admin',
    '$2b$12$placeholder_hash_here'
);
```

---

## 4. Restricciones y Reglas de Integridad

### 4.1 Restricciones de Unicidad

| Tabla           | Restriccion                                           | Tipo              |
|-----------------|-------------------------------------------------------|-------------------|
| pacientes       | email unico                                           | UNIQUE            |
| pacientes       | dni unico                                             | UNIQUE            |
| medicos         | username unico                                        | UNIQUE            |
| citas           | una cita activa por bloque/fecha (excl. CANCELADA)    | UNIQUE PARTIAL    |
| agenda_medico   | un medico no puede tener duplicados en mismo bloque   | UNIQUE            |
| ficha_clinica   | una ficha por cita                                    | UNIQUE (cita_id)  |
| turnos_domingo  | un medico un turno por fecha                          | UNIQUE            |

### 4.2 Soft Delete

Las siguientes tablas implementan soft delete con columna `deleted_at`:
- `pacientes`
- `medicos`
- `citas`

Todas las consultas deben filtrar `WHERE deleted_at IS NULL` para excluir registros eliminados logicamente.

### 4.3 Reglas de Negocio Implementadas en Aplicacion

| Regla                                                    | Implementacion           |
|----------------------------------------------------------|--------------------------|
| Maximo 3 citas activas por paciente                      | Validacion en servicio   |
| No repetir especialidad en citas activas                 | Validacion en servicio   |
| 24h minimo para agendar (excepto espacio libre)          | Validacion en servicio   |
| Cancelacion 2h antes minimo                              | Validacion en servicio   |
| Username medico (regla de generacion)                    | Logica en registro       |
| Agenda 1 semana de anticipacion                          | Validacion en servicio   |
| COMPLETADA solo al guardar ficha clinica                 | Trigger en servicio      |

---

## 5. Relaciones entre Tablas

### 5.1 Relaciones Principales

```
pacientes (1) -----> (N) citas
medicos (1) -------> (N) citas
medicos (1) -------> (N) agenda_medico
bloques_horarios (1) -> (N) agenda_medico
bloques_horarios (1) -> (N) citas
citas (1) ---------> (1) ficha_clinica
ficha_clinica (1) --> (N) ficha_documentos
medicos (1) -------> (N) turnos_domingo
administradores (1)-> (N) turnos_domingo (asignado_por)
pacientes (1) -----> (N) ficha_clinica
medicos (1) -------> (N) ficha_clinica
citas (1) ---------> (N) citas (reconsulta_de - autoreferencia)
```

### 5.2 Diagrama de Estados de Cita

```
                    ┌─────────────┐
                    │ CONFIRMADA  │ (estado inicial al crear)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
              v            v                v
     ┌────────────┐  ┌──────────┐   ┌──────────┐
     │ COMPLETADA │  │ CANCELADA│   │  NO_SHOW │
     └────────────┘  └──────────┘   └─────┬────┘
                                           │
                                           v
                                    ┌─────────────┐
                                    │ RECONSULTA  │
                                    └─────────────┘
```

**Transiciones permitidas:**
- CONFIRMADA -> COMPLETADA (medico guarda ficha clinica)
- CONFIRMADA -> CANCELADA (paciente o admin)
- CONFIRMADA -> NO_SHOW (medico o secretaria)
- NO_SHOW -> RECONSULTA (secretaria reagenda)

---

## 6. Consideraciones de Performance

### 6.1 Indices Criticos

- `idx_cita_unica_bloque_activa`: Indice parcial unico para evitar doble reserva
- `idx_citas_paciente`: Consulta rapida de citas por paciente
- `idx_citas_medico_fecha`: Consulta de agenda diaria del medico
- `idx_agenda_medico_fecha`: Disponibilidad del medico

### 6.2 Particionamiento (Futuro)

- `audit_log`: Particionar por mes (created_at) cuando supere 1M registros
- `citas`: Particionar por ano si es necesario
- `notificaciones`: Particionar por mes

### 6.3 Mantenimiento

- Vacuum automatico configurado para tablas con alta actividad
- Archivado de audit_log > 1 ano
- Limpieza de tokens expirados (cron job diario)
