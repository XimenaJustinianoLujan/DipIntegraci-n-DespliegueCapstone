# Diagramas de Secuencia y Flujo v2 (fiel al codigo)

## Plataforma de Citas Medicas (JOX)

**Version:** 2.0
**Fecha:** Agosto 2026
**Formato:** ASCII/Texto

---

## Nota de version: por que existe un v2

El **v1** (Agosto 2024) acertaba en la secuencia general de la mayoria de los
flujos, pero: (a) usaba **paths de endpoint que no existen** (ej.
`/api/auth/registro`, `/api/fichas`, `/api/admin/citas/:id/cancelar-emergencia`),
(b) incluia un paso de verificacion de **DNI** que no existe, y (c) tenia
**dos diagramas completos que describen funcionalidad que nunca se
construyo** (generacion automatica de username de medico, y el flujo de
"atencion sin cita previa" de emergencias dominicales). Este v2 corrige los
paths, quita lo que no existe, y marca claramente lo que quedo solo como
diseno.

| # | Cambio |
|---|---|
| 1 | Todos los paths de endpoint corregidos a los reales (`/register` no `/registro`, `/fichas-clinicas` no `/fichas`, `/admin/citas/:id/cancelar` no `.../cancelar-emergencia`, `/agenda/last-config` no `.../ultima-config`, etc.) |
| 2 | Diagrama 1 (registro): se quito el paso de verificar DNI (ese campo no existe) |
| 3 | Diagrama 6 (emergencia dominical): reescrito — no existe tabla `turnos_domingo` ni endpoint `GET /agenda/domingos/turno`; los turnos se modelan como filas de `agenda_medico`. Se marca explicitamente que **el flujo de "atencion sin cita previa" no esta implementado**: no hay forma de crear una ficha clinica sin una cita `CONFIRMADA` previa (la FK `ficha_clinica.cita_id` es `NOT NULL`) |
| 4 | Diagrama 7 (generacion de username): **eliminado como flujo del sistema**, reemplazado por una nota — esa logica nunca se implemento; los usernames de medico/admin/secretaria se asignan manualmente al crear la cuenta |
| 5 | Diagrama 8 (estados de cita): corregido — `RECONSULTA` **no genera una cita nueva**; es un estado terminal sobre la misma fila |
| 6 | Diagrama 2 (agendar cita): se agrego el paso real de normalizacion de `hora_inicio` (bug critico corregido en esta version — ver nota en el diagrama) |

---

## 1. Flujo de Registro de Paciente

```
┌─────────┐          ┌─────────┐          ┌──────────┐         ┌──────────┐
│ Paciente│          │ Frontend│          │  Backend │         │   BD     │
└────┬────┘          └────┬────┘          └────┬─────┘         └────┬─────┘
     │                    │                    │                     │
     │  1. Completa form  │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 2. POST /api/auth/ │                     │
     │                    │    register        │                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 3. Validar datos    │
     │                    │                    │    (express-        │
     │                    │                    │    validator)       │
     │                    │                    │──────┐              │
     │                    │                    │      │              │
     │                    │                    │<─────┘              │
     │                    │                    │                     │
     │                    │                    │ 4. Verificar email  │
     │                    │                    │    unico            │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 5. SELECT email     │
     │                    │                    │<────────────────────│
     │                    │                    │                     │
     │                    │                    │ 6. Hash password    │
     │                    │                    │    (bcrypt, 10      │
     │                    │                    │    salt rounds)     │
     │                    │                    │──────┐              │
     │                    │                    │      │              │
     │                    │                    │<─────┘              │
     │                    │                    │                     │
     │                    │                    │ 7. INSERT paciente  │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 8. OK               │
     │                    │                    │<────────────────────│
     │                    │                    │                     │
     │                    │                    │ 9. Generar token JWT│
     │                    │                    │    proposito=       │
     │                    │                    │    email_verification│
     │                    │                    │    (expira 24h)     │
     │                    │                    │──────┐              │
     │                    │                    │      │              │
     │                    │                    │<─────┘              │
     │                    │                    │                     │
     │                    │                    │───┐ 10. Intentar    │
     │                    │                    │   │  enviar email   │
     │                    │                    │<──┘  (si no hay SMTP│
     │                    │                    │      configurado,   │
     │                    │                    │      solo se loguea)│
     │                    │                    │                     │
     │                    │ 11. 201 Created    │                     │
     │                    │<───────────────────│                     │
     │                    │                    │                     │
     │ 12. "Registro      │                    │                     │
     │   exitoso. Verif.  │                    │                     │
     │   su email..."     │                    │                     │
     │<───────────────────│                    │                     │
     │                    │                    │                     │
     │ 13. Clic en enlace │                    │                     │
     │    de email        │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 14. POST /api/auth/│                     │
     │                    │     verify-email   │                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 15. UPDATE paciente │
     │                    │                    │     email_verificado│
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │ 16. 200 OK         │                     │
     │                    │<───────────────────│                     │
     │                    │                    │                     │
     │ 17. "Email         │                    │                     │
     │    verificado"     │                    │                     │
     │<───────────────────│                    │                     │
```

