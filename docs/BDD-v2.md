# BDD v2 - Escenarios de Comportamiento (fiel al codigo)

## Plataforma de Citas Medicas (JOX)

**Version:** 2.0
**Fecha:** Agosto 2026
**Formato:** Gherkin (Espanol)
**Fuente:** codigo real de `backend/src` (rutas, validadores, servicios, middleware) — no el diseno original.

---

## Nota de version: por que existe un v2

El **BDD v1** (Agosto 2024) resulto estar **mayormente correcto** frente al codigo real
—a diferencia del SDD/DBD, que eran documentos de diseno previos a la implementacion—,
pero tenia varias escenarios que describen funcionalidad que **nunca se construyo**, y
algunos datos puntuales (campos, limites, mensajes) desactualizados. Este v2 corrige
eso.

### Funcionalidad que el v1 documentaba pero NO existe en el codigo

| # | El v1 describia | Realidad |
|---|---|---|
| 1 | Campo `dni` en el registro de paciente, con validacion de duplicado | **No existe.** `pacientes` no tiene columna de documento de identidad; el registro no lo pide. |
| 2 | `Reconsulta` crea **una cita nueva** que referencia a la original | **Falso.** `PATCH /citas/:id/reconsulta` solo cambia el `estado` de la **misma** cita a `RECONSULTA`. No se crea ninguna fila nueva ni existe una columna que vincule "cita original -> cita de reemplazo". El reagendamiento real requiere que el paciente/secretaria agende una cita aparte, sin vinculo formal con la anterior. |
| 3 | Admin puede **cancelar todas las citas de un medico** de una vez ("cancelar multiples citas") | **No existe.** `PATCH /api/admin/citas/:id/cancelar` cancela **una** cita a la vez, por `id`. No hay endpoint de cancelacion masiva. |
| 4 | `GET /api/admin/medicos/sin-agenda` (lista de medicos que no cargaron agenda) | **No existe** esa ruta en el codigo. El flujo de "admin carga agenda de un medico incumplido" si existe (`POST /api/agenda/admin-override`), pero no hay forma de *listar* automaticamente quienes incumplieron. |
| 5 | `GET /api/auditoria` (consulta de logs de auditoria via API, con filtros por fecha/entidad/usuario) | **No existe ninguna ruta** para leer `audit_log` por API. La tabla se escribe correctamente en cada accion relevante, pero no hay endpoint para consultarla — solo se podria ver con una consulta SQL directa. |
| 6 | Endpoint para **eliminar (soft delete) un paciente** | **No existe.** No hay `DELETE /api/pacientes/:id` en el codigo. La columna `deleted_at` existe en el esquema pero ningun endpoint real la usa para pacientes. |
| 7 | Validacion de que el medico asignado a un turno de domingo debe estar `ACTIVO` | **No existe.** `POST /api/admin/turnos-domingo` no valida el estado del medico antes de asignarlo. |
| 8 | Recordatorio de cita "24 horas antes" como **proceso automatico** | La **funcion** de envio existe (`NotificationService.sendAppointmentReminder`), pero **no hay ningun cron/scheduler** en el codigo que la dispare. Hoy nadie la invoca automaticamente — es codigo muerto a la espera de un disparador. |

### Datos puntuales corregidos

| Dato | v1 decia | Real |
|---|---|---|
| Estados de medico | minusculas (`activo`, `baja`, `vacacion`) | **MAYUSCULAS**: `ACTIVO`, `BAJA`, `VACACION` |
| Telefono (registro) | 8 a 15 digitos | **7 a 15 digitos** (`^\d{7,15}$`) |
| Rate limit de login | 5 intentos por minuto | **10 intentos cada 15 minutos** (`authLimiter`), y solo aplica a `register`/`login` (no a `verify-email` ni `refresh-token`) |
| Mensaje de exito de registro | "Registro exitoso. Verifique su email para activar la cuenta." | **"Registro exitoso. Por favor verifique su email para iniciar sesion."** (mensaje real devuelto al cliente) |
| Body de cambio de estado de medico | `{ estado, motivo }` | Solo **`{ estado }`** — el campo `motivo` no existe en el validador real y se ignora si se envia |

### Funcionalidad nueva no documentada en el v1 (agregada en este v2)

- `GET /api/admin/turnos-domingo` y `DELETE /api/admin/turnos-domingo/:id` (listar y remover asignaciones dominicales — antes solo existia el `POST`).
- `GET /api/admin/stats` (panel de administracion con metricas reales) — **este endpoint no existia en absoluto hasta esta version**: el panel de admin llamaba a una ruta que devolvia 404 silenciosamente y siempre mostraba "0" en todo, sin importar los datos reales.
- Existe una **ruta duplicada** para cambiar el estado de un medico: `PUT /api/medicos/:id/estado` (sin auditoria) y `PATCH /api/admin/medicos/:id/estado` (con auditoria). Ver escenario dedicado en la seccion 5.

