# SDD v2 - Documento de Diseno del Sistema

## Plataforma de Citas Medicas

**Version:** 2.0  
**Fecha:** Agosto 2024  
**Estado:** En desarrollo

---

## 1. Introduccion

Este documento describe la arquitectura, modulos, endpoints y flujos del sistema de Plataforma de Citas Medicas. El sistema permite la gestion integral de citas medicas, incluyendo agendamiento, horarios de medicos, fichas clinicas, notificaciones y auditoria.

---

## 2. Arquitectura del Sistema

### 2.1 Arquitectura de 3 Capas

```
┌─────────────────────────────────────────────────────────────┐
│                  CAPA DE PRESENTACION                        │
│              (React.js - Single Page Application)            │
│                                                             │
│  - Interfaces por rol (Paciente, Medico, Admin, Secretaria) │
│  - Comunicacion via REST API                                │
│  - Manejo de estado con Context/Redux                       │
└─────────────────────────────────┬───────────────────────────┘
                                  │ HTTP/HTTPS (JSON)
┌─────────────────────────────────┴───────────────────────────┐
│                  CAPA DE LOGICA DE NEGOCIO                   │
│              (Node.js + Express)                             │
│                                                             │
│  - Controladores REST                                       │
│  - Servicios de negocio                                     │
│  - Middleware (Auth JWT, Validacion, Rate Limiting)          │
│  - Manejo de errores centralizado                           │
└─────────────────────────────────┬───────────────────────────┘
                                  │ SQL (pg driver)
┌─────────────────────────────────┴───────────────────────────┐
│                  CAPA DE DATOS                               │
│              (PostgreSQL)                                    │
│                                                             │
│  - Tablas separadas por rol                                 │
│  - Indices parciales para restricciones de negocio          │
│  - Triggers para auditoria                                  │
│  - Soft delete con columnas deleted_at                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnologico

| Componente       | Tecnologia              |
|------------------|-------------------------|
| Frontend         | React.js                |
| Backend          | Node.js + Express       |
| Base de Datos    | PostgreSQL              |
| Autenticacion    | JWT (jsonwebtoken)      |
| Encriptacion     | bcrypt                  |
| Notificaciones   | Nodemailer (SMTP)       |
| Validacion       | express-validator       |
| Rate Limiting    | express-rate-limit      |

---

## 3. Modulos del Sistema

### 3.1 Modulo de Autenticacion (Auth)

**Responsabilidades:**
- Registro de pacientes con validacion de email
- Login para todos los roles (paciente, medico, admin, secretaria)
- Generacion y validacion de tokens JWT
- Verificacion de email mediante token
- Recuperacion de contrasena

**Generacion de username para medicos:**
- Regla principal: primera letra del nombre + apellido (ej: Juan Perez -> jperez)
- Si hay colision: + primera letra del segundo apellido (ej: jperezg)
- Si no tiene segundo apellido: dos primeras letras del nombre + apellido (ej: juperez)

### 3.2 Modulo de Citas

**Responsabilidades:**
- Creacion de citas (estado inicial: CONFIRMADA)
- Cancelacion de citas (paciente o admin)
- Consulta de citas por paciente/medico/fecha
- Transiciones de estado (CONFIRMADA -> COMPLETADA, CANCELADA, NO_SHOW, RECONSULTA)
- Validaciones de reglas de negocio

**Reglas de negocio:**
- Maximo 3 citas activas por paciente en diferentes especialidades
- No puede agendar con el mismo medico o misma especialidad si ya tiene cita activa
- Tiempo minimo para agendar: 24 horas antes (excepto si hay espacio libre)
- Cancelacion con al menos 2 horas de anticipacion
- Un bloque horario solo puede tener una cita activa (unique parcial: excluir CANCELADA)

### 3.3 Modulo de Horarios/Agenda

**Responsabilidades:**
- Gestion de bloques horarios (L-V 8:00-19:00, Sabados 8:00-13:00)
- Carga de agenda semanal por medico (1 semana de anticipacion)
- Propuesta de ultima configuracion para confirmar/modificar
- Asignacion de medicos de turno para domingos (por admin)
- Emergencias domingos 24h sin cita previa, por orden de llegada

### 3.4 Modulo de Ficha Clinica

**Responsabilidades:**
- Creacion de ficha clinica al atender paciente
- Registro de diagnostico, indicaciones y receta
- Carga de documentos (analisis, radiografias)
- Consulta de historial clinico por paciente
- Al guardar ficha, la cita se marca COMPLETADA

### 3.5 Modulo de Notificaciones

**Responsabilidades:**
- Email de confirmacion al agendar cita
- Recordatorio 24 horas antes de la cita
- Notificacion de cancelacion cuando admin cancela por emergencia
- Templates de email en espanol

### 3.6 Modulo de Auditoria

**Responsabilidades:**
- Registro automatico de acciones (quien hizo que y cuando)
- Soft delete con trazabilidad
- Consulta de logs por entidad/usuario/fecha

### 3.7 Modulo de Administracion

**Responsabilidades:**
- Cancelacion de citas por emergencia (con notificacion)
- Asignacion de medicos de turno para domingos
- Carga de agenda cuando medico no cumple plazo
- Cambio de estado del medico (Activo/Baja/Vacacion)

---

## 4. API REST - Endpoints

### 4.1 Autenticacion (`/api/auth`)

#### POST /api/auth/registro
Registra un nuevo paciente.

**Request Body:**
```json
{
  "nombre": "Juan",
  "apellido": "Garcia",
  "email": "juan@email.com",
  "password": "MiPass123",
  "telefono": "1155667788",
  "fecha_nacimiento": "1990-05-15",
  "dni": "30123456"
}
```

**Response 201:**
```json
{
  "message": "Registro exitoso. Verifique su email para activar la cuenta.",
  "paciente_id": "uuid"
}
```

#### POST /api/auth/verificar-email
Verifica el email del paciente con token.

**Request Body:**
```json
{
  "token": "abc123def456"
}
```

**Response 200:**
```json
{
  "message": "Email verificado exitosamente."
}
```

#### POST /api/auth/login
Autenticacion para todos los roles.

**Request Body:**
```json
{
  "email_or_username": "juan@email.com",
  "password": "MiPass123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": "uuid",
    "nombre": "Juan",
    "apellido": "Garcia",
    "rol": "paciente"
  }
}
```

#### POST /api/auth/recuperar-password
Solicita recuperacion de contrasena.

**Request Body:**
```json
{
  "email": "juan@email.com"
}
```

**Response 200:**
```json
{
  "message": "Se envio un enlace de recuperacion a su email."
}
```

#### POST /api/auth/reset-password
Restablece la contrasena con token.

**Request Body:**
```json
{
  "token": "reset-token-123",
  "nueva_password": "NuevaPass456"
}
```

**Response 200:**
```json
{
  "message": "Contrasena actualizada exitosamente."
}
```

---

### 4.2 Citas (`/api/citas`)

#### GET /api/citas
Obtiene las citas del usuario autenticado (filtradas por rol).

**Query Params:** `?fecha_desde=2024-08-01&fecha_hasta=2024-08-31&estado=CONFIRMADA`

**Response 200:**
```json
{
  "citas": [
    {
      "id": "uuid",
      "paciente_id": "uuid",
      "medico_id": "uuid",
      "fecha": "2024-08-20",
      "hora_inicio": "10:00",
      "hora_fin": "11:00",
      "especialidad": "Cardiologia",
      "estado": "CONFIRMADA",
      "medico_nombre": "Dr. Ana Lopez",
      "created_at": "2024-08-13T14:30:00Z"
    }
  ]
}
```

#### POST /api/citas
Crea una nueva cita (estado inicial: CONFIRMADA).

**Request Body:**
```json
{
  "medico_id": "uuid",
  "fecha": "2024-08-20",
  "bloque_horario_id": "uuid",
  "motivo": "Consulta general"
}
```

**Response 201:**
```json
{
  "message": "Cita confirmada exitosamente.",
  "cita": {
    "id": "uuid",
    "fecha": "2024-08-20",
    "hora_inicio": "10:00",
    "hora_fin": "11:00",
    "estado": "CONFIRMADA",
    "medico": "Dr. Ana Lopez",
    "especialidad": "Cardiologia"
  }
}
```

**Response 409:**
```json
{
  "error": "Conflicto",
  "message": "El bloque horario ya esta ocupado."
}
```

#### PATCH /api/citas/:id/cancelar
Cancela una cita (paciente o admin).

**Response 200:**
```json
{
  "message": "Cita cancelada exitosamente.",
  "cita": {
    "id": "uuid",
    "estado": "CANCELADA"
  }
}
```

#### PATCH /api/citas/:id/no-show
Marca una cita como NO_SHOW (medico o secretaria).

**Response 200:**
```json
{
  "message": "Cita marcada como no presentado.",
  "cita": {
    "id": "uuid",
    "estado": "NO_SHOW"
  }
}
```

#### PATCH /api/citas/:id/reconsulta
Marca una cita para reconsulta (secretaria).

**Request Body:**
```json
{
  "nueva_fecha": "2024-08-22",
  "nuevo_bloque_horario_id": "uuid"
}
```

**Response 200:**
```json
{
  "message": "Reconsulta agendada exitosamente.",
  "cita": {
    "id": "uuid",
    "estado": "RECONSULTA",
    "nueva_cita_id": "uuid"
  }
}
```

---

### 4.3 Horarios/Agenda (`/api/agenda`)

#### GET /api/agenda/medico/:medicoId
Obtiene la agenda del medico para una semana.

**Query Params:** `?semana=2024-08-26`

**Response 200:**
```json
{
  "medico_id": "uuid",
  "semana": "2024-08-26",
  "bloques": [
    {
      "dia": "lunes",
      "fecha": "2024-08-26",
      "horarios": [
        {
          "bloque_id": "uuid",
          "hora_inicio": "08:00",
          "hora_fin": "09:00",
          "disponible": true
        },
        {
          "bloque_id": "uuid",
          "hora_inicio": "09:00",
          "hora_fin": "10:00",
          "disponible": false
        }
      ]
    }
  ]
}
```

#### POST /api/agenda/medico/:medicoId/cargar
Carga la agenda semanal del medico (medico o admin).

**Request Body:**
```json
{
  "semana": "2024-08-26",
  "bloques": [
    {
      "dia": "lunes",
      "hora_inicio": "08:00",
      "hora_fin": "09:00",
      "activo": true
    },
    {
      "dia": "lunes",
      "hora_inicio": "09:00",
      "hora_fin": "10:00",
      "activo": true
    }
  ]
}
```

**Response 201:**
```json
{
  "message": "Agenda cargada exitosamente.",
  "semana": "2024-08-26",
  "total_bloques": 45
}
```

#### GET /api/agenda/medico/:medicoId/ultima-config
Obtiene la ultima configuracion de agenda para proponer.

**Response 200:**
```json
{
  "semana_origen": "2024-08-19",
  "bloques": [
    {
      "dia": "lunes",
      "hora_inicio": "08:00",
      "hora_fin": "09:00",
      "activo": true
    }
  ]
}
```

#### POST /api/agenda/medico/:medicoId/confirmar
Confirma la agenda propuesta (ultima config) o la modifica.

**Request Body:**
```json
{
  "semana": "2024-08-26",
  "usar_ultima_config": true
}
```

**Response 200:**
```json
{
  "message": "Agenda confirmada para la semana 2024-08-26."
}
```

#### GET /api/agenda/disponibilidad
Obtiene bloques disponibles para agendar (para pacientes).

**Query Params:** `?especialidad=Cardiologia&fecha=2024-08-20`

**Response 200:**
```json
{
  "fecha": "2024-08-20",
  "especialidad": "Cardiologia",
  "disponibilidad": [
    {
      "medico_id": "uuid",
      "medico_nombre": "Dr. Ana Lopez",
      "bloques_disponibles": [
        {
          "bloque_id": "uuid",
          "hora_inicio": "10:00",
          "hora_fin": "11:00"
        }
      ]
    }
  ]
}
```

#### POST /api/agenda/domingos/asignar
Asigna medicos de turno para domingos (solo admin).

**Request Body:**
```json
{
  "fecha": "2024-08-25",
  "medicos": ["uuid-medico-1", "uuid-medico-2"]
}
```

**Response 201:**
```json
{
  "message": "Medicos asignados para turno dominical.",
  "fecha": "2024-08-25",
  "medicos_asignados": 2
}
```

---

### 4.4 Ficha Clinica (`/api/fichas`)

#### GET /api/fichas/paciente/:pacienteId
Obtiene la ficha clinica completa de un paciente.

**Response 200:**
```json
{
  "paciente_id": "uuid",
  "paciente_nombre": "Juan Garcia",
  "atenciones": [
    {
      "id": "uuid",
      "fecha": "2024-08-15",
      "medico": "Dr. Ana Lopez",
      "especialidad": "Cardiologia",
      "diagnostico": "Hipertension arterial leve",
      "indicaciones": "Dieta baja en sodio, ejercicio regular",
      "receta": "Enalapril 10mg c/12h",
      "documentos": [
        {
          "id": "uuid",
          "tipo": "analisis",
          "nombre": "hemograma_20240815.pdf",
          "url": "/api/fichas/documentos/uuid"
        }
      ]
    }
  ]
}
```

#### POST /api/fichas
Crea una nueva entrada en la ficha clinica (al atender paciente). Marca la cita como COMPLETADA.

**Request Body:**
```json
{
  "cita_id": "uuid",
  "diagnostico": "Hipertension arterial leve",
  "indicaciones": "Dieta baja en sodio, ejercicio regular",
  "receta": "Enalapril 10mg c/12h"
}
```

**Response 201:**
```json
{
  "message": "Ficha clinica guardada. Cita marcada como completada.",
  "ficha_id": "uuid",
  "cita_estado": "COMPLETADA"
}
```

#### POST /api/fichas/:fichaId/documentos
Sube un documento a la ficha clinica.

**Request:** `multipart/form-data`
- `archivo`: Archivo (PDF, JPG, PNG)
- `tipo`: "analisis" | "radiografia" | "receta" | "otro"
- `descripcion`: "Hemograma completo"

**Response 201:**
```json
{
  "message": "Documento subido exitosamente.",
  "documento": {
    "id": "uuid",
    "tipo": "analisis",
    "nombre": "hemograma_20240815.pdf",
    "url": "/api/fichas/documentos/uuid"
  }
}
```

#### GET /api/fichas/documentos/:documentoId
Descarga un documento de la ficha clinica.

**Response 200:** Archivo binario con Content-Type correspondiente.

---

### 4.5 Notificaciones (`/api/notificaciones`)

#### GET /api/notificaciones
Lista las notificaciones del usuario autenticado.

**Response 200:**
```json
{
  "notificaciones": [
    {
      "id": "uuid",
      "tipo": "confirmacion_cita",
      "mensaje": "Su cita del 20/08 a las 10:00 ha sido confirmada.",
      "leida": false,
      "created_at": "2024-08-13T14:30:00Z"
    }
  ]
}
```

#### PATCH /api/notificaciones/:id/leer
Marca una notificacion como leida.

**Response 200:**
```json
{
  "message": "Notificacion marcada como leida."
}
```

---

### 4.6 Administracion (`/api/admin`)

#### PATCH /api/admin/medicos/:medicoId/estado
Cambia el estado de un medico (Activo/Baja/Vacacion).

**Request Body:**
```json
{
  "estado": "vacacion",
  "motivo": "Vacaciones programadas agosto 2024"
}
```

**Response 200:**
```json
{
  "message": "Estado del medico actualizado.",
  "medico_id": "uuid",
  "nuevo_estado": "vacacion"
}
```

#### POST /api/admin/citas/:citaId/cancelar-emergencia
Cancela una cita por emergencia (notifica al paciente por email).

**Request Body:**
```json
{
  "motivo": "Emergencia medica del Dr. Lopez"
}
```

**Response 200:**
```json
{
  "message": "Cita cancelada por emergencia. Paciente notificado.",
  "cita_id": "uuid",
  "notificacion_enviada": true
}
```

#### GET /api/admin/medicos/sin-agenda
Lista medicos que no han cargado agenda para la proxima semana.

**Response 200:**
```json
{
  "medicos_sin_agenda": [
    {
      "id": "uuid",
      "nombre": "Dr. Carlos Mendez",
      "especialidad": "Traumatologia",
      "ultima_agenda": "2024-08-12"
    }
  ]
}
```

---

### 4.7 Auditoria (`/api/auditoria`)

#### GET /api/auditoria
Consulta logs de auditoria (solo admin).

**Query Params:** `?entidad=citas&usuario_id=uuid&fecha_desde=2024-08-01`

**Response 200:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "usuario_id": "uuid",
      "usuario_nombre": "Admin Principal",
      "accion": "CANCELAR_CITA",
      "entidad": "citas",
      "entidad_id": "uuid",
      "datos_anteriores": { "estado": "CONFIRMADA" },
      "datos_nuevos": { "estado": "CANCELADA" },
      "motivo": "Emergencia medica",
      "ip": "192.168.1.100",
      "created_at": "2024-08-13T16:00:00Z"
    }
  ]
}
```