---

## 2. Flujo de Agendamiento de Cita

```
┌─────────┐          ┌─────────┐          ┌──────────┐         ┌──────────┐      ┌───────┐
│ Paciente│          │ Frontend│          │  Backend │         │   BD     │      │ Email │
└────┬────┘          └────┬────┘          └────┬─────┘         └────┬─────┘      └───┬───┘
     │                    │                    │                     │                 │
     │ 1. Selecciona      │                    │                     │                 │
     │   especialidad     │                    │                     │                 │
     │───────────────────>│                    │                     │                 │
     │                    │                    │                     │                 │
     │                    │ 2. GET /api/medicos│                     │                 │
     │                    │  ?especialidad_id=X│                     │                 │
     │                    │───────────────────>│                     │                 │
     │                    │<───────────────────│                     │                 │
     │ 3. Selecciona medico y fecha            │                     │                 │
     │───────────────────>│                    │                     │                 │
     │                    │                    │                     │                 │
     │                    │ 4. GET /api/agenda/│                     │                 │
     │                    │    disponibilidad  │                     │                 │
     │                    │    ?medico_id=&fecha=                    │                 │
     │                    │───────────────────>│                     │                 │
     │                    │                    │                     │                 │
     │                    │                    │ 5. Consultar agenda │                 │
     │                    │                    │    (disponible=TRUE,│                 │
     │                    │                    │    sin cita activa) │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 6. Slots libres     │                 │
     │                    │                    │    (HH:MM:SS, formato TIME de Postgres)│
     │                    │                    │<────────────────────│                 │
     │                    │                    │                     │                 │
     │                    │ 7. Lista de        │                     │                 │
     │                    │    horarios        │                     │                 │
     │                    │<───────────────────│                     │                 │
     │                    │                    │                     │                 │
     │ 8. Selecciona horario                   │                     │                 │
     │───────────────────>│                    │                     │                 │
     │                    │                    │                     │                 │
     │                    │ *** BUG CRITICO CORREGIDO EN ESTA VERSION ***             │
     │                    │ El frontend normaliza hora_inicio a "HH:MM"               │
     │                    │ (slice a 5 caracteres) ANTES de enviarlo, porque          │
     │                    │ el validador del backend exige ese formato exacto y       │
     │                    │ el paso 6 devuelve "HH:MM:SS". Sin este paso, TODA        │
     │                    │ reserva real fallaba con 400 "Error de validacion".       │
     │                    │                    │                     │                 │
     │                    │ 9. POST /api/citas │                     │                 │
     │                    │   {medico_id,      │                     │                 │
     │                    │    especialidad_id,│                     │                 │
     │                    │    fecha,          │                     │                 │
     │                    │    hora_inicio}    │                     │                 │
     │                    │───────────────────>│                     │                 │
     │                    │                    │                     │                 │
     │                    │                    │ 10. Validar reglas: │                 │
     │                    │                    │ - Medico ACTIVO     │                 │
     │                    │                    │ - Max 3 citas       │                 │
     │                    │                    │   activas           │                 │
     │                    │                    │ - No misma espec./  │                 │
     │                    │                    │   mismo medico      │                 │
     │                    │                    │ - 24h anticipacion  │                 │
     │                    │                    │   (o slot libre)    │                 │
     │                    │                    │ - Slot en agenda    │                 │
     │                    │                    │   y no ocupado      │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 11. Validaciones OK │                 │
     │                    │                    │<────────────────────│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 12. INSERT cita     │                 │
     │                    │                    │     estado=CONFIRMADA                 │
     │                    │                    │     hora_fin=hora_inicio+1h            │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 13. Cita creada     │                 │
     │                    │                    │<────────────────────│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 14. Intentar email  │                 │
     │                    │                    │    confirmacion     │                 │
     │                    │                    │────────────────────────────────────>│
     │                    │                    │                     │                 │
     │                    │                    │ 15. Registrar en    │                 │
     │                    │                    │     audit_log       │                 │
     │                    │                    │     (CREAR_CITA)    │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │ 16. 201 Cita       │                     │                 │
     │                    │     confirmada     │                     │                 │
     │                    │<───────────────────│                     │                 │
     │                    │                    │                     │                 │
     │ 17. Panel de exito │                    │                     │                 │
     │   (SuccessBurst) y │                    │                     │                 │
     │   redireccion a    │                    │                     │                 │
     │   "Mis Citas"      │                    │                     │                 │
     │<───────────────────│                    │                     │                 │
```

