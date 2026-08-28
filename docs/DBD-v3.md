# DBD v3 - Documento de Base de Datos (fiel al codigo)

## Plataforma de Citas Medicas (JOX)

**Version:** 3.0
**Fecha:** Agosto 2026
**Motor:** PostgreSQL 14+ (desplegado en Railway)
**Fuente:** `backend/database/migrations/001` a `008` (las 8 migraciones reales, en orden)

---

## Nota de version: por que existe un v3

El **DBD v2** (Agosto 2024) fue escrito como documento de diseno **antes** de terminar
la implementacion. Al construir el sistema, varias decisiones cambiaron sobre la
marcha y el documento nunca se actualizo. Este v3 reemplaza al v2 documentando **el
esquema tal como existe hoy en las migraciones reales**, no como se planeo.

### Cambios respecto al v2 (lo que el v2 documentaba mal o de mas)

| # | v2 decia | Realidad en el codigo |
|---|----------|------------------------|
| 1 | `pacientes.dni` (UNIQUE, obligatorio) | **No existe.** No hay campo de documento de identidad en `pacientes`. |
| 2 | `medicos.estado` es `VARCHAR(20)` con `CHECK` en minusculas (`'activo'`, `'baja'`, `'vacacion'`) | Es un **enum nativo** `estado_medico` en **MAYUSCULAS**: `ACTIVO`, `BAJA`, `VACACION`. |
| 3 | `medicos.especialidad` es `VARCHAR(100)` libre | Es `especialidad_id UUID` con **FK** a una tabla `especialidades` normalizada. |
| 4 | Tabla propia `turnos_domingo` (medico_id, fecha, asignado_por) | **No existe como tabla.** Los turnos de domingo se modelan como filas de `agenda_medico` con `creado_por_rol = 'administrador'` sobre los bloques de emergencia del domingo. |
| 5 | Tabla `ficha_documentos` | El nombre real es **`documentos_adjuntos`**, con columnas distintas (incluye `subido_por` con FK a `medicos`). |
| 6 | `ficha_clinica.cita_id` es `UNIQUE` (fuerza 1:1 con `citas`) | **No hay UNIQUE** sobre `cita_id` en el codigo real; nada impide mas de una ficha por cita a nivel de base de datos. |
| 7 | `citas.reconsulta_de` (auto-referencia a la cita original) | **No existe esa columna.** RECONSULTA es solo un valor del enum `estado_cita`; no hay vinculo formal a una cita "siguiente". |
| 8 | Indice unico parcial sobre `(fecha, bloque_horario_id)` | Es sobre **`(medico_id, fecha, hora_inicio)`** — el bloqueo es por medico+horario, no solo por bloque. |
| 9 | `notificaciones.usuario_id` / `usuario_rol`, con `leida` y `metadata` | Columnas reales: **`destinatario_id`/`destinatario_rol`**, mas `enviado`/`enviado_at`/`error_envio`/`referencia_id`/`referencia_tipo`. No hay columna `leida` ni `metadata`. |
| 10 | `bloques_horarios` tiene `CHECK` de exactamente 1 hora y `UNIQUE(dia_semana, hora_inicio, hora_fin)` | Esos dos constraints **no existen** en la migracion real (aunque en la practica todos los bloques semilla si duran 1 hora). |
| 11 | CHECKs de formato (email, telefono, nombre no vacio) a nivel de tabla | **No existen a nivel de base de datos** — esas validaciones se hacen en el backend (`express-validator`), no en el esquema SQL. |
| 12 | Seed de un administrador inicial via SQL | El admin (y el resto de usuarios demo) se crean con un **script Node** (`backend/scripts/seed.js`), no en una migracion SQL. |

El resto de la estructura conceptual (pacientes/medicos/citas/ficha clinica/agenda,
el diagrama de estados de `citas`) se mantuvo correcta en el v2 y se conserva aqui.

---

## 1. Enums