---

## 5. Flujos de Autenticacion y Autorizacion

### 5.1 Flujo de Autenticacion JWT

```
1. Usuario envia credenciales (POST /api/auth/login)
2. Backend valida credenciales contra la tabla correspondiente al rol
3. Si valido: genera JWT con payload {id, rol, email/username}
4. Token tiene expiracion de 24 horas
5. Cliente almacena token y lo envia en header: Authorization: Bearer <token>
6. Middleware verifica token en cada request protegida
7. Si token invalido o expirado: responde 401
```

### 5.2 Matriz de Permisos por Rol

| Endpoint                              | Paciente | Medico | Admin | Secretaria |
|---------------------------------------|----------|--------|-------|------------|
| POST /api/auth/registro               | Publico  | -      | -     | -          |
| POST /api/auth/login                  | Publico  | Publico| Publico| Publico   |
| GET /api/citas                        | Si       | Si     | Si    | Si         |
| POST /api/citas                       | Si       | -      | -     | -          |
| PATCH /api/citas/:id/cancelar         | Si       | -      | Si    | -          |
| PATCH /api/citas/:id/no-show          | -        | Si     | -     | Si         |
| PATCH /api/citas/:id/reconsulta       | -        | -      | -     | Si         |
| POST /api/agenda/medico/:id/cargar    | -        | Si     | Si    | -          |
| POST /api/fichas                      | -        | Si     | -     | -          |
| GET /api/fichas/paciente/:id          | Si*      | Si     | -     | -          |
| POST /api/admin/citas/:id/cancelar-emergencia | - | -   | Si    | -          |
| PATCH /api/admin/medicos/:id/estado   | -        | -      | Si    | -          |
| POST /api/agenda/domingos/asignar     | -        | -      | Si    | -          |
| GET /api/auditoria                    | -        | -      | Si    | -          |