---

## 3. Flujo de Carga de Agenda del Medico

```
┌─────────┐          ┌─────────┐          ┌──────────┐         ┌──────────┐
│  Medico │          │ Frontend│          │  Backend │         │   BD     │
└────┬────┘          └────┬────┘          └────┬─────┘         └────┬─────┘
     │                    │                    │                     │
     │ 1. Accede a        │                    │                     │
     │   "Mi Agenda"      │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 2. GET /api/agenda/│                     │
     │                    │    last-config      │                    │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 3. Buscar bloques   │
     │                    │                    │    de la ultima     │
     │                    │                    │    semana confirmada│
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 4. Ultima config    │
     │                    │                    │<────────────────────│
     │                    │                    │                     │
     │                    │ 5. Grilla propuesta│                     │
     │                    │<───────────────────│                     │
     │                    │                    │                     │
     │ 6. Marca/desmarca bloques en la grilla  │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 7. POST /api/agenda│                     │
     │                    │  {fecha_inicio,    │                     │
     │                    │   bloques[]}       │                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 8. Validar: fecha_  │
     │                    │                    │   inicio >= hoy+7d  │
     │                    │                    │──────┐              │
     │                    │                    │      │              │
     │                    │                    │<─────┘              │
     │                    │                    │                     │
     │                    │                    │ 9. UPSERT filas de  │
     │                    │                    │    agenda_medico    │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 10. Audit log       │
     │                    │                    │    (CARGAR_AGENDA)  │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │ 11. 201 Agenda     │                     │
     │                    │    cargada         │                     │
     │                    │<───────────────────│                     │
     │                    │                    │                     │
     │                    │ 12. PUT /api/agenda│                     │
     │                    │    /confirmar      │                     │
     │                    │    {semana_fecha}  │                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 13. UPDATE          │
     │                    │                    │    confirmado=TRUE  │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │ 14. 200 Confirmada │                     │
     │                    │<───────────────────│                     │
```

**Camino alternativo — admin-override** (medico no cumplio el plazo):

```
Admin ──> POST /api/agenda/admin-override {medico_id, fecha_inicio, bloques[]}
     └──> Backend NO valida el minimo de 7 dias, crea la agenda y la
          auto-confirma en el mismo paso (Cita.confirmarSemana inmediato)
     └──> Audit log: ADMIN_CARGAR_AGENDA
```

---

## 4. Flujo de Completar Cita (Ficha Clinica)

```
┌─────────┐          ┌─────────┐          ┌──────────┐         ┌──────────┐
│  Medico │          │ Frontend│          │  Backend │         │   BD     │
└────┬────┘          └────┬────┘          └────┬─────┘         └────┬─────┘
     │                    │                    │                     │
     │ 1. Abre "Atender   │                    │                     │
     │   Paciente"        │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 2. GET /api/citas/ │                     │
     │                    │    medico?fecha=&  │                     │
     │                    │    estado=CONFIRMADA                     │
     │                    │───────────────────>│                     │
     │                    │<───────────────────│                     │
     │                    │                    │                     │
     │ 3. Selecciona una cita de la lista      │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │ 4. Completa form:  │                    │                     │
     │  - diagnostico *   │                    │                     │
     │  - indicaciones    │                    │                     │
     │  - receta          │                    │                     │
     │  - (opcional) archivo                   │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 5. POST /api/fichas│                     │
     │                    │  -clinicas         │                     │
     │                    │  (multipart)       │                     │
     │                    │  {cita_id,         │                     │
     │                    │   diagnostico, ...}│                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 6. Verificar: cita  │
     │                    │                    │   es del medico y   │
     │                    │                    │   esta CONFIRMADA   │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 7. paciente_id se   │
     │                    │                    │   toma de la cita   │
     │                    │                    │   (no del body)     │
     │                    │                    │──────┐              │
     │                    │                    │<─────┘              │
     │                    │                    │                     │
     │                    │                    │ 8. INSERT ficha     │
     │                    │                    │    _clinica         │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 9. (si vino archivo)│
     │                    │                    │   guardar en disco  │
     │                    │                    │   + INSERT          │
     │                    │                    │   documentos_       │
     │                    │                    │   adjuntos          │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 10. UPDATE cita     │
     │                    │                    │   estado=COMPLETADA │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │ 11. 201 Ficha      │                     │
     │                    │    guardada, cita  │                     │
     │                    │    completada      │                     │
     │                    │<───────────────────│                     │
```

