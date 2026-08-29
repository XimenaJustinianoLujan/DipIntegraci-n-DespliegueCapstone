# SDD v3 - Documento de Diseno del Sistema (fiel al codigo)

## Plataforma de Citas Medicas (JOX)

**Version:** 3.0
**Fecha:** Agosto 2026
**Estado:** Desplegado en produccion (Railway + Vercel)
**Fuente:** codigo real de `backend/` y `frontend/` — no el diseno original de 2024.

---

## Nota de version: por que existe un v3

El **SDD v2** (Agosto 2024) fue escrito como documento de diseno **antes** de
terminar la implementacion, y nunca se actualizo despues. Varios endpoints
documentados alli **no existen** en el codigo real, y varios que si existen
**no estaban documentados**. Ademas, el v2 no cubria absolutamente nada del
frontend (no existia entonces). Este v3 reemplaza al v2 documentando el
sistema **tal como es hoy**.

### Lo mas importante que cambio

| Area | Cambio |
|---|---|
| Endpoints | Reescritos por completo (seccion 4) contra el codigo real de las 8 rutas del backend. Varios del v2 no existen (`/api/auditoria`, `/api/admin/medicos/sin-agenda`, `/api/notificaciones`); varios reales no estaban documentados (`GET /api/admin/stats`, `GET`/`DELETE /api/admin/turnos-domingo`, `/api/agenda/admin-override`, `/api/medicos/:id/agenda`). |
| Frontend | **Seccion nueva (10)** — el v2 no documentaba el frontend en absoluto. Ahora cubre arquitectura de rutas, estado global, sistema de diseno, tema oscuro, graficos, command palette e ilustraciones. |
| Despliegue | El v2 asumia contenedores Docker genericos "a futuro". La seccion 9 ahora documenta el despliegue real: backend con Docker en **Railway** (con Postgres en el mismo proyecto), frontend en **Vercel**. |
| Seguridad | Numeros corregidos: bcrypt usa **10** salt rounds (no 12); rate limit de auth es **10 intentos / 15 minutos** (no 5/min); tamano maximo de archivo real es **5MB** (no 10MB). |
| Estructura del proyecto | Reemplazada la estructura aspiracional (con carpetas `controllers/`, rutas de `notificaciones`/`auditoria` que no existen) por el arbol de carpetas real. |

El resto de la organizacion conceptual del v2 (arquitectura de 3 capas, modulos
de negocio) se mantuvo razonablemente correcta y se conserva aqui, corregida en
los detalles.

### Actualizacion (28-29 agosto 2026)

Sin cambiar el numero de version (siguen siendo las mismas 8 rutas y la misma
arquitectura de 3 capas), se agrego lo siguiente y se corrigieron algunos
puntos donde el codigo no coincidia con lo documentado:

- **Historial clinico visible al medico al atender** (antes solo existia el
  endpoint, la pantalla de "Atender Paciente" no lo consumia).
- **Notas privadas del medico por cita** (`PATCH /citas/:id/notas`, §4.4):
  activa la columna `citas.notas`, que existia en el esquema desde el inicio
  pero nunca se leia ni escribia. Nunca visible para paciente ni secretaria
  (ver `backend/src/utils/sanitizeCita.js`).
- **Documentos adjuntos ahora descargables por el paciente** desde su Ficha
  Clinica (el endpoint ya lo permitia; faltaba conectarlo en el frontend).
- **Alerta de cita proxima** en los dashboards de paciente (24h) y medico (2h),
  calculada en el cliente con los datos ya cargados — no es el modulo de
  notificaciones por email de §3.5, que sigue sin recordatorio automatico.
- `admin.routes.js` (426 lineas) se dividio en 5 subrouters por dominio bajo
  `backend/src/routes/admin/` (§8) — cambio de organizacion interna, los
  endpoints publicos de §4.7 no cambiaron.
- Se agrego CI con GitHub Actions (tests backend + build/lint frontend en
  cada push/PR a `main`).
- Fix: `Cita.findByPaciente`/`findByMedico`/`findByFecha` no hacian JOIN con
  medicos/pacientes/especialidades (devolvian "Medico asignado"/"Paciente"
  genericos en vez del nombre real).
- Fix: el validador de creacion de citas rechazaba una fecha de **hoy** como
  "en el pasado" durante casi todo el dia (comparaba fecha-a-medianoche-UTC
  contra el timestamp completo de "ahora"). Bloqueaba agendar el mismo dia
  aunque el medico tuviera horarios libres mas tarde.
- Suite de tests backend: 46 → 138 (cobertura completa de las 8 rutas,
  antes solo 3 tenian test).

---

## 1. Introduccion

Este documento describe la arquitectura, modulos, endpoints y flujos reales del
sistema **JOX — Plataforma de Citas Medicas**. El sistema permite la gestion
integral de citas medicas: agendamiento, horarios de medicos, fichas clinicas,
notificaciones por email y auditoria interna, con cuatro roles (paciente,
medico, administrador, secretaria).

**Demo en vivo:**
- Frontend: https://dip-integraci-n-despliegue-capstone.vercel.app
- Backend (health check): https://dipintegraci-n-desplieguecapstone-production.up.railway.app/api/health

---