*Paciente solo puede ver su propia ficha clinica.

### 5.3 Flujo de Verificacion de Email

```
1. Paciente se registra (POST /api/auth/registro)
2. Sistema genera token de verificacion (UUID)
3. Sistema envia email con enlace: /verificar?token=<token>
4. Paciente hace clic en enlace
5. Frontend llama POST /api/auth/verificar-email con el token
6. Backend marca email como verificado
7. Paciente puede hacer login
```

---

## 6. Estrategia de Manejo de Errores

### 6.1 Codigos HTTP

| Codigo | Significado       | Uso                                              |
|--------|-------------------|--------------------------------------------------|
| 200    | OK                | Operacion exitosa                                |
| 201    | Created           | Recurso creado exitosamente                      |
| 400    | Bad Request       | Datos invalidos o faltantes                      |
| 401    | Unauthorized      | No autenticado o token invalido/expirado         |
| 403    | Forbidden         | Sin permisos para la operacion                   |
| 404    | Not Found         | Recurso no encontrado                            |
| 409    | Conflict          | Conflicto (horario ocupado, email duplicado)     |
| 500    | Internal Error    | Error interno del servidor                       |

### 6.2 Formato de Error Estandar

```json
{
  "error": "Tipo de error",
  "message": "Descripcion legible del error",
  "details": [
    {
      "campo": "email",
      "mensaje": "El formato del email no es valido"
    }
  ]
}
```