### Actualizacion (agosto 2026), sin bump de version

Se agregaron escenarios de funcionalidad nueva sin reescribir el documento:
historial clinico visible al medico (§4), notas privadas por cita (§4),
descarga autenticada de documentos (§4), alerta de cita proxima en el
dashboard (§7, reemplaza en la practica al recordatorio por email que nunca
se disparaba), y un caso que faltaba en agendar cita: HOY debe poder
agendarse igual que cualquier otro dia (§2) — un bug real lo impedia hasta
ahora.

---

## 1. Modulo de Registro y Autenticacion

### Feature: Registro de Paciente

```gherkin
Caracteristica: Registro de paciente con verificacion de email
  Como paciente nuevo
  Quiero registrarme en la plataforma
  Para poder agendar citas medicas

  Escenario: Registro exitoso con datos validos
    Dado que no existe un paciente con email "juan@email.com"
    Cuando envio una solicitud de registro con:
      | nombre    | Juan            |
      | apellido  | Garcia          |
      | email     | juan@email.com  |
      | password  | MiPass123       |
      | telefono  | 1155667788      |
    Entonces recibo un codigo de estado 201
    Y recibo el mensaje "Registro exitoso. Por favor verifique su email para iniciar sesion."
    Y se intenta enviar un email de verificacion a "juan@email.com"
    Y si no hay SMTP configurado, el envio se omite y solo se registra en consola
      (el registro igual se completa con exito)

  Escenario: Registro fallido por email duplicado
    Dado que existe un paciente con email "juan@email.com"
    Cuando envio una solicitud de registro con email "juan@email.com"
    Entonces recibo un codigo de estado 409
    Y recibo el mensaje "El email ya esta registrado"

  Escenario: Registro fallido por contrasena debil
    Cuando envio una solicitud de registro con password "abc"
    Entonces recibo un codigo de estado 400
    Y recibo un error de validacion para el campo "password"
      (la regla real exige minimo 8 caracteres, al menos 1 mayuscula y 1 numero)

  Escenario: Registro fallido por email invalido
    Cuando envio una solicitud de registro con email "noesunmail"
    Entonces recibo un codigo de estado 400
    Y recibo un error de validacion para el campo "email"

  Escenario: Registro fallido por telefono invalido
    Cuando envio una solicitud de registro con telefono "abc123"
    Entonces recibo un codigo de estado 400
    Y recibo un error de validacion para el campo "telefono"
      (formato real: solo digitos, entre 7 y 15 caracteres)

  Escenario: Registro fallido por nombre con caracteres invalidos
    Cuando envio una solicitud de registro con nombre "Juan123"
    Entonces recibo un codigo de estado 400
    Y recibo un error de validacion para el campo "nombre"
      (solo se permiten letras y espacios, incluye tildes y enie)
```

> **Nota:** el registro **no** pide ni valida DNI/documento de identidad — ese campo
> no existe en el sistema.

### Feature: Verificacion de Email

```gherkin
Caracteristica: Verificacion de email de paciente
  Como paciente registrado
  Quiero verificar mi email
  Para poder iniciar sesion en la plataforma

  Escenario: Verificacion exitosa con token valido
    Dado que me registre con email "juan@email.com"
    Y recibi un token de verificacion valido (expira a las 24 horas)
    Cuando envio el token de verificacion
    Entonces recibo un codigo de estado 200
    Y recibo el mensaje "Email verificado exitosamente"
    Y mi email queda marcado como verificado
    Y ya puedo iniciar sesion

  Escenario: Verificacion fallida por token invalido o expirado
    Cuando envio un token de verificacion "token-inexistente" (o uno vencido)
    Entonces recibo un codigo de estado 400
    Y recibo el mensaje "Token de verificacion invalido o expirado"

  Escenario: Login sin verificar email
    Dado que me registre pero no verifique mi email
    Cuando intento iniciar sesion
    Entonces recibo un codigo de estado 403
    Y recibo el mensaje "Debe verificar su email antes de iniciar sesion"
```

> Esta verificacion **solo aplica al rol paciente**. Medico, administrador y
> secretaria no tienen ese requisito (sus cuentas se provisionan por seed/admin,
> no por auto-registro).

### Feature: Login