## 2. Arquitectura del Sistema

### 2.1 Arquitectura de 3 capas (real)

```
┌─────────────────────────────────────────────────────────────┐
│                  CAPA DE PRESENTACION                        │
│         React 19 + Vite — SPA desplegada en Vercel          │
│                                                               │
│  - 4 conjuntos de rutas por rol (paciente/medico/admin/secre)│
│  - Estado global via Context API (Auth, Theme) — sin Redux   │
│  - Comunicacion con el backend via Axios + JWT en header     │
│  - Tema claro/oscuro, graficos SVG propios, command palette   │
└─────────────────────────────────┬─────────────────────────────┘
                                  │ HTTPS (JSON), CORS restringido
┌─────────────────────────────────┴─────────────────────────────┐
│                  CAPA DE LOGICA DE NEGOCIO                    │
│    Node.js + Express — backend con Docker en Railway         │
│                                                               │
│  - 8 archivos de rutas REST (auth, pacientes, medicos, citas, │
│    agenda, fichas-clinicas, admin, secretaria)                │
│  - Servicios de negocio (appointmentService, scheduleService, │
│    authService, auditService, notificationService)            │
│  - Middleware: auth (JWT), authorize (roles), rate limiting,   │
│    validacion (express-validator), manejo de errores central  │
└─────────────────────────────────┬─────────────────────────────┘
                                  │ SQL (driver `pg`)
┌─────────────────────────────────┴─────────────────────────────┐
│                  CAPA DE DATOS                                │
│         PostgreSQL 14+ gestionado en Railway                  │
│                                                               │
│  - 4 tablas de identidad independientes (sin tabla `usuarios`) │
│  - Indice unico parcial para evitar doble-reserva de horario   │
│  - Soft delete (deleted_at) en pacientes/medicos/citas         │
│  - Auditoria via tabla audit_log (JSONB para antes/despues)    │
└─────────────────────────────────────────────────────────────┘
```

Detalle completo del esquema de datos: ver **`docs/DBD-v3.md`**.

### 2.2 Stack tecnologico (real, de los `package.json`)

| Componente | Tecnologia | Version |
|---|---|---|
| Frontend | React + React DOM | ^19.2.8 |
| Bundler/dev server | Vite + @vitejs/plugin-react | ^8.2.0 / ^6.0.4 |
| Ruteo | React Router DOM | ^7.18.2 |
| Formularios | React Hook Form | ^7.85.0 |
| HTTP client | Axios | ^1.19.0 |
| Fechas | Day.js | ^1.11.21 |
| Lint frontend | oxlint | ^1.75.0 |
| Backend | Node.js + Express | ^4.21.0 |
| Base de datos | PostgreSQL (driver `pg`) | ^8.12.0 |
| Autenticacion | jsonwebtoken | ^9.0.2 |
| Hash de contrasenas | bcryptjs | ^2.4.3 |
| Envio de emails | Nodemailer | ^6.9.15 |
| Validacion | express-validator | ^7.2.0 |
| Rate limiting | express-rate-limit | ^7.4.0 |
| Cabeceras de seguridad | helmet | ^7.1.0 |
| Subida de archivos | multer | ^1.4.5 |
| Testing backend | Jest + Supertest | ^29.7.0 / ^7.0.0 |
| Despliegue backend | Docker (Dockerfile propio) en **Railway** | — |
| Despliegue frontend | **Vercel** (build estatico de Vite) | — |
| Base de datos gestionada | PostgreSQL de **Railway** (mismo proyecto) | — |

Sin libreria de UI externa en el frontend (no hay Tailwind/MUI/styled-components):
CSS plano con variables (tokens) + estilos inline por componente.

---

## 3. Modulos del Sistema

### 3.1 Modulo de Autenticacion (Auth)

**Responsabilidades reales:**
- Registro de pacientes (unico rol con auto-registro; medico/admin/secretaria se
  provisionan por seed o insercion directa, no tienen endpoint de registro).
- Login unificado para los 4 roles: busca por email en las 4 tablas, o por
  username en medico/admin/secretaria (los pacientes no tienen username).
- Verificacion de email obligatoria **solo para pacientes** antes de poder
  iniciar sesion.
- Emision de access token (JWT, `JWT_EXPIRES_IN`, default 24h) y refresh token
  (`JWT_REFRESH_EXPIRES_IN`, default 7 dias) con secretos distintos.
- `POST /api/auth/refresh-token` renueva solo el access token.

> El v2 documentaba una regla de "generacion automatica de username para
> medicos" (ej. `jperez`) en el registro. **Esa logica no existe en el codigo
> real** — no hay endpoint de auto-registro de medicos; los usernames se
> asignan manualmente al crear la cuenta (via `backend/scripts/seed.js` o
> insercion directa).

### 3.2 Modulo de Citas

**Responsabilidades:** creacion (estado inicial `CONFIRMADA`), cancelacion
(paciente dueno o administrador), consulta por paciente/medico/id, y
transiciones de estado (`COMPLETADA`, `CANCELADA`, `NO_SHOW`, `RECONSULTA`).