| Enum | Valores exactos | Migracion |
|------|------------------|-----------|
| `estado_medico` | `ACTIVO`, `BAJA`, `VACACION` | 001 |
| `estado_cita` | `CONFIRMADA`, `COMPLETADA`, `CANCELADA`, `NO_SHOW`, `RECONSULTA` | 005 |
| `tipo_notificacion` | `CONFIRMACION_CITA`, `RECORDATORIO_24H`, `CANCELACION_ADMIN`, `CAMBIO_ESTADO` | 008 |

---

## 2. Modelo Entidad-Relacion (texto)

**Identidades independientes** (sin tabla `usuarios` central; cada una con su propio
`password_hash`, autenticacion multi-tabla por rol):

- `pacientes`
- `medicos` — N:1 con `especialidades` (`especialidad_id`, nullable)
- `administradores`
- `secretarias`

**Catalogos:**

- `especialidades` — 1:N con `medicos`, 1:N con `citas`
- `bloques_horarios` — plantilla semanal reutilizable (no fechada); 1:N con `agenda_medico`

**Agenda y citas:**

- `agenda_medico` — instancia de disponibilidad: liga `medico` + `bloque_horario` + `fecha` concreta. UNIQUE `(medico_id, bloque_horario_id, fecha)`.
- `citas` — N:1 con `pacientes`, `medicos`, `especialidades`, `agenda_medico`. Regla central: indice unico parcial que impide dos citas activas del mismo medico en el mismo horario (ver §5).

**Historia clinica:**

- `ficha_clinica` — N:1 con `pacientes`, `citas`, `medicos`. Sin UNIQUE sobre `cita_id`.
- `documentos_adjuntos` — N:1 con `ficha_clinica` y con `medicos` (`subido_por`).

**Transversales (referencia polimorfica por convencion rol+id, sin FK fisica):**

- `audit_log` — `usuario_id` + `usuario_rol` (cualquiera de los 4 roles); `entidad` + `entidad_id` (cualquier tabla).
- `notificaciones` — `destinatario_id` + `destinatario_rol`; `referencia_id` + `referencia_tipo`.

### Diagrama general (ASCII)

```
┌──────────────┐        ┌──────────────────┐        ┌───────────────────┐
│  pacientes   │        │     medicos       │        │  especialidades   │
│──────────────│        │───────────────────│  N:1   │────────────────────│
│ id (PK)      │        │ id (PK)           │───────>│ id (PK)            │
│ nombre       │        │ username (UQ)     │        │ nombre (UQ)        │
│ apellido     │        │ email (UQ)        │        │ descripcion        │
│ email (UQ)   │        │ especialidad_id FK│        │ activo             │
│ email_verif. │        │ estado (enum)     │        └────────────────────┘
│ password_hash│        │ password_hash     │
│ deleted_at   │        │ deleted_at        │        ┌────────────────────┐
└──────┬───────┘        └─────────┬─────────┘        │ administradores    │
       │                          │                  │────────────────────│
       │                          │                  │ id (PK)            │
       │      ┌───────────────────┴──────┐           │ username (UQ)      │
       │      │          citas            │           └────────────────────┘
       └─────>│───────────────────────────│
              │ id (PK)                   │           ┌────────────────────┐
              │ paciente_id (FK)          │           │   secretarias      │
              │ medico_id (FK)            │           │────────────────────│
              │ especialidad_id (FK)      │           │ id (PK)            │
              │ agenda_id (FK)            │           │ username (UQ)      │
              │ fecha / hora_inicio/fin   │           └────────────────────┘
              │ estado (enum)             │
              │ cancelado_por/rol         │
              └─────────────┬─────────────┘
                            │ N:1
              ┌─────────────┴─────────────┐
              │      ficha_clinica         │
              │────────────────────────────│
              │ id (PK)                    │
              │ paciente_id / cita_id / medico_id (FK) │
              │ diagnostico (NOT NULL)      │
              │ indicaciones / receta       │
              └─────────────┬───────────────┘
                            │ 1:N
              ┌─────────────┴───────────────┐
              │    documentos_adjuntos       │
              │──────────────────────────────│
              │ id (PK)                      │
              │ ficha_clinica_id (FK)        │
              │ subido_por (FK -> medicos)   │
              │ ruta_archivo / mime / bytes  │
              └──────────────────────────────┘

┌───────────────────────┐        ┌───────────────────────────┐
│   bloques_horarios     │        │      agenda_medico         │
│────────────────────────│  1:N   │─────────────────────────────│
│ id (PK)                │───────>│ id (PK)                     │
│ dia_semana (1-7)       │        │ medico_id (FK)              │
│ hora_inicio / hora_fin │        │ bloque_horario_id (FK)      │
│ es_emergencia          │        │ fecha (DATE)                │
│ activo                 │        │ disponible / confirmado     │
└────────────────────────┘        │ creado_por / creado_por_rol │
                                   └─────────────────────────────┘
    (los "turnos de domingo" son filas de agenda_medico sobre
     bloques con dia_semana=7 y es_emergencia=TRUE, creadas por
     un administrador — no existe una tabla separada)

┌──────────────────────────┐        ┌──────────────────────────┐
│       audit_log           │        │      notificaciones       │
│────────────────────────────│        │────────────────────────────│
│ usuario_id / usuario_rol   │        │ destinatario_id / rol      │
│ accion / entidad / entidad_id       │ tipo (enum)                │
│ datos_anteriores/nuevos JSONB       │ enviado / enviado_at       │
└────────────────────────────┘        │ referencia_id / tipo       │
                                       └────────────────────────────┘
```