```gherkin
Caracteristica: Inicio de sesion
  Como usuario registrado (cualquier rol)
  Quiero iniciar sesion
  Para acceder a las funcionalidades de mi rol

  Escenario: Login exitoso de paciente con email
    Dado que soy un paciente con email verificado "juan@email.com"
    Cuando inicio sesion con email "juan@email.com" y mi password
    Entonces recibo un codigo de estado 200
    Y recibo un token de acceso y un refresh token
    Y el token contiene mi id, rol "paciente" y email

  Escenario: Login exitoso de medico/admin/secretaria con username
    Dado que soy medico con username "dr.garcia"
    Cuando inicio sesion con username "dr.garcia" y mi password
      (los pacientes no tienen username, solo email)
    Entonces recibo un codigo de estado 200
    Y recibo un token de acceso y un refresh token

  Escenario: Login fallido por credenciales incorrectas
    Cuando inicio sesion con email o username invalido, o password incorrecta
    Entonces recibo un codigo de estado 401
    Y recibo el mensaje "Credenciales invalidas"
      (el mismo mensaje generico se usa tanto si el usuario no existe como si
      la contrasena es incorrecta, para no filtrar cual de los dos fallo)

  Escenario: Login bloqueado por rate limiting
    Dado que realice 10 intentos de login en los ultimos 15 minutos
    Cuando intento iniciar sesion nuevamente
    Entonces recibo un codigo de estado 429 (limite de solicitudes)

  Escenario: Renovar token de acceso
    Dado que tengo un refresh token valido (vence a los 7 dias)
    Cuando lo envio a /api/auth/refresh-token
    Entonces recibo un codigo de estado 200
    Y recibo un nuevo token de acceso
      (el refresh token en si no se renueva, solo el token de acceso)
```

---

## 2. Modulo de Citas

### Feature: Agendar Cita

```gherkin
Caracteristica: Agendamiento de citas medicas
  Como paciente
  Quiero agendar una cita medica
  Para recibir atencion en la especialidad que necesito

  Escenario: Agendar cita exitosamente
    Dado que estoy autenticado como paciente
    Y no tengo citas activas (CONFIRMADA o RECONSULTA) que choquen
    Y el medico esta en estado ACTIVO
    Y existe un slot disponible en su agenda para la fecha/hora elegida
    Cuando agendo la cita
    Entonces recibo un codigo de estado 201
    Y la cita se crea con estado "CONFIRMADA"
    Y la hora_fin se calcula automaticamente como hora_inicio + 1 hora

  Escenario: Agendar cita fallida por maximo de citas activas
    Dado que estoy autenticado como paciente
    Y ya tengo 3 citas activas (CONFIRMADA/RECONSULTA)
    Cuando intento agendar una cuarta cita
    Entonces recibo un codigo de estado 400

  Escenario: Agendar cita fallida por especialidad duplicada
    Dado que tengo una cita activa en "Cardiologia"
    Cuando intento agendar otra cita en "Cardiologia"
    Entonces recibo un codigo de estado 400 (409 segun el caso)

  Escenario: Agendar cita fallida por medico duplicado
    Dado que tengo una cita activa con el Dr. Garcia
    Cuando intento agendar otra cita con el Dr. Garcia
    Entonces recibo un codigo de estado 400 (409 segun el caso)

  Escenario: Agendar cita fallida por medico no activo
    Dado que el medico elegido tiene estado "BAJA" o "VACACION"
    Cuando intento agendar una cita con el
    Entonces recibo un codigo de estado 400

  Escenario: Agendar cita fallida por menos de 24 horas de anticipacion
    Dado que la fecha/hora solicitada es dentro de las proximas 24 horas
    Y no hay un slot libre inmediato para ese horario
    Cuando intento agendar
    Entonces recibo un codigo de estado 400

  Escenario: Agendar con menos de 24h cuando hay un slot libre inmediato
    Dado que la fecha/hora solicitada es dentro de las proximas 24 horas
    Y el medico SI tiene ese slot cargado y disponible en su agenda
    Cuando intento agendar
    Entonces recibo un codigo de estado 201 (se permite la excepcion)

  Escenario: Agendar cita fallida por horario ya ocupado
    Dado que el medico ya tiene una cita no-cancelada en esa fecha/hora
    Cuando intento agendar en ese mismo horario
    Entonces recibo un codigo de estado 409

  Escenario: Agendar cita fallida por fecha en el pasado
    Cuando intento agendar una cita con fecha estrictamente anterior a hoy
    Entonces recibo un codigo de estado 400

  Escenario: Agendar cita para el mismo dia (hoy) cuando el medico tiene el horario libre
    Dado que la fecha solicitada es la de HOY
    Y el medico tiene ese horario disponible en su agenda
    Cuando intento agendar
    Entonces recibo un codigo de estado 201
    Y la fecha de hoy NO se rechaza como "en el pasado" solo por serlo
    # Bug real (agosto 2026): el validador comparaba la fecha elegida
    # (medianoche UTC) contra el timestamp completo de "ahora", asi que
    # HOY se rechazaba como pasado durante casi todo el dia. En la
    # practica un paciente solo podia agendar desde manana, nunca hoy.
```