**Reglas de negocio reales** (archivo:linea en `docs/BDD-v2.md` seccion 2 y
en el reporte de reglas — resumen aqui):
- Maximo 3 citas activas (`CONFIRMADA`/`RECONSULTA`) por paciente.
- No se puede tener 2 citas activas con la misma especialidad ni con el mismo
  medico simultaneamente.
- El medico debe estar `ACTIVO`.
- Minimo 24 horas de anticipacion para agendar, **salvo** que exista un slot
  libre inmediato en la agenda del medico para esa fecha/hora (excepcion real).
- Cancelacion por el paciente: solo su propia cita, en `CONFIRMADA`, con
  minimo 2 horas de anticipacion.
- Cancelacion por administrador: sin restriccion de anticipacion ni de
  propiedad, cualquier cita que no este ya `CANCELADA`/`COMPLETADA`.
- Un medico no puede tener dos citas activas en el mismo horario (reforzado a
  nivel de aplicacion y con un indice unico parcial en la base de datos).
- `RECONSULTA` **no crea una cita nueva**: solo cambia el estado de la cita
  original de `NO_SHOW` a `RECONSULTA`. Reagendar de verdad requiere una cita
  aparte, sin vinculo formal con la anterior.
- Cada cita tiene un campo `notas` de uso exclusivo del medico tratante (o
  administracion): visible solo para quien atiende, nunca para el paciente ni
  la secretaria, sin importar por que endpoint se consulte la cita.

### 3.3 Modulo de Horarios/Agenda

**Responsabilidades:**
- Bloques horarios semanales reutilizables: L-V 08:00-19:00, Sabado
  08:00-13:00 (ambos sin marca de emergencia), Domingo 24h completas
  (todos marcados `es_emergencia = TRUE`).
- El medico carga su agenda con **minimo 7 dias de anticipacion**; el
  administrador puede hacerlo sin esa restriccion via "admin-override"
  (agenda auto-confirmada de inmediato).
- Turnos de emergencia dominical: el administrador asigna medicos a domingos
  especificos (usa los bloques de emergencia del domingo); puede listarlos y
  removerlos. **No valida** que el medico este `ACTIVO` antes de asignarlo.

### 3.4 Modulo de Ficha Clinica

**Responsabilidades:** creacion de ficha al atender (diagnostico obligatorio,
indicaciones/receta/observaciones opcionales), carga de documentos adjuntos
(jpeg/png/gif/pdf/dicom, maximo 5MB), consulta de historial por paciente. Al
guardar la ficha, la cita pasa automaticamente a `COMPLETADA`. El
`paciente_id` de la ficha se deriva siempre de la cita en el servidor (nunca
del valor que mande el cliente), para evitar suplantacion.

El historial (`GET /:pacienteId`) se muestra ahora en dos pantallas: al
paciente en "Mi Ficha Clinica" (con descarga autenticada de documentos, via
blob + Bearer token, porque un `<a href>` comun no manda el token que exige
el endpoint de descarga) y al medico en "Atender Paciente" (panel colapsable,
antes del formulario, para no completar la ficha nueva sin ver el
antecedente).

### 3.5 Modulo de Notificaciones

**Responsabilidades reales:**
- Email de confirmacion al agendar, de cancelacion cuando el admin cancela.
- **La funcion de recordatorio 24h antes existe en el codigo pero no tiene
  ningun disparador automatico** (sin cron/scheduler) — no se envia nunca en
  el estado actual del sistema.
- Si no hay `SMTP_USER` configurado (o `NODE_ENV=test`), los emails no se
  envian de verdad: se registran por consola y la operacion principal se
  completa igual.
- **Alerta en la app (no es email):** los dashboards de paciente y medico
  calculan en el cliente si hay una cita `CONFIRMADA` dentro de las proximas
  24h (paciente) o 2h (medico) sobre los datos que ya cargaron, y muestran un
  banner. No usa cron ni dispara ningun envio — es la unica forma de
  "recordatorio" que existe hoy realmente en produccion.

### 3.6 Modulo de Auditoria

**Responsabilidades:** registro automatico de acciones sensibles (crear/
cancelar cita, marcar NO_SHOW/RECONSULTA, cargar/confirmar agenda, override de
admin, asignar/remover turno dominical, cambiar estado de medico, crear ficha
clinica, subir documento) con datos anteriores/nuevos en JSONB, IP y
user-agent. Un fallo al escribir el log **nunca interrumpe** la operacion
principal (try/catch silencioso con `console.error`).

> **No existe ningun endpoint para leer `audit_log` via API.** La tabla se
> llena correctamente pero solo se puede consultar con SQL directo. Tampoco
> hay endpoint de purga/retencion.

### 3.7 Modulo de Administracion

**Responsabilidades:** cancelar cualquier cita puntual (no hay cancelacion
masiva), cambiar estado de medico (`ACTIVO`/`BAJA`/`VACACION`), asignar/listar/
remover turnos de domingo, cargar agenda de un medico por incumplimiento
(admin-override), y **ver el panel con estadisticas reales**
(`GET /api/admin/stats` — endpoint agregado en esta version; antes de existir,
el panel siempre mostraba "0" en todo por una llamada a una ruta inexistente).

---

## 4. API REST - Endpoints (reales, verificados contra el codigo)