---

## 3. Definicion de tablas (fiel a las migraciones)

### 3.1 `pacientes` (migracion 001)

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK, `gen_random_uuid()` |
| nombre, apellido | VARCHAR(100) | NOT NULL |
| segundo_apellido | VARCHAR(100) | nullable |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| email_verificado | BOOLEAN | DEFAULT FALSE |
| telefono | VARCHAR(20) | nullable |
| fecha_nacimiento | DATE | nullable |
| password_hash | VARCHAR(255) | NOT NULL |
| activo | BOOLEAN | DEFAULT TRUE |
| deleted_at | TIMESTAMP | soft delete |
| created_at, updated_at | TIMESTAMP | DEFAULT NOW() |

Indices: `idx_pacientes_email`.

### 3.2 `medicos` (migracion 001, FK agregada en 002)

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| nombre, apellido, segundo_apellido | VARCHAR(100) | segundo_apellido nullable |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| username | VARCHAR(100) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| estado | `estado_medico` | DEFAULT `'ACTIVO'` |
| especialidad_id | UUID | FK -> `especialidades(id)`, nullable, sin `ON DELETE` |
| activo | BOOLEAN | DEFAULT TRUE |
| deleted_at | TIMESTAMP | soft delete |

Indices: `idx_medicos_username`, `idx_medicos_especialidad`, `idx_medicos_estado`.

### 3.3 `administradores` / `secretarias` (migracion 001)

Misma forma: `id, nombre, apellido, email (UQ), telefono, username (UQ), password_hash,
activo, deleted_at, created_at, updated_at`. Sin relaciones FK hacia otras tablas.

### 3.4 `especialidades` (migracion 002)

`id, nombre (UQ), descripcion, activo, created_at, updated_at`.

**Seed (10 filas):** Medicina General, Cardiologia, Dermatologia, Ginecologia,
Neurologia, Oftalmologia, Ortopedia, Pediatria, Psiquiatria, Traumatologia.

### 3.5 `bloques_horarios` (migracion 003)

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| dia_semana | SMALLINT | NOT NULL, CHECK 1-7 (1=Lunes ... 7=Domingo) |
| hora_inicio, hora_fin | TIME | NOT NULL, CHECK `hora_fin > hora_inicio` |
| es_emergencia | BOOLEAN | DEFAULT FALSE |
| activo | BOOLEAN | DEFAULT TRUE |