### Feature: Cancelar Cita

```gherkin
Caracteristica: Cancelacion de citas
  Como paciente
  Quiero cancelar una cita
  Para liberar el horario si no puedo asistir

  Escenario: Cancelar cita exitosamente con mas de 2 horas de anticipacion
    Dado que estoy autenticado como paciente
    Y tengo una cita CONFIRMADA con mas de 2 horas hasta su hora_inicio
    Cuando cancelo mi cita
    Entonces recibo un codigo de estado 200
    Y la cita cambia a estado "CANCELADA"
    Y el horario queda libre para que otro paciente lo reserve

  Escenario: Cancelar cita fallida por menos de 2 horas de anticipacion
    Dado que a mi cita CONFIRMADA le faltan menos de 2 horas
    Cuando intento cancelarla
    Entonces recibo un codigo de estado 400

  Escenario: Cancelar cita que no pertenece al paciente
    Dado que la cita pertenece a otro paciente
    Cuando intento cancelarla
    Entonces recibo un codigo de estado 403

  Escenario: Intentar cancelar una cita que no esta CONFIRMADA
    Dado que la cita ya esta COMPLETADA, CANCELADA, NO_SHOW o RECONSULTA
    Cuando intento cancelarla
    Entonces recibo un codigo de estado 400
```

---

## 3. Modulo de Horarios/Agenda

### Feature: Carga de Agenda Medica

```gherkin
Caracteristica: Carga de agenda semanal del medico
  Como medico
  Quiero cargar mi agenda semanal
  Para que los pacientes puedan agendar citas conmigo

  Escenario: Cargar agenda con 1 semana de anticipacion
    Dado que estoy autenticado como medico
    Cuando cargo mi agenda para una fecha_inicio de al menos 7 dias en el futuro
    Entonces recibo un codigo de estado 201
    Y se crean/actualizan las filas de agenda_medico para esa semana

  Escenario: Cargar agenda sin anticipacion suficiente
    Dado que estoy autenticado como medico
    Cuando intento cargar mi agenda para una fecha_inicio a menos de 7 dias
    Entonces recibo un codigo de estado 400
    Y recibo el mensaje "La agenda debe cargarse con al menos 1 semana de anticipacion"

  Escenario: Consultar la ultima configuracion confirmada
    Dado que estoy autenticado como medico
    Y ya confirme una agenda en una semana anterior
    Cuando solicito mi ultima configuracion
    Entonces recibo un codigo de estado 200
    Y recibo los bloques (dia+hora) que tenia confirmados, para reutilizar

  Escenario: Confirmar la agenda de la semana
    Dado que estoy autenticado como medico
    Y ya cargue bloques para una semana
    Cuando confirmo esa semana
    Entonces recibo un codigo de estado 200
    Y esos bloques quedan marcados como confirmados

  Escenario: Admin carga agenda de un medico que no cumplio el plazo
    Dado que estoy autenticado como administrador
    Y el Dr. Garcia no cargo su propia agenda a tiempo
    Cuando cargo yo la agenda del Dr. Garcia (admin-override)
    Entonces recibo un codigo de estado 201
    Y la agenda queda creada y auto-confirmada de inmediato
      (a diferencia del medico, el admin NO esta sujeto al minimo de 7 dias)
    Y se registra en auditoria (ADMIN_CARGAR_AGENDA)
```

> No existe en el sistema una forma de **listar automaticamente** que medicos
> incumplieron el plazo — el admin necesita saber por otro medio (ej. reporte
> manual) a quien cargarle la agenda.

### Feature: Turnos de Domingo (emergencias)