Todas las rutas cuelgan de `/api` (`backend/src/index.js`). Formato de error
generico (aplica salvo que se indique otro):
- `401`: `{ error, message }` — sin token / invalido / expirado.
- `403`: `{ error: 'Sin permisos', message: 'No tiene permisos para realizar esta accion' }`.
- `400` (validacion de express-validator): `{ error: 'Datos invalidos', message: 'Error de validacion en los datos enviados', details: [{field, message, value}] }`.
- Errores de servicio con `status` propio (404/400/403/409): `{ error, message }`.

### 4.1 Autenticacion (`/api/auth`) — publico, con `authLimiter` en register/login

| Metodo y ruta | Body | Respuesta exitosa | Errores |
|---|---|---|---|
| `POST /register` | `nombre, apellido, email, password, telefono?, fecha_nacimiento?` | `201` `{ message: 'Registro exitoso. Por favor verifique su email para iniciar sesion.', user: {...} }` | `400` invalido; `409` email duplicado |
| `POST /login` | `email` o `username`, `password` | `200` `{ message: 'Inicio de sesion exitoso', user, token, refreshToken }` | `401` credenciales invalidas; `403` email no verificado (solo paciente) |
| `POST /verify-email` | `token` | `200` `{ message: 'Email verificado exitosamente' }` | `400` token invalido/expirado |
| `POST /refresh-token` | `refreshToken` | `200` `{ token }` | `401` refresh token invalido/expirado |

### 4.2 Pacientes (`/api/pacientes`) — requiere `auth`

| Metodo y ruta | Reglas de acceso | Notas |
|---|---|---|
| `GET /:id` | paciente solo el suyo | perfil sin `password_hash` |
| `PUT /:id` | `paciente` (el suyo) o `administrador` | actualiza nombre/apellido/telefono/fecha_nacimiento |
| `GET /:id/citas` | paciente solo el suyo | query `estado?`, `limit?`(20), `offset?`(0) |
| `GET /:id/ficha-clinica` | paciente (el suyo), o medico/administrador (cualquiera) | incluye `medico_nombre`, `especialidad` via join |

### 4.3 Medicos (`/api/medicos`) — requiere `auth`

| Metodo y ruta | Reglas de acceso | Notas |
|---|---|---|
| `GET /` | cualquier rol | query `especialidad_id?, estado?, limit?(20), offset?(0)` |
| `GET /especialidades` | cualquier rol | solo especialidades activas |
| `GET /:id` | cualquier rol | sin `password_hash` |
| `GET /:id/agenda?fecha=` | cualquier rol | agenda de la semana que contiene esa fecha |
| `PUT /:id/estado` | `administrador` | **duplica** `PATCH /admin/medicos/:id/estado`, pero **sin auditoria** |

### 4.4 Citas (`/api/citas`) — requiere `auth`

| Metodo y ruta | Rol | Respuesta / notas |
|---|---|---|
| `POST /` | `paciente` | `201`, crea en `CONFIRMADA`; ver reglas en §3.2 |
| `GET /medico?fecha=&estado=` | `medico` | citas del medico autenticado |
| `GET /:id` | cualquiera (dueno si es paciente) | `403` si paciente no es dueno |
| `PATCH /:id/cancelar` | `paciente` | dueno, `CONFIRMADA`, ≥2h de anticipacion |
| `PATCH /:id/completar` | `medico` | dueno, solo desde `CONFIRMADA` |
| `PATCH /:id/no-show` | `medico` (solo su cita) o `secretaria` (cualquiera) | solo desde `CONFIRMADA` |
| `PATCH /:id/reconsulta` | `secretaria` (exclusivo) | solo desde `NO_SHOW`; no crea cita nueva |
| `PATCH /:id/notas` | `medico` (dueno) o `administrador` | nota privada; `403` si el medico no es el tratante; nunca sale en `GET /pacientes/:id/citas` ni `GET /secretaria/citas` |

### 4.5 Agenda (`/api/agenda`) — requiere `auth`

| Metodo y ruta | Rol | Notas |
|---|---|---|
| `POST /` | `medico` | carga agenda propia, minimo 7 dias de anticipacion |
| `PUT /confirmar` | `medico` | confirma la semana cargada |
| `GET /last-config` | `medico` | ultima configuracion confirmada, para reutilizar |
| `GET /bloques-horarios` | `medico`, `administrador` | solo bloques activos y **no** de emergencia |
| `GET /disponibilidad?medico_id=&fecha=` | cualquiera | slots libres para agendar |
| `GET /:medicoId/semana/:fecha` | cualquiera | (nota: declarada despues de las rutas anteriores a proposito, por el orden de matching de Express) |
| `POST /admin-override` | `administrador` | carga agenda de cualquier medico, sin minimo de anticipacion, auto-confirmada |

### 4.6 Ficha Clinica (`/api/fichas-clinicas`) — requiere `auth`

| Metodo y ruta | Rol | Notas |
|---|---|---|
| `POST /` | `medico` | multipart, campo `documento` opcional; completa la cita |
| `GET /:pacienteId` | paciente (el suyo), medico/administrador (cualquiera) | incluye datos de medico/especialidad |
| `GET /:id/documentos` | paciente (dueno), medico/administrador | lista de adjuntos |
| `GET /:id/documentos/:docId/download` | paciente (dueno), medico/administrador (cualquiera) | descarga binaria; valida path traversal; requiere Bearer token (no sirve como `<a href>` directo) |
| `POST /:id/documentos` | `medico` (dueno de la ficha) | subir un adjunto adicional |