---

## 5. Flujo de Cancelacion por Admin con Notificacion

```
┌─────────┐          ┌─────────┐          ┌──────────┐         ┌──────────┐      ┌───────┐
│  Admin  │          │ Frontend│          │  Backend │         │   BD     │      │ Email │
└────┬────┘          └────┬────┘          └────┬─────┘         └────┬─────┘      └───┬───┘
     │                    │                    │                     │                 │
     │ 1. Selecciona cita │                    │                     │                 │
     │   a cancelar       │                    │                     │                 │
     │───────────────────>│                    │                     │                 │
     │                    │                    │                     │                 │
     │                    │ 2. PATCH /api/admin│                     │                 │
     │                    │  /citas/:id/cancelar                     │                 │
     │                    │  {motivo_cancelacion?}                   │                 │
     │                    │───────────────────>│                     │                 │
     │                    │                    │                     │                 │
     │                    │                    │ 3. Verificar que la │                 │
     │                    │                    │   cita no este ya   │                 │
     │                    │                    │   CANCELADA/        │                 │
     │                    │                    │   COMPLETADA        │                 │
     │                    │                    │──────┐              │                 │
     │                    │                    │<─────┘              │                 │
     │                    │                    │                     │                 │
     │                    │                    │ 4. UPDATE cita      │                 │
     │                    │                    │   estado=CANCELADA  │                 │
     │                    │                    │   cancelado_por=    │                 │
     │                    │                    │   admin_id,         │                 │
     │                    │                    │   cancelado_por_rol=│                 │
     │                    │                    │   'administrador'   │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 5. Audit log        │                 │
     │                    │                    │   (CANCELAR_CITA_   │                 │
     │                    │                    │    ADMIN)           │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 6. Intentar enviar  │                 │
     │                    │                    │    email al paciente│                 │
     │                    │                    │    (si no hay SMTP, │                 │
     │                    │                    │    solo se loguea;  │                 │
     │                    │                    │    NO revierte la   │                 │
     │                    │                    │    cancelacion)     │                 │
     │                    │                    │────────────────────────────────────>│
     │                    │                    │                     │                 │
     │                    │ 7. 200 Cita        │                     │                 │
     │                    │    cancelada       │                     │                 │
     │                    │<───────────────────│                     │                 │
```

---

## 6. Flujo de Turnos de Domingo (emergencias)

```
┌─────────┐          ┌─────────┐          ┌──────────┐         ┌──────────┐
│  Admin  │          │ Frontend│          │  Backend │         │   BD     │
└────┬────┘          └────┬────┘          └────┬─────┘         └────┬─────┘
     │                    │                    │                     │
     │ 1. Elige medico(s) │                    │                     │
     │   y fecha (domingo)│                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 2. POST /api/admin/│                     │
     │                    │  turnos-domingo    │                     │
     │                    │  {fecha,           │                     │
     │                    │   medico_ids[]}    │                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 3. Validar que      │
     │                    │                    │   fecha sea domingo │
     │                    │                    │──────┐              │
     │                    │                    │<─────┘              │
     │                    │                    │                     │
     │                    │                    │ 4. Buscar bloques   │
     │                    │                    │   de emergencia del │
     │                    │                    │   domingo (dia_     │
     │                    │                    │   semana=7,         │
     │                    │                    │   es_emergencia=TRUE)│
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 5. INSERT filas en  │
     │                    │                    │   agenda_medico por │
     │                    │                    │   cada medico x     │
     │                    │                    │   bloque (NO existe │
     │                    │                    │   tabla propia      │
     │                    │                    │   "turnos_domingo") │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 6. Auto-confirmar   │
     │                    │                    │   esos bloques      │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 7. Audit log        │
     │                    │                    │   (ASIGNAR_TURNO_   │
     │                    │                    │    DOMINGO)         │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │ 8. 201 Medicos     │                     │
     │                    │    asignados       │                     │
     │                    │<───────────────────│                     │
```