```gherkin
Caracteristica: Asignacion de medicos para turno dominical
  Como administrador
  Quiero asignar medicos de turno para domingos
  Para cubrir emergencias sin cita previa

  Escenario: Asignar medicos de turno para un domingo
    Dado que estoy autenticado como administrador
    Y la fecha elegida cae en domingo
    Cuando asigno una lista de medico_ids a esa fecha
    Entonces recibo un codigo de estado 201
    Y se crean filas de agenda_medico (bloques de emergencia, dia_semana=7)
      para cada medico, ya auto-confirmadas
    Y recibo el total de bloques creados

  Escenario: Intentar asignar turno en una fecha que no es domingo
    Dado que estoy autenticado como administrador
    Cuando intento asignar medicos a una fecha que no cae en domingo
    Entonces recibo un codigo de estado 400
    Y recibo el mensaje "La fecha debe ser un domingo"

  Escenario: Consultar las asignaciones dominicales vigentes
    Dado que estoy autenticado como administrador
    Cuando consulto los turnos de domingo
    Entonces recibo la lista de asignaciones futuras, agrupadas por medico y fecha,
      con el nombre del medico y su especialidad

  Escenario: Remover una asignacion dominical
    Dado que estoy autenticado como administrador
    Y existe una asignacion para el Dr. Garcia el domingo tal
    Cuando la remuevo
    Entonces se eliminan todos los bloques de esa asignacion
      (todos los bloques de ese medico+fecha creados por un administrador,
      no solo un bloque puntual)
```

> A diferencia de lo que el v1 sugeria, **no se valida que el medico este en
> estado ACTIVO** antes de asignarlo a un turno de domingo — es una validacion
> ausente en el codigo actual, no una regla de negocio real.

---

## 4. Transiciones de Estado de Cita

### Feature: Completar Cita con Ficha Clinica

```gherkin
Caracteristica: Completar cita mediante ficha clinica
  Como medico
  Quiero completar la ficha clinica al atender un paciente
  Para que la cita se marque como completada automaticamente

  Escenario: Completar cita al guardar ficha clinica
    Dado que estoy autenticado como medico
    Y tengo una cita CONFIRMADA propia
    Cuando guardo la ficha clinica con diagnostico (obligatorio),
      indicaciones y receta (opcionales)
    Entonces recibo un codigo de estado 201
    Y la ficha clinica se guarda
    Y la cita cambia automaticamente a estado "COMPLETADA"
    Y el paciente_id de la ficha se toma de la cita (no del cliente),
      para que nadie pueda registrar una ficha a nombre de otro paciente

  Escenario: Intentar crear ficha para una cita que no es CONFIRMADA
    Dado que la cita ya esta COMPLETADA, CANCELADA, NO_SHOW o RECONSULTA
    Cuando intento crear la ficha clinica
    Entonces recibo un codigo de estado 400

  Escenario: Intentar crear ficha de una cita ajena
    Dado que la cita pertenece a otro medico
    Cuando intento crear la ficha clinica
    Entonces recibo un codigo de estado 403

  Escenario: Subir documento adjunto a una ficha existente
    Dado que estoy autenticado como medico, dueno de la ficha
    Cuando subo un archivo (jpeg, png, gif, pdf o dicom, maximo 5MB)
    Entonces recibo un codigo de estado 201
    Y el documento queda asociado a la ficha clinica

  Escenario: Rechazar tipo de archivo no permitido
    Cuando intento subir un archivo de un tipo distinto a los permitidos
    Entonces la subida es rechazada

  Escenario: Paciente consulta su propia ficha clinica
    Dado que estoy autenticado como paciente
    Cuando consulto mi ficha clinica
    Entonces recibo un codigo de estado 200
    Y veo todas mis atenciones (diagnostico, indicaciones, receta, documentos)
    # Hasta agosto 2026 el endpoint permitia esto pero la pantalla
    # "Mi Ficha Clinica" nunca pedia los documentos (viven en un endpoint
    # aparte, por ficha) ni sabia descargarlos con el token requerido -el
    # paciente jamas veia los estudios que el medico subia. Corregido.

  Escenario: Paciente intenta ver la ficha clinica de otro paciente
    Cuando intento consultar la ficha clinica de otro paciente por su id
    Entonces recibo un codigo de estado 403
      (medico y administrador si pueden ver la ficha de cualquier paciente)

  Escenario: Medico ve el historial clinico antes de completar una nueva ficha
    Dado que estoy autenticado como medico y seleccione una cita para atender
    Cuando se carga la pantalla de atencion
    Entonces veo un panel con las atenciones previas del paciente
      (fecha, medico, diagnostico, receta), de cualquier medico que lo haya
      atendido antes
    Y si no tiene atenciones previas, el panel indica "(0)" sin error

  Escenario: Medico agrega una nota privada a una cita
    Dado que estoy autenticado como medico, dueno de la cita
    Cuando escribo una nota y la guardo
    Entonces recibo un codigo de estado 200
    Y la nota queda asociada a esa cita

  Escenario: La nota privada del medico nunca llega al paciente ni a secretaria
    Dado que una cita tiene una nota privada cargada
    Cuando el paciente consulta sus propias citas, o la secretaria consulta
      las citas de una fecha, o el paciente ve el detalle de esa cita
    Entonces el campo de nota no aparece en la respuesta
      (se omite explicitamente, no llega vacio: se elimina la clave)

  Escenario: Un medico intenta escribir una nota en una cita ajena
    Dado que la cita pertenece a otro medico
    Cuando intento guardar una nota sobre esa cita
    Entonces recibo un codigo de estado 403

  Escenario: Descargar un documento adjunto requiere sesion (no es un link publico)
    Dado que existe un documento adjunto a una ficha clinica
    Cuando se solicita la descarga sin el token de autenticacion
      (por ejemplo, un `<a href>` comun de navegador)
    Entonces la descarga falla con 401
    Y la app real la resuelve pidiendo el archivo por Axios con el token
      y generando un link temporal en memoria para el navegador
```