### 4.7 Administracion (`/api/admin`) — todo bajo `authorize('administrador')`

> Internamente dividido en 5 subrouters por dominio bajo
> `backend/src/routes/admin/` (citas, turnosDomingo, stats, medicos,
> especialidades) — cambio de organizacion de archivos, ninguna de las rutas
> publicas de esta tabla cambio.

| Metodo y ruta | Notas |
|---|---|
| `PATCH /citas/:id/cancelar` | cancela 1 cita puntual, notifica al paciente |
| `POST /turnos-domingo` | `{ fecha, medico_ids, bloque_horario_ids? }`; valida que `fecha` sea domingo |
| `GET /turnos-domingo` | lista asignaciones futuras agrupadas por medico+fecha |
| `DELETE /turnos-domingo/:id` | borra **todos** los bloques de ese medico+fecha (no solo la fila `:id`) |
| `GET /stats` | `{ doctors, todayCitas, porEstado[], ultimos7dias[] }` — agregado en esta version |
| `GET /medicos` | lista con `limit?(50), offset?(0)` |
| `PATCH /medicos/:id/estado` | con auditoria (`CAMBIAR_ESTADO_MEDICO`) |

### 4.8 Secretaria (`/api/secretaria`) — todo bajo `authorize('secretaria')`

| Metodo y ruta | Notas |
|---|---|
| `GET /citas?fecha=` | citas de una fecha |
| `PATCH /citas/:id/no-show` | sin restriccion de propiedad |
| `PATCH /citas/:id/reconsulta` | solo desde `NO_SHOW` |

### 4.9 Endpoints del v2 que NO existen en el codigo real

`GET /api/auditoria`, `GET /api/admin/medicos/sin-agenda`,
`GET/PATCH /api/notificaciones`, `POST /api/auth/recuperar-password`,
`POST /api/auth/reset-password`, cancelacion masiva de citas por medico. Se
documentan aqui solo para dejar constancia de que fueron **disenados pero
nunca construidos** — no se debe asumir que existen al integrar un cliente
nuevo contra esta API.

---

## 5. Flujos de Autenticacion y Autorizacion

### 5.1 Flujo de autenticacion JWT (real)

```
1. Cliente envia credenciales -> POST /api/auth/login
2. Backend busca el usuario por email en las 4 tablas de rol (en orden:
   paciente, medico, administrador, secretaria), o por username en
   medico/administrador/secretaria si se mando username
3. Si el rol es "paciente" y su email no esta verificado -> 403
4. Si las credenciales son validas: firma un access token JWT
   ({id, role, email}, secreto JWT_SECRET, expira JWT_EXPIRES_IN, default 24h)
   y un refresh token ({id, role}, secreto JWT_REFRESH_SECRET, expira
   JWT_REFRESH_EXPIRES_IN, default 7 dias)
5. Cliente guarda ambos (en localStorage en el frontend actual) y envia el
   access token en cada request: Authorization: Bearer <token>
6. Middleware `auth` verifica el token; distingue TokenExpiredError (401
   "Token expirado") de JsonWebTokenError (401 "Token invalido")
7. Middleware `authorize(...roles)` verifica que el rol del token este en la
   lista permitida para esa ruta (403 si no)
8. Para renovar el access token vencido: POST /api/auth/refresh-token con el
   refresh token (no rota el refresh token, solo emite un access token nuevo)
```

En **produccion**, `JWT_SECRET` y `JWT_REFRESH_SECRET` son obligatorios por
variable de entorno — la app falla al arrancar si faltan (no usa los defaults
de desarrollo).

### 5.2 Matriz de permisos por rol (real)

| Endpoint | Paciente | Medico | Admin | Secretaria |
|---|---|---|---|---|
| `POST /auth/register` | Publico | - | - | - |
| `POST /auth/login` | Publico | Publico | Publico | Publico |
| `POST /citas` | Si | - | - | - |
| `GET /citas/medico` | - | Si | - | - |
| `PATCH /citas/:id/cancelar` | Si (dueno) | - | - | - |
| `PATCH /citas/:id/completar` | - | Si (dueno) | - | - |
| `PATCH /citas/:id/no-show` | - | Si (dueno) | - | Si (cualquiera) |
| `PATCH /citas/:id/reconsulta` | - | - | - | Si (exclusivo) |
| `POST /agenda` | - | Si (propia) | - | - |
| `POST /agenda/admin-override` | - | - | Si | - |
| `POST /fichas-clinicas` | - | Si | - | - |
| `GET /pacientes/:id/ficha-clinica` | Si (la suya) | Si (cualquiera) | Si (cualquiera) | - |
| `PATCH /admin/citas/:id/cancelar` | - | - | Si | - |
| `PATCH /admin/medicos/:id/estado` | - | - | Si | - |
| `POST/GET/DELETE /admin/turnos-domingo` | - | - | Si | - |
| `GET /admin/stats` | - | - | Si | - |
| `GET/PATCH /secretaria/citas...` | - | - | - | Si |