**Consultar y remover asignaciones** (endpoints agregados en esta version):

```
GET /api/admin/turnos-domingo    -> lista futuras, agrupadas por medico+fecha
DELETE /api/admin/turnos-domingo/:id -> borra TODOS los bloques de ese
                                        medico+fecha (no solo la fila :id)
```

> ### Gap real: no hay flujo de "atencion sin cita previa"
>
> El v1 dibujaba un flujo donde el paciente llega el domingo, el sistema
> consulta "el medico de turno" via API, y el medico registra la atencion
> directamente sin cita previa (`POST /api/fichas {tipo: emergencia}`).
> **Nada de eso existe en el codigo real.** No hay endpoint publico para
> consultar "quien esta de turno hoy", y **`ficha_clinica.cita_id` es
> `NOT NULL`** — es imposible crear una ficha clinica sin una cita
> `CONFIRMADA` previa asociada. En el sistema actual, un paciente de
> emergencia dominical tecnicamente necesitaria que alguien le cree una
> cita normal contra uno de los bloques de emergencia ya asignados, antes
> de que el medico pueda registrar su atencion. Esto es una brecha real
> entre lo que el negocio probablemente espera (atencion inmediata sin
> tramite) y lo que el sistema soporta hoy.

---

## 7. Generacion de Username de Medico — no implementado

El v1 documentaba un algoritmo completo de generacion automatica de username
para medicos (primera letra del nombre + apellido, con reglas de
desambiguacion). **Esa logica no existe en ningun lugar del codigo.** No hay
endpoint de auto-registro para medicos: las cuentas de medico (igual que
administrador y secretaria) se crean manualmente, hoy via
`backend/scripts/seed.js`, con un `username` fijo elegido a mano (ej.
`dr.garcia`). Si en el futuro se agrega un flujo de alta de medicos desde el
panel de administracion, ese seria el lugar natural para implementar (o no)
la generacion automatica que el v1 imaginaba.

---

## 8. Flujo de Estados de Cita (Diagrama de Transicion)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MAQUINA DE ESTADOS - CITA                            │
└─────────────────────────────────────────────────────────────────────────────┘

                         Paciente agenda cita
                               │
                               v
                    ┌─────────────────────┐
                    │                     │
                    │     CONFIRMADA      │ <-- Estado inicial (unico enum
                    │                     │     real, no existe "PENDIENTE")
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────────┐
              │                │                    │
              │ Medico guarda  │ Paciente (>=2h, la │ Medico (su cita) o
              │ ficha clinica  │ suya) o Admin       │ secretaria (cualquiera)
              │                │ (sin restriccion)   │ marca no presentado
              │                │ cancela             │
              v                v                    v
    ┌──────────────┐  ┌──────────────┐    ┌──────────────┐
    │              │  │              │    │              │
    │  COMPLETADA  │  │  CANCELADA   │    │   NO_SHOW    │
    │              │  │              │    │              │
    │  (terminal)  │  │  (terminal)  │    └──────┬───────┘
    └──────────────┘  └──────────────┘           │
                                                  │ Secretaria (unico rol
                                                  │ habilitado) marca
                                                  │ RECONSULTA
                                                  │
                                                  v
                                         ┌──────────────┐
                                         │              │
                                         │  RECONSULTA  │
                                         │              │
                                         │  (terminal — │
                                         │  NO genera   │
                                         │  ninguna cita│
                                         │  nueva)      │
                                         └──────────────┘

REGLAS REALES:
- CONFIRMADA --> COMPLETADA: solo el medico dueno, al guardar la ficha clinica
- CONFIRMADA --> CANCELADA: paciente dueno (>=2h de anticipacion) o
  administrador (sin restriccion de tiempo ni de propiedad)
- CONFIRMADA --> NO_SHOW: el medico solo en sus propias citas; la secretaria
  en cualquiera
- NO_SHOW --> RECONSULTA: exclusivo de secretaria
- Los 4 estados a los que se llega desde CONFIRMADA (COMPLETADA, CANCELADA,
  NO_SHOW->RECONSULTA) son terminales: ninguno tiene una transicion de salida
  en el codigo actual
- IMPORTANTE (corregido respecto al v1): RECONSULTA **no crea una cita
  nueva**. Es solo un cambio de estado sobre la misma fila. Si el paciente
  necesita una nueva atencion, debe agendarse una cita normal aparte, sin
  ningun vinculo formal con la cita en RECONSULTA.
```