### Feature: Marcar NO_SHOW

```gherkin
Caracteristica: Marcar paciente como no presentado
  Como medico o secretaria
  Quiero marcar que un paciente no se presento
  Para mantener el registro actualizado

  Escenario: Medico marca NO_SHOW en su propia cita
    Dado que estoy autenticado como medico
    Y tengo una cita CONFIRMADA propia
    Cuando la marco como NO_SHOW
    Entonces recibo un codigo de estado 200
    Y la cita cambia a estado "NO_SHOW"

  Escenario: Medico intenta marcar NO_SHOW en cita ajena
    Dado que la cita es de otro medico
    Cuando intento marcarla como NO_SHOW
    Entonces recibo un codigo de estado 403

  Escenario: Secretaria marca NO_SHOW (sin restriccion de propiedad)
    Dado que estoy autenticada como secretaria
    Y existe una cita CONFIRMADA (de cualquier medico)
    Cuando la marco como NO_SHOW
    Entonces recibo un codigo de estado 200
      (la secretaria, a diferencia del medico, puede marcar NO_SHOW en
      cualquier cita, no solo en las de un medico especifico)

  Escenario: Intentar marcar NO_SHOW en una cita que no esta CONFIRMADA
    Dado que la cita ya esta en otro estado
    Cuando intento marcarla como NO_SHOW
    Entonces recibo un codigo de estado 400
```

### Feature: Reconsulta

```gherkin
Caracteristica: Marcar una cita como reconsulta
  Como secretaria
  Quiero marcar que un paciente que no se presento sera reagendado
  Para dejar registro de la intencion de darle otra oportunidad

  Escenario: Secretaria marca RECONSULTA sobre una cita NO_SHOW
    Dado que estoy autenticada como secretaria
    Y existe una cita en estado "NO_SHOW"
    Cuando la marco como RECONSULTA
    Entonces recibo un codigo de estado 200
    Y la MISMA cita cambia de estado a "RECONSULTA"
      (no se crea ninguna cita nueva ni se vincula formalmente con un
      reagendamiento futuro — el paciente debe agendar una cita aparte,
      igual que cualquier otra, si quiere una nueva atencion)

  Escenario: Reconsulta fallida por cita que no esta en NO_SHOW
    Dado que la cita esta en otro estado (ej. CONFIRMADA)
    Cuando intento marcarla como RECONSULTA
    Entonces recibo un codigo de estado 400

  Escenario: Solo la secretaria puede marcar RECONSULTA
    Dado que estoy autenticado como medico o administrador
    Cuando intento marcar una cita como RECONSULTA
    Entonces recibo un codigo de estado 403
      (es el unico estado que exclusivamente puede asignar la secretaria)
```

---

## 5. Operaciones de Administracion

### Feature: Cancelacion de Cita por Administrador

```gherkin
Caracteristica: Cancelacion administrativa de citas
  Como administrador
  Quiero poder cancelar una cita puntual
  Para manejar situaciones imprevistas (ej. emergencia de un medico)

  Escenario: Admin cancela una cita con notificacion al paciente
    Dado que estoy autenticado como administrador
    Y existe una cita que no esta CANCELADA ni COMPLETADA
    Cuando la cancelo con un motivo (opcional; si no doy motivo se usa
      "Cancelada por administracion" por defecto)
    Entonces recibo un codigo de estado 200
    Y la cita cambia a estado "CANCELADA"
    Y se intenta enviar un email de notificacion al paciente
    Y se registra en auditoria (CANCELAR_CITA_ADMIN)
      (a diferencia del paciente, el admin NO tiene restriccion de
      anticipacion minima ni necesita ser el dueno de la cita)

  Escenario: Intentar cancelar una cita ya cancelada o completada
    Dado que la cita ya esta CANCELADA o COMPLETADA
    Cuando el administrador intenta cancelarla
    Entonces recibo un codigo de estado 400
```