### 5.3 Flujo de verificacion de email (solo pacientes)

```
1. Paciente se registra -> POST /api/auth/register
2. Backend genera un token JWT de proposito "email_verification" (expira 24h)
3. Backend intenta enviar un email con el enlace de verificacion
   (si no hay SMTP configurado, solo se loguea por consola)
4. Paciente hace clic en el enlace -> frontend llama POST /api/auth/verify-email
5. Backend valida purpose==='email_verification' y marca el paciente como
   verificado
6. Recien ahi el paciente puede hacer login (antes, login devuelve 403)
```

---

## 6. Estrategia de Manejo de Errores

### 6.1 Codigos HTTP usados realmente

| Codigo | Uso real observado |
|---|---|
| 200 | Operacion exitosa (GET, PATCH, PUT) |
| 201 | Recurso creado (POST) |
| 400 | Validacion fallida, regla de negocio no cumplida, estado invalido |
| 401 | Sin token, token invalido o expirado, credenciales invalidas |
| 403 | Rol sin permiso, o recurso ajeno (chequeo de propiedad) |
| 404 | Recurso no encontrado |
| 409 | Conflicto (email duplicado, horario ya ocupado) |
| 429 | Rate limit excedido |
| 500 | Error no controlado (middleware `errorHandler`) |

### 6.2 Formato de error estandar

```json
{
  "error": "Tipo de error",
  "message": "Descripcion legible",
  "details": [{ "field": "email", "message": "...", "value": "..." }]
}
```

`details` solo aparece en errores de validacion de `express-validator`; varias
rutas (`admin/turnos-domingo`, `agenda/disponibilidad`, `secretaria/citas`,
entre otras) usan checks manuales `if (!x) return res.status(400)...` en vez
de validators formales, y en esos casos la respuesta no trae `details`.

---

## 7. Medidas de Seguridad (numeros reales)

### 7.1 Autenticacion y contrasenas

- **bcrypt** con `saltRounds = 10` (no 12).
- Password de registro: minimo 8 caracteres, al menos 1 mayuscula y 1 numero
  (sin exigir simbolos). El login no revalida fortaleza, solo que no este vacia.
- JWT access token: `JWT_EXPIRES_IN` (default 24h). Refresh token: secreto
  distinto, `JWT_REFRESH_EXPIRES_IN` (default 7 dias), no rota al usarse.

### 7.2 Proteccion de endpoints

- **helmet** para cabeceras de seguridad, con Content-Security-Policy propia.
- **CORS**: origenes permitidos = `localhost:5173` + `FRONTEND_URL` (una o
  varias, separadas por coma) + cualquier subdominio `*.vercel.app` (para que
  funcionen tanto produccion como previews de Vercel sin reconfigurar).
- **Rate limiting real**:
  - General: ventana `RATE_LIMIT_WINDOW_MS` (default 15 min), maximo
    `RATE_LIMIT_MAX_REQUESTS` (default 100).
  - Auth (`register`, `login` unicamente): **10 intentos cada 15 minutos**
    (no aplica a `verify-email` ni `refresh-token`).
  - Deshabilitado por completo en `NODE_ENV=test`.

### 7.3 Validacion de datos (real)

| Campo | Validacion real |
|---|---|
| Email | formato valido, unico por tabla de rol |
| Telefono | solo digitos, 7 a 15 caracteres |
| Password (registro) | minimo 8, ≥1 mayuscula, ≥1 numero |
| Nombre/Apellido | solo letras y espacios (incluye tildes/enie) |
| Fecha de cita | no puede ser en el pasado |
| Hora de cita | formato `HH:MM` exacto (ver nota de bug abajo) |

> **Bug critico encontrado y corregido en esta version:** el frontend enviaba
> `hora_inicio` con formato `HH:MM:SS` (tal como lo devuelve Postgres desde
> `GET /agenda/disponibilidad`), pero el validador del backend exige `HH:MM`
> exacto. Esto hacia que **agendar una cita real desde la interfaz fallara
> siempre** con 400. Se corrigio truncando la hora a 5 caracteres antes de
> enviarla, y se verifico end-to-end en produccion.

### 7.4 Proteccion de archivos

- Tipos MIME permitidos: `image/jpeg`, `image/png`, `image/gif`,
  `application/pdf`, `image/dicom`.
- Tamano maximo: `MAX_FILE_SIZE`, default **5MB** (no 10MB).
- En Railway (serverless-like para el filesystem del contenedor), el
  directorio de subida usa `/tmp` cuando `process.env.VERCEL` esta seteado;
  de lo contrario `./uploads`. **`/tmp` es efimero** — no persiste entre
  reinicios del contenedor; para produccion real se recomienda migrar a
  almacenamiento de objetos (S3 / Vercel Blob).
- Descarga de documentos valida que la ruta resuelta este dentro de
  `uploadDir` (proteccion contra path traversal), y sanitiza el nombre de
  archivo en `Content-Disposition`.

### 7.5 Auditoria de seguridad

Ver seccion 3.6. Se registran acciones administrativas y de cambio de estado
de citas/medicos; **no** se auditan login, registro, verificacion de email,
refresh de token, ni la actualizacion de datos de un paciente.