### 6.3 Middleware de Manejo de Errores

```javascript
// Middleware centralizado de errores
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const response = {
    error: err.type || 'Error interno',
    message: err.message || 'Ha ocurrido un error inesperado'
  };
  
  if (err.details) {
    response.details = err.details;
  }
  
  // Log para auditoria en errores 500
  if (status === 500) {
    logger.error({ err, req_id: req.id });
  }
  
  res.status(status).json(response);
};
```

---

## 7. Medidas de Seguridad

### 7.1 Autenticacion y Contrasenas

- **bcrypt** para hash de contrasenas (salt rounds: 12)
- Contrasena minimo 8 caracteres, al menos 1 numero y 1 mayuscula
- Tokens JWT firmados con secreto seguro (HS256)
- Expiracion de token: 24 horas
- Refresh tokens para sesiones prolongadas

### 7.2 Proteccion de Endpoints

- **HTTPS** obligatorio en produccion
- **Rate Limiting**: 100 requests por minuto por IP para endpoints generales
- **Rate Limiting**: 5 intentos por minuto para login (prevencion de fuerza bruta)
- Headers de seguridad (helmet.js): X-Content-Type-Options, X-Frame-Options, etc.
- CORS configurado para dominios permitidos

### 7.3 Validacion de Datos

| Campo              | Validacion                                    |
|--------------------|-----------------------------------------------|
| Email              | Formato valido, unico en la tabla             |
| Telefono           | Formato numerico, longitud 8-15 digitos       |
| Contrasena         | Min 8 chars, 1 numero, 1 mayuscula            |
| Nombre/Apellido    | No vacio, solo letras y espacios              |
| Fecha de cita      | No puede ser en el pasado                     |
| Hora de cita       | Dentro del horario de atencion del medico     |
| DNI                | Formato numerico, longitud 7-8 digitos        |