> El v1 describia un escenario de "cancelar todas las citas de un medico de una
> vez" — **esa operacion masiva no existe**. El endpoint solo cancela una cita
> por `id`; cancelar varias requiere llamarlo una vez por cada una.

### Feature: Cambio de Estado de Medico

```gherkin
Caracteristica: Gestion del estado del medico
  Como administrador
  Quiero cambiar el estado de un medico
  Para gestionar su disponibilidad en la clinica

  Escenario: Cambiar medico a estado VACACION
    Dado que estoy autenticado como administrador
    Y el Dr. Garcia tiene estado "ACTIVO"
    Cuando cambio su estado a "VACACION"
    Entonces recibo un codigo de estado 200
    Y el estado del Dr. Garcia cambia a "VACACION"
    Y se registra en auditoria (CAMBIAR_ESTADO_MEDICO), con estado anterior y nuevo

  Escenario: Cambiar medico a estado BAJA
    Dado que el Dr. Garcia tiene estado "ACTIVO"
    Cuando cambio su estado a "BAJA"
    Entonces recibo un codigo de estado 200
    Y ya no puede recibir nuevas citas (queda excluido al agendar)

  Escenario: Reactivar medico
    Dado que el Dr. Garcia tiene estado "BAJA" o "VACACION"
    Cuando cambio su estado a "ACTIVO"
    Entonces recibo un codigo de estado 200
    Y el medico vuelve a poder recibir citas y cargar agenda

  Escenario: Rechazar un estado invalido
    Cuando intento poner un estado que no sea ACTIVO, BAJA o VACACION
    Entonces recibo un codigo de estado 400
```

> **Existen dos rutas distintas** que hacen esto: `PATCH /api/admin/medicos/:id/estado`
> (con auditoria y verificacion previa de que el medico existe) y
> `PUT /api/medicos/:id/estado` (misma validacion de `estado`, pero **sin**
> registrar auditoria). Ambas requieren rol `administrador`. Se recomienda usar
> la primera como la "oficial" y considerar deprecar la segunda para evitar
> cambios de estado sin trazabilidad.

### Feature: Ver panel de administracion con estadisticas

```gherkin
Caracteristica: Panel de administracion
  Como administrador
  Quiero ver un resumen de la actividad de la clinica
  Para tomar decisiones informadas

  Escenario: Ver estadisticas reales del panel
    Dado que estoy autenticado como administrador
    Cuando abro el panel de administracion
    Entonces veo la cantidad de medicos ACTIVO
    Y veo la cantidad de citas de hoy
    Y veo la distribucion de citas de hoy por estado
    Y veo la tendencia de citas de los ultimos 7 dias (excluyendo canceladas)
```

> **Este endpoint (`GET /api/admin/stats`) no existia hasta esta version.** El
> panel de administracion llamaba a una ruta inexistente, la peticion fallaba
> con 404 en silencio, y el panel mostraba "0" en todos los indicadores sin
> importar los datos reales del sistema — un bug critico ya corregido y
> verificado en produccion.

---

## 6. Operaciones de Secretaria

### Feature: Gestion de citas del dia

```gherkin
Caracteristica: Funciones de secretaria en gestion de citas
  Como secretaria de la clinica
  Quiero gestionar estados de citas de un dia
  Para mantener actualizado el sistema de atencion

  Escenario: Consultar citas de una fecha
    Dado que estoy autenticada como secretaria
    Cuando consulto las citas de una fecha especifica
    Entonces recibo la lista de citas de ese dia

  Escenario: Secretaria marca NO_SHOW
    Dado que existe una cita CONFIRMADA de cualquier medico
    Cuando la marco como NO_SHOW
    Entonces la cita cambia a estado "NO_SHOW"

  Escenario: Secretaria marca RECONSULTA
    Dado que existe una cita en estado "NO_SHOW"
    Cuando la marco como RECONSULTA
    Entonces esa misma cita cambia a estado "RECONSULTA"
      (ver nota en la seccion 4: no se crea una cita nueva)

  Escenario: Secretaria intenta cancelar una cita (no permitido)
    Dado que estoy autenticada como secretaria
    Cuando intento cancelar una cita
    Entonces recibo un codigo de estado 403
      (cancelar es exclusivo de paciente-dueno o administrador)
```

---

## 7. Modulo de Notificaciones

### Feature: Notificaciones por Email