---

## 8. Estructura del Proyecto (real)

```
gestionClinica-app/
├── Dockerfile                    # build del backend (raiz, monorepo)
├── railway.json                  # config de build/deploy en Railway
├── .dockerignore
├── docs/
│   ├── SDD-v3.md, DBD-v3.md, BDD-v2.md, Diagramas-v2.md   (este set)
│   ├── SDD-v2.md, DBD-v2.md, BDD.md, Diagramas.md         (historial)
│   ├── DESPLIEGUE.md             # guia paso a paso (Neon+Vercel, alternativa)
│   └── GUION_DEMO.md             # guion de demostracion por rol
├── backend/
│   ├── src/
│   │   ├── index.js              # entry point (no hace app.listen si es
│   │   │                         #   importado por un runtime serverless)
│   │   ├── config/ (database.js, env.js)
│   │   ├── middleware/ (auth, authorize, errorHandler, rateLimiter, validate)
│   │   ├── models/ (Paciente, Medico, Administrador, Secretaria, Cita,
│   │   │            AgendaMedico, Especialidad, FichaClinica, AuditLog)
│   │   ├── routes/ (auth, pacientes, medicos, citas, agenda, fichaClinica,
│   │   │            admin, secretaria).routes.js
│   │   │   └── admin/ (citas, turnosDomingo, stats, medicos,
│   │   │               especialidades).routes.js — subrouters de /api/admin
│   │   ├── services/ (appointmentService, scheduleService, authService,
│   │   │              auditService, notificationService)
│   │   ├── utils/sanitizeCita.js  # oculta `citas.notas` en respuestas a
│   │   │                          #   paciente/secretaria
│   │   └── validators/ (uno por recurso)
│   ├── database/migrations/ (001 a 008, ver DBD-v3)
│   ├── scripts/
│   │   ├── migrate.js            # corre las migraciones, idempotente
│   │   └── seed.js                # usuarios demo + agenda + cita de hoy
│   └── tests/ (uno por recurso, 8 archivos — 138 tests, Jest)
├── .github/workflows/ci.yml      # tests backend + build/lint frontend
└── frontend/
    ├── index.html                 # script inline anti-flash de tema
    └── src/
        ├── App.jsx                # arbol de rutas completo
        ├── main.jsx
        ├── index.css               # sistema de diseno completo (tokens,
        │                          #   tema oscuro, animaciones, clases .badge-*)
        ├── config/api.js          # cliente Axios + interceptor JWT
        ├── context/ (AuthContext, ThemeContext)
        ├── utils/ (citaStatus.js — clase de badge por estado de cita;
        │           citaTiming.js — calculo de "cita proxima" para alertas)
        ├── components/
        │   ├── Layout/ (Header, Sidebar, Footer, index/Layout)
        │   ├── ProtectedRoute.jsx
        │   ├── CommandPalette.jsx  # Ctrl+K
        │   ├── charts/ (StatusBreakdownBar, WeeklyTrendChart)
        │   └── illustrations/ (EmptyState.jsx)
        └── pages/
            ├── Login.jsx, Register.jsx, Unauthorized.jsx
            ├── patient/ (Dashboard, MyAppointments, MedicalRecord, Profile,
            │             BookAppointment/ — hook + subcomponentes)
            ├── doctor/ (Dashboard, Schedule, AttendPatient)
            ├── admin/ (Dashboard, SundayShifts, ManageDoctors/ y
            │           ManageSpecialties/ — cada una dividida en
            │           index + form + tabla)
            └── secretary/ (Dashboard)
```

No existen carpetas `controllers/` ni `utils/logger.js` como sugeria el v2 —
la logica de ruta vive directamente en `routes/*.js`, apoyada en `services/`.
`utils/` si existe (backend y frontend), pero para helpers puntuales
(sanitizado de notas privadas, clases de badge, calculo de alertas), no como
capa generica de logging.

---

## 9. Despliegue real

- **Backend**: contenedor Docker (Dockerfile en la raiz del repo, porque es un
  monorepo sin `package.json` en la raiz) desplegado en **Railway**, junto con
  una instancia de **PostgreSQL** en el mismo proyecto Railway.
- **Frontend**: build estatico de Vite desplegado en **Vercel**, apuntando al
  backend via la variable `VITE_API_URL`.
- **Migraciones**: `npm run migrate` (`backend/scripts/migrate.js`), corridas
  manualmente desde la consola de Railway; idempotente via tabla
  `schema_migrations`.
- **Datos de demo**: `npm run seed` (`backend/scripts/seed.js`), crea un
  usuario por rol y agenda de ejemplo.
- **Health check real**: `GET /api/health` -> `{ status: 'ok', timestamp,
  environment }`.
- **CI/CD implicito**: cada `git push` a `main` dispara un redeploy automatico
  tanto en Railway (backend) como en Vercel (frontend).
- Guia paso a paso completa (incluyendo una ruta alternativa con Neon en vez
  de Postgres de Railway): **`docs/DESPLIEGUE.md`**.

---

## 10. Arquitectura del Frontend (seccion nueva — no existia en el v2)

### 10.1 Arbol de rutas