**Seed (84 filas):**
- Lunes-Viernes: 08:00-19:00, bloques de 1h (11 × 5 = 55 filas), `es_emergencia=FALSE`
- Sabado: 08:00-13:00, bloques de 1h (5 filas), `es_emergencia=FALSE`
- Domingo: 24h completas, bloques de 1h (24 filas), `es_emergencia=TRUE`

### 3.6 `agenda_medico` (migracion 004)

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| medico_id | UUID | NOT NULL, FK -> `medicos` |
| bloque_horario_id | UUID | NOT NULL, FK -> `bloques_horarios` |
| fecha | DATE | NOT NULL |
| disponible | BOOLEAN | DEFAULT TRUE |
| confirmado | BOOLEAN | DEFAULT FALSE |
| creado_por | UUID | nullable, sin FK (rol variable) |
| creado_por_rol | VARCHAR(20) | DEFAULT `'medico'` |

Constraint: `UNIQUE (medico_id, bloque_horario_id, fecha)`.
Indices: `idx_agenda_medico`, `idx_agenda_fecha`, `idx_agenda_disponible`.

### 3.7 `citas` (migracion 005)

| Columna | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| paciente_id | UUID | NOT NULL, FK -> `pacientes` |
| medico_id | UUID | NOT NULL, FK -> `medicos` |
| especialidad_id | UUID | NOT NULL, FK -> `especialidades` |
| agenda_id | UUID | NOT NULL, FK -> `agenda_medico` |
| fecha | DATE | NOT NULL |
| hora_inicio, hora_fin | TIME | NOT NULL |
| estado | `estado_cita` | DEFAULT `'CONFIRMADA'` |
| motivo_consulta, motivo_cancelacion, notas | TEXT | nullable |
| cancelado_por | UUID | nullable, sin FK |
| cancelado_por_rol | VARCHAR(20) | nullable |
| deleted_at | TIMESTAMP | soft delete |

**Regla de negocio critica (indice unico parcial):**

```sql
CREATE UNIQUE INDEX idx_citas_unica_activa
  ON citas (medico_id, fecha, hora_inicio)
  WHERE estado != 'CANCELADA';
```

Un medico no puede tener dos citas activas (cualquier estado distinto de
`CANCELADA`) en el mismo horario. Cancelar una cita libera el slot para
volver a reservarlo.

Indices: `idx_citas_paciente`, `idx_citas_medico`, `idx_citas_fecha`,
`idx_citas_estado`, `idx_citas_especialidad`, `idx_citas_paciente_estado`.

### 3.8 `ficha_clinica` / `documentos_adjuntos` (migracion 006)

**`ficha_clinica`**: `id, paciente_id (FK), cita_id (FK), medico_id (FK),
diagnostico (NOT NULL), indicaciones, receta, observaciones, created_at,
updated_at`. **Sin UNIQUE en `cita_id`** — nada impide mas de una ficha por cita
a nivel de base de datos.

**`documentos_adjuntos`**: `id, ficha_clinica_id (FK), nombre_archivo,
tipo_archivo, ruta_archivo, tamano_bytes, descripcion, subido_por (FK ->
medicos), created_at`.

### 3.9 `audit_log` (migracion 007)

`id, usuario_id (NOT NULL, sin FK), usuario_rol, accion, entidad, entidad_id,
datos_anteriores (JSONB), datos_nuevos (JSONB), ip_address, user_agent,
created_at`. Sin datos semilla.

### 3.10 `notificaciones` (migracion 008)

`id, destinatario_id (NOT NULL, sin FK), destinatario_rol, tipo
(`tipo_notificacion`), titulo, mensaje, email_destino, enviado, enviado_at,
error_envio, referencia_id, referencia_tipo, created_at`. Sin datos semilla.

---

## 4. Restricciones de integridad