```gherkin
Caracteristica: Envio de notificaciones por email
  Como sistema
  Quiero enviar notificaciones por email cuando corresponda
  Para mantener informados a los pacientes

  Escenario: Email de confirmacion al agendar (si hay SMTP configurado)
    Dado que un paciente agenda una cita exitosamente
    Y el sistema tiene credenciales SMTP configuradas
    Cuando se procesa el registro
    Entonces se envia un email de confirmacion con fecha, hora, medico y especialidad

  Escenario: Sin SMTP configurado, el email se omite sin romper el flujo
    Dado que no hay SMTP_USER configurado (o el entorno es de pruebas)
    Cuando el sistema intenta enviar cualquier notificacion
    Entonces el envio se omite, se registra por consola, y la operacion
      principal (agendar, cancelar, etc.) se completa igual con exito

  Escenario: Notificacion al cancelar por administrador
    Dado que un administrador cancela la cita de un paciente
    Cuando se procesa la cancelacion
    Entonces se intenta enviar un email al paciente con el motivo de la
      cancelacion (o "Emergencia" si no se especifico ninguno)
```

> **El recordatorio de 24 horas antes de la cita NO se envia automaticamente.**
> La funcion `sendAppointmentReminder` existe en el codigo pero ningun cron,
> scheduler ni tarea programada la invoca — es funcionalidad construida pero
> nunca conectada a un disparador. Para que funcione de verdad haria falta
> agregar una tarea periodica (ej. un cron job) que la llame.

### Feature: Alerta de cita proxima en el dashboard (agosto 2026)

En vez de un cron que mande emails, se agrego un aviso calculado del lado
del cliente con los datos que la pantalla ya carga al entrar — sin
infraestructura nueva ni efectos automaticos hacia afuera del sistema.

```gherkin
Caracteristica: Aviso de cita proxima sin depender de email
  Como paciente o medico
  Quiero ver un aviso si tengo una cita por empezar pronto
  Para no depender de revisar mi email o acordarme solo

  Escenario: Paciente ve el aviso si tiene una cita confirmada dentro de 24h
    Dado que estoy autenticado como paciente
    Y tengo una cita CONFIRMADA que empieza dentro de las proximas 24 horas
    Cuando entro a mi dashboard
    Entonces veo un banner "Recordatorio: tiene una cita hoy/manana a las
      HH:MM con Dr. X"
    Y si faltan menos de 2 horas, el texto dice "en N minutos" en vez de
      "hoy"/"manana"

  Escenario: Medico ve el aviso si tiene una cita confirmada dentro de 2h
    Dado que estoy autenticado como medico
    Y tengo una cita CONFIRMADA de hoy que empieza dentro de las proximas 2 horas
    Cuando entro a mi dashboard
    Entonces veo un banner "Proxima cita: {paciente} en N minutos"

  Escenario: Sin citas dentro de la ventana, no aparece ningun banner
    Dado que no tengo ninguna cita CONFIRMADA dentro de la ventana (24h/2h)
    Cuando entro a mi dashboard
    Entonces no se muestra ningun aviso
```

---

## 8. Auditoria (registro interno, sin consulta por API)

### Feature: Trazabilidad de acciones en el sistema

```gherkin
Caracteristica: Registro interno de auditoria
  Como sistema
  Quiero registrar quien hizo que accion y cuando
  Para tener trazabilidad de operaciones sensibles

  Escenario: Se registra la cancelacion de una cita por el administrador
    Dado que un administrador cancela una cita
    Cuando se ejecuta la operacion
    Entonces se guarda una fila en audit_log con accion "CANCELAR_CITA_ADMIN",
      el estado anterior y el nuevo, la ip y el user-agent de la peticion

  Escenario: Se registra el cambio de estado de un medico
    Dado que un administrador cambia el estado de un medico
    Cuando se ejecuta la operacion
    Entonces se guarda una fila con accion "CAMBIAR_ESTADO_MEDICO"

  Escenario: Un fallo al escribir el log no interrumpe la operacion principal
    Dado que el registro de auditoria falla por cualquier motivo
    Cuando se completa la accion de negocio
    Entonces la accion principal (cancelar cita, cambiar estado, etc.)
      se completa igual con exito
    Y el fallo del log solo se imprime en la consola del servidor
```

> A diferencia de lo que sugeria el v1, **no existe ningun endpoint para leer
> `audit_log` desde la API** (`GET /api/auditoria` nunca se implemento). La
> tabla se llena correctamente en cada accion listada arriba, pero hoy solo se
> puede consultar con una query SQL directa a la base de datos. Tampoco existe
> un endpoint para eliminar (soft delete) un paciente — la columna `deleted_at`
> existe en el esquema pero ningun endpoint real la usa para ese proposito.