Todas las rutas cuelgan de un unico `<Route element={<Layout />}>`
(`App.jsx`). El home `/` no es una pagina propia: redirige segun el rol del
usuario autenticado (o a `/login` si no hay sesion). Las rutas publicas
(`/login`, `/register`) usan un wrapper `PublicOnly` que redirige al
dashboard del rol si ya hay sesion activa.

| Rol | Rutas |
|---|---|
| Paciente | `/paciente`, `/paciente/agendar`, `/paciente/mis-citas`, `/paciente/ficha-clinica`, `/paciente/perfil` |
| Medico | `/medico`, `/medico/agenda`, `/medico/atender` |
| Administrador | `/admin`, `/admin/medicos`, `/admin/turnos-domingo` |
| Secretaria | `/secretaria` |

`ProtectedRoute` controla el acceso por rol a nivel de UI (no reemplaza la
autorizacion real del backend): si no hay sesion redirige a `/login`; si el
rol no esta permitido, a `/unauthorized`.

### 10.2 Estado global

- **`AuthContext`**: `user`, `loading`, `login`, `register`, `logout`,
  `updateUser` (merge parcial, para reflejar ediciones de perfil al instante
  sin recargar), `isAuthenticated`. Persiste `token`+`user` en `localStorage`;
  no valida expiracion del token en el cliente.
- **`ThemeContext`**: `theme` (`'light'|'dark'`), `toggleTheme`. Un script
  inline en `index.html` fija `data-theme` en `<html>` **antes** del primer
  paint (leyendo `localStorage` o `prefers-color-scheme` del sistema) para
  evitar parpadeo de tema incorrecto; el contexto de React solo se sincroniza
  con ese valor ya fijado.

### 10.3 Sistema de diseno (`index.css`)

Tokens de color (marca, neutros, semanticos) redefinidos completos bajo
`[data-theme='dark']` — todos los componentes los heredan automaticamente sin
tener que duplicar estilos por tema. Incluye tokens de radio/sombra,
tipografia (Inter), y microinteracciones: transicion suave al cambiar de
tema, feedback tactil en botones, foco de teclado visible
(`:focus-visible`), animacion de entrada de vista, animacion de "check"
dibujandose (confirmaciones), entrada de alertas, apertura del command
palette. Todas las animaciones respetan `prefers-reduced-motion`. Responsive:
la sidebar y la navegacion de escritorio colapsan a un menu movil por debajo
de 860px de ancho.

### 10.4 Componentes reutilizables nuevos

- **`CommandPalette`**: paleta de comandos estilo Linear/Notion, `Ctrl/Cmd+K`
  para abrir/cerrar (tambien un boton visible en el header). Filtra en vivo
  las paginas del rol actual mas comandos de accion (cambiar tema, cerrar
  sesion); navegable con teclado (flechas + Enter) o mouse.
- **`components/charts/`**: `StatusBreakdownBar` (barra apilada horizontal,
  distribucion de citas por estado, colores fijos por estado) y
  `WeeklyTrendChart` (linea de una sola serie, tendencia de 7 dias, con
  tooltip interactivo). Usados en los 4 dashboards, alimentados por
  `GET /admin/stats` (admin) o calculados en el cliente a partir de las citas
  ya cargadas (medico, secretaria, paciente).
- **`components/illustrations/EmptyState.jsx`**: ilustraciones SVG inline
  propias (sin assets externos) para estados vacios (`EmptyCalendar`,
  `EmptyFolder`, `EmptyClipboard`, `EmptyPeople`) y para el momento de exito
  al agendar (`SuccessBurst`, con animacion de check dibujandose).

### 10.5 Paginas divididas en hook/subcomponentes

Las 3 paginas mas grandes (`ManageDoctors`, `ManageSpecialties`,
`BookAppointment`) pasaron de un archivo monolitico a una carpeta con
`index.jsx` (orquestacion: estado, efectos, handlers) + un componente por
formulario/tabla +, en `BookAppointment`, un hook propio
(`useAppointmentWizard`) para los 3 fetches encadenados del wizard. Sin
cambio de comportamiento, solo de organizacion — verificado en vivo pagina
por pagina, no con tests (el frontend sigue sin suite de tests).

### 10.6 Alertas y datos enriquecidos (agosto 2026)

- `utils/citaStatus.js`: antes cada dashboard (paciente, medico, secretaria)
  tenia su propio objeto `statusColors` **copiado identico**, con estilo
  inline. Ahora es una sola fuente de verdad (clases `.badge-*` en
  `index.css`); el helper solo arma el nombre de clase a partir del enum.
- `utils/citaTiming.js`: calcula si hay una cita `CONFIRMADA` dentro de una
  ventana de horas (24h paciente, 2h medico) sobre los datos ya cargados —
  la base de la alerta de §3.5.
- `AttendPatient.jsx` ahora tambien consume `GET /fichas-clinicas/:pacienteId`
  (historial) y `PATCH /citas/:id/notas` (nota privada), ademas del flujo de
  creacion de ficha que ya tenia.
- `MedicalRecord.jsx` ahora hace un fetch adicional por atencion a
  `GET /fichas-clinicas/:id/documentos` (el endpoint de historial no trae los
  documentos embebidos) y descarga via blob autenticado con Axios.