### 7.4 Proteccion de Archivos

- Validacion de tipo MIME para documentos subidos
- Tamano maximo de archivo: 10MB
- Almacenamiento seguro fuera del directorio publico
- Acceso a documentos solo para paciente dueno y medicos tratantes

### 7.5 Auditoria de Seguridad

- Log de todos los intentos de login (exitosos y fallidos)
- Log de operaciones administrativas
- Registro de IP y user-agent en acciones criticas
- Soft delete para mantener trazabilidad

---

## 8. Estructura del Proyecto

```
/projects/sandbox/
├── docs/                          # Documentacion
│   ├── SDD-v2.md
│   ├── DBD-v2.md
│   ├── BDD.md
│   └── Diagramas.md
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── index.js               # Entry point
│   │   ├── config/
│   │   │   ├── database.js        # Conexion PostgreSQL
│   │   │   ├── jwt.js             # Configuracion JWT
│   │   │   └── email.js           # Configuracion Nodemailer
│   │   ├── middleware/
│   │   │   ├── auth.js            # Verificacion JWT
│   │   │   ├── authorize.js       # Verificacion de roles
│   │   │   ├── validate.js        # Validacion de datos
│   │   │   ├── rateLimiter.js     # Rate limiting
│   │   │   └── errorHandler.js    # Manejo centralizado de errores
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── citas.routes.js
│   │   │   ├── agenda.routes.js
│   │   │   ├── fichas.routes.js
│   │   │   ├── notificaciones.routes.js
│   │   │   ├── admin.routes.js
│   │   │   └── auditoria.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── citas.controller.js
│   │   │   ├── agenda.controller.js
│   │   │   ├── fichas.controller.js
│   │   │   ├── notificaciones.controller.js
│   │   │   ├── admin.controller.js
│   │   │   └── auditoria.controller.js
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── citas.service.js
│   │   │   ├── agenda.service.js
│   │   │   ├── fichas.service.js
│   │   │   ├── notificaciones.service.js
│   │   │   └── auditoria.service.js
│   │   └── utils/
│   │       ├── logger.js
│   │       └── validators.js
│   ├── database/
│   │   └── migrations/
│   │       ├── 001_create_tables.sql
│   │       ├── 002_create_indexes.sql
│   │       └── 003_create_audit.sql
│   └── tests/
│       ├── auth.test.js
│       ├── citas.test.js
│       └── agenda.test.js
└── frontend/
    ├── package.json
    └── src/
        ├── App.jsx
        ├── pages/
        ├── components/
        ├── services/
        └── context/
```

---

## 9. Consideraciones de Despliegue

- **Contenedores Docker** para backend y base de datos
- **Variables de entorno** para configuracion sensible (DB_URL, JWT_SECRET, SMTP)
- **Migraciones** ejecutadas al inicio del contenedor
- **Health check** endpoint: GET /api/health
- **Logs** estructurados en formato JSON para herramientas de monitoreo