| Tabla | Restriccion | Tipo |
|---|---|---|
| pacientes | email unico | UNIQUE |
| medicos | username unico, email unico | UNIQUE |
| administradores, secretarias | username unico, email unico | UNIQUE |
| especialidades | nombre unico | UNIQUE |
| agenda_medico | (medico_id, bloque_horario_id, fecha) unico | UNIQUE |
| citas | (medico_id, fecha, hora_inicio) unico, solo si `estado != 'CANCELADA'` | UNIQUE PARCIAL |
| bloques_horarios | `dia_semana` entre 1 y 7; `hora_fin > hora_inicio` | CHECK |

**Soft delete:** `pacientes`, `medicos`, `citas` y `administradores`/`secretarias`
tienen `deleted_at`; las consultas de aplicacion deben filtrar por el (el
esquema SQL no impone `WHERE deleted_at IS NULL` automaticamente en ninguna
vista ni constraint).

**Sin `ON DELETE CASCADE`/`RESTRICT` explicito** en ninguna FK de las 8
migraciones — todas usan el comportamiento por defecto de PostgreSQL
(`NO ACTION`).

### Reglas de negocio que NO estan en la base de datos (se aplican en la app)

| Regla | Donde se aplica |
|---|---|
| Maximo de citas activas por paciente | `backend/src/services/appointmentService.js` |
| Minimo de horas de anticipacion para agendar/cancelar | `backend/src/services/appointmentService.js` |
| Formato de email/telefono, longitud de campos | `backend/src/validators/*.js` (express-validator) |
| Verificacion de email obligatoria para login de paciente | `backend/src/services/authService.js` |

(El detalle exacto de cada regla, con archivo:linea, esta en el **BDD v2** —
ver `docs/BDD-v2.md`.)

---

## 5. Diagrama de estados de `citas`

```
                    ┌─────────────┐
                    │ CONFIRMADA  │  (estado inicial al crear la cita)
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

**Transiciones reales (ver rutas en `backend/src/routes/citas.routes.js` y
`secretaria.routes.js`):**
- CONFIRMADA -> COMPLETADA: el medico guarda la ficha clinica (`POST /api/fichas-clinicas`)
- CONFIRMADA -> CANCELADA: el paciente (`PATCH /api/citas/:id/cancelar`) o el
  administrador (`PATCH /api/admin/citas/:id/cancelar`)
- CONFIRMADA -> NO_SHOW: el medico o la secretaria (`PATCH .../no-show`)
- NO_SHOW -> RECONSULTA: la secretaria (`PATCH /api/secretaria/citas/:id/reconsulta`)

Nota: a diferencia del v2, **no existe una columna `reconsulta_de`** que
vincule la cita en RECONSULTA con una cita de reemplazo — el estado solo
marca la intencion de reagendar; el reagendamiento en si es una nueva fila
en `citas` sin vinculo formal a la anterior.

---

## 6. Observaciones abiertas (para decidir, no corregidas automaticamente)

- `medicos.especialidad_id` no es `NOT NULL`: un medico puede quedar sin
  especialidad asignada.
- Las columnas "por rol" (`creado_por`/`creado_por_rol`, `cancelado_por`/`rol`,
  `usuario_id`/`rol` en auditoria, `destinatario_id`/`rol` en notificaciones)
  usan UUID **sin FK fisica** — la integridad es solo por convencion de la
  aplicacion, no la garantiza PostgreSQL.
- No hay UNIQUE que fuerce 1:1 entre `citas` y `ficha_clinica`, ni entre
  `agenda_medico` y `citas`.

---

## 7. Motor y despliegue actual

- PostgreSQL gestionado en **Railway** (mismo proyecto que el backend).
- Migraciones ejecutables con `npm run migrate` (`backend/scripts/migrate.js`),
  idempotente via tabla `schema_migrations`.
- Datos de demostracion cargados con `npm run seed` (`backend/scripts/seed.js`),
  no con SQL de semilla adicional — ver `docs/DESPLIEGUE.md`.
