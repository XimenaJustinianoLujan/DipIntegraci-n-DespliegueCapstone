# BDD - Escenarios de Comportamiento

## Plataforma de Citas Medicas

**Version:** 1.0  
**Fecha:** Agosto 2024  
**Formato:** Gherkin (Espanol)

---

## 1. Modulo de Registro y Autenticacion

### Feature: Registro de Paciente

```gherkin
Caracteristica: Registro de paciente con validacion de email
  Como paciente nuevo
  Quiero registrarme en la plataforma
  Para poder agendar citas medicas

  Escenario: Registro exitoso con datos validos
    Dado que no existe un paciente con email "juan@email.com"
    Cuando envio una solicitud de registro con:
      | nombre   | Juan        |
      | apellido | Garcia      |
      | email    | juan@email.com |
      | password | MiPass123   |
      | telefono | 1155667788  |
      | dni      | 30123456    |
    Entonces recibo un codigo de estado 201
    Y recibo un mensaje "Registro exitoso. Verifique su email para activar la cuenta."
    Y se envia un email de verificacion a "juan@email.com"

  Escenario: Registro fallido por email duplicado
    Dado que existe un paciente con email "juan@email.com"
    Cuando envio una solicitud de registro con email "juan@email.com"
    Entonces recibo un codigo de estado 409
    Y recibo un mensaje de error "El email ya esta registrado."

  Escenario: Registro fallido por contrasena debil
    Cuando envio una solicitud de registro con password "abc"
    Entonces recibo un codigo de estado 400
    Y recibo un error de validacion para el campo "password"
    Y el mensaje indica "Minimo 8 caracteres, al menos 1 numero y 1 mayuscula"

  Escenario: Registro fallido por email invalido
    Cuando envio una solicitud de registro con email "noesunmail"
    Entonces recibo un codigo de estado 400
    Y recibo un error de validacion para el campo "email"
    Y el mensaje indica "El formato del email no es valido"

  Escenario: Registro fallido por DNI duplicado
    Dado que existe un paciente con DNI "30123456"
    Cuando envio una solicitud de registro con dni "30123456"
    Entonces recibo un codigo de estado 409
    Y recibo un mensaje de error "El DNI ya esta registrado."

  Escenario: Registro fallido por nombre vacio
    Cuando envio una solicitud de registro con nombre ""
    Entonces recibo un codigo de estado 400
    Y recibo un error de validacion para el campo "nombre"

  Escenario: Registro fallido por telefono invalido
    Cuando envio una solicitud de registro con telefono "abc123"
    Entonces recibo un codigo de estado 400
    Y recibo un error de validacion para el campo "telefono"
    Y el mensaje indica "Formato numerico, longitud entre 8 y 15 digitos"
```

### Feature: Verificacion de Email

```gherkin
Caracteristica: Verificacion de email de paciente
  Como paciente registrado
  Quiero verificar mi email
  Para poder iniciar sesion en la plataforma

  Escenario: Verificacion exitosa con token valido
    Dado que me registre con email "juan@email.com"
    Y recibi un token de verificacion valido
    Cuando envio el token de verificacion
    Entonces recibo un codigo de estado 200
    Y mi email queda marcado como verificado
    Y puedo iniciar sesion

  Escenario: Verificacion fallida por token invalido
    Cuando envio un token de verificacion "token-inexistente"
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "Token de verificacion invalido o expirado."

  Escenario: Verificacion fallida por token expirado
    Dado que mi token de verificacion expiro hace 24 horas
    Cuando envio el token de verificacion expirado
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "Token de verificacion invalido o expirado."

  Escenario: Login sin verificar email
    Dado que me registre pero no verifique mi email
    Cuando intento iniciar sesion
    Entonces recibo un codigo de estado 403
    Y recibo un mensaje "Debe verificar su email antes de iniciar sesion."
```

### Feature: Login

```gherkin
Caracteristica: Inicio de sesion
  Como usuario registrado
  Quiero iniciar sesion
  Para acceder a las funcionalidades del sistema

  Escenario: Login exitoso de paciente
    Dado que soy un paciente con email verificado "juan@email.com"
    Cuando inicio sesion con email "juan@email.com" y password "MiPass123"
    Entonces recibo un codigo de estado 200
    Y recibo un token JWT valido
    Y el payload contiene mi rol "paciente"

  Escenario: Login exitoso de medico con username
    Dado que soy un medico con username "jperez"
    Cuando inicio sesion con username "jperez" y password "DocPass123"
    Entonces recibo un codigo de estado 200
    Y recibo un token JWT valido
    Y el payload contiene mi rol "medico"

  Escenario: Login fallido por credenciales incorrectas
    Cuando inicio sesion con email "juan@email.com" y password "incorrecta"
    Entonces recibo un codigo de estado 401
    Y recibo un mensaje "Credenciales invalidas."

  Escenario: Login bloqueado por rate limiting
    Dado que realice 5 intentos fallidos de login en el ultimo minuto
    Cuando intento iniciar sesion nuevamente
    Entonces recibo un codigo de estado 429
    Y recibo un mensaje "Demasiados intentos. Intente nuevamente en unos minutos."
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
    Y no tengo citas activas
    Y existe un bloque disponible con el Dr. Lopez para el 20/08/2024 a las 10:00
    Cuando agendo una cita con el Dr. Lopez para el 20/08/2024 a las 10:00
    Entonces recibo un codigo de estado 201
    Y la cita se crea con estado "CONFIRMADA"
    Y se envia un email de confirmacion a mi correo
    Y el bloque queda marcado como ocupado

  Escenario: Agendar cita fallido por maximo 3 citas activas
    Dado que estoy autenticado como paciente
    Y tengo 3 citas activas en diferentes especialidades
    Cuando intento agendar una cuarta cita
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "Maximo 3 citas activas permitidas."

  Escenario: Agendar cita fallido por misma especialidad
    Dado que estoy autenticado como paciente
    Y tengo una cita activa en "Cardiologia"
    Cuando intento agendar otra cita en "Cardiologia"
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "Ya tiene una cita activa en esta especialidad."

  Escenario: Agendar cita fallido por mismo medico
    Dado que estoy autenticado como paciente
    Y tengo una cita activa con el Dr. Lopez
    Cuando intento agendar otra cita con el Dr. Lopez
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "Ya tiene una cita activa con este medico."

  Escenario: Agendar cita fallido por menos de 24 horas
    Dado que estoy autenticado como paciente
    Y la fecha actual es 20/08/2024 a las 14:00
    Cuando intento agendar una cita para el 21/08/2024 a las 10:00
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "Debe agendar con al menos 24 horas de anticipacion."

  Escenario: Agendar cita con menos de 24h cuando hay espacio libre
    Dado que estoy autenticado como paciente
    Y la fecha actual es 20/08/2024 a las 14:00
    Y existe un bloque libre con el Dr. Lopez para el 21/08/2024 a las 10:00
    Y el medico tiene disponibilidad
    Cuando intento agendar una cita para el 21/08/2024 a las 10:00
    Entonces recibo un codigo de estado 201
    Y la cita se crea con estado "CONFIRMADA"

  Escenario: Agendar cita fallido por bloque ocupado
    Dado que estoy autenticado como paciente
    Y el bloque del 20/08/2024 a las 10:00 con el Dr. Lopez ya esta ocupado
    Cuando intento agendar en ese bloque
    Entonces recibo un codigo de estado 409
    Y recibo un mensaje "El bloque horario ya esta ocupado."

  Escenario: Agendar cita fallido por fecha en el pasado
    Dado que estoy autenticado como paciente
    Y la fecha actual es 20/08/2024
    Cuando intento agendar una cita para el 19/08/2024
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "La fecha de la cita no puede ser en el pasado."
```

### Feature: Cancelar Cita

```gherkin
Caracteristica: Cancelacion de citas
  Como paciente
  Quiero cancelar una cita
  Para liberar el bloque horario si no puedo asistir

  Escenario: Cancelar cita exitosamente con mas de 2 horas de anticipacion
    Dado que estoy autenticado como paciente
    Y tengo una cita confirmada para el 20/08/2024 a las 10:00
    Y la hora actual es 20/08/2024 a las 07:00
    Cuando cancelo mi cita
    Entonces recibo un codigo de estado 200
    Y la cita cambia a estado "CANCELADA"
    Y el bloque horario queda disponible nuevamente

  Escenario: Cancelar cita fallido por menos de 2 horas de anticipacion
    Dado que estoy autenticado como paciente
    Y tengo una cita confirmada para el 20/08/2024 a las 10:00
    Y la hora actual es 20/08/2024 a las 08:30
    Cuando intento cancelar mi cita
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "No puede cancelar con menos de 2 horas de anticipacion."

  Escenario: Cancelar cita que no pertenece al paciente
    Dado que estoy autenticado como paciente "Juan"
    Y existe una cita que pertenece al paciente "Maria"
    Cuando intento cancelar esa cita
    Entonces recibo un codigo de estado 403
    Y recibo un mensaje "No tiene permisos para esta operacion."
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
    Y la fecha actual es 13/08/2024 (martes)
    Cuando cargo mi agenda para la semana del 26/08/2024
    Entonces recibo un codigo de estado 201
    Y se crean los bloques horarios para la semana indicada
    Y recibo un mensaje "Agenda cargada exitosamente."

  Escenario: Cargar agenda sin anticipacion suficiente
    Dado que estoy autenticado como medico
    Y la fecha actual es 13/08/2024
    Cuando intento cargar mi agenda para la semana del 19/08/2024
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "La agenda debe cargarse con al menos 1 semana de anticipacion."

  Escenario: Proponer ultima configuracion de agenda
    Dado que estoy autenticado como medico
    Y ya cargue mi agenda la semana pasada con bloques L-V 8:00-14:00
    Cuando solicito la ultima configuracion
    Entonces recibo un codigo de estado 200
    Y recibo los bloques de mi ultima configuracion
    Y puedo confirmar o modificar

  Escenario: Confirmar agenda con ultima configuracion
    Dado que estoy autenticado como medico
    Y recibo la propuesta de mi ultima configuracion
    Cuando confirmo la agenda con la ultima configuracion
    Entonces recibo un codigo de estado 200
    Y se crea la agenda para la nueva semana con los mismos bloques
    Y recibo un mensaje "Agenda confirmada para la semana 2024-08-26."

  Escenario: Modificar agenda propuesta
    Dado que estoy autenticado como medico
    Y recibo la propuesta de mi ultima configuracion
    Cuando modifico algunos bloques y confirmo
    Entonces recibo un codigo de estado 201
    Y se crea la agenda con los bloques modificados

  Escenario: Admin carga agenda por medico que no cumplio plazo
    Dado que estoy autenticado como administrador
    Y el Dr. Lopez no cargo su agenda para la proxima semana
    Y el plazo ya vencio
    Cuando cargo la agenda del Dr. Lopez
    Entonces recibo un codigo de estado 201
    Y se crea la agenda para el Dr. Lopez
    Y se registra en auditoria que el admin cargo la agenda
```

### Feature: Turnos de Domingo

```gherkin
Caracteristica: Asignacion de medicos para turno dominical
  Como administrador
  Quiero asignar medicos de turno para domingos
  Para cubrir emergencias sin cita previa

  Escenario: Asignar medicos de turno para domingo
    Dado que estoy autenticado como administrador
    Y existen medicos activos disponibles
    Cuando asigno a los Dres. Lopez y Garcia para el domingo 25/08/2024
    Entonces recibo un codigo de estado 201
    Y los medicos quedan asignados al turno dominical
    Y recibo un mensaje "Medicos asignados para turno dominical."

  Escenario: Asignar medico en estado no activo
    Dado que estoy autenticado como administrador
    Y el Dr. Lopez tiene estado "vacacion"
    Cuando intento asignar al Dr. Lopez para un turno dominical
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "El medico no esta en estado activo."

  Escenario: Consultar medicos de turno un domingo
    Dado que es domingo 25/08/2024
    Y hay medicos asignados al turno
    Cuando consulto los medicos de turno
    Entonces recibo la lista de medicos disponibles
    Y la atencion es sin cita previa por orden de llegada
```

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
    Y tengo una cita confirmada con el paciente "Juan Garcia" hoy a las 10:00
    Cuando guardo la ficha clinica con:
      | diagnostico   | Hipertension arterial leve              |
      | indicaciones  | Dieta baja en sodio, ejercicio regular  |
      | receta        | Enalapril 10mg c/12h                    |
    Entonces recibo un codigo de estado 201
    Y la ficha clinica se guarda correctamente
    Y la cita cambia a estado "COMPLETADA"
    Y recibo un mensaje "Ficha clinica guardada. Cita marcada como completada."

  Escenario: Subir documento a ficha clinica
    Dado que estoy autenticado como medico
    Y existe una ficha clinica para la cita del paciente "Juan Garcia"
    Cuando subo un documento de tipo "analisis" con nombre "hemograma.pdf"
    Entonces recibo un codigo de estado 201
    Y el documento queda asociado a la ficha clinica
    Y recibo la URL de descarga del documento

  Escenario: Paciente consulta su ficha clinica
    Dado que estoy autenticado como paciente "Juan Garcia"
    Y tengo fichas clinicas registradas
    Cuando consulto mi ficha clinica
    Entonces recibo un codigo de estado 200
    Y veo todas mis atenciones con diagnostico, indicaciones y receta
    Y veo los documentos adjuntos de cada atencion
```

### Feature: Marcar NO_SHOW

```gherkin
Caracteristica: Marcar paciente como no presentado
  Como medico o secretaria
  Quiero marcar que un paciente no se presento
  Para mantener el registro actualizado

  Escenario: Medico marca NO_SHOW
    Dado que estoy autenticado como medico
    Y tengo una cita confirmada con el paciente "Juan Garcia" que ya paso la hora
    Cuando marco la cita como NO_SHOW
    Entonces recibo un codigo de estado 200
    Y la cita cambia a estado "NO_SHOW"
    Y se registra en auditoria

  Escenario: Secretaria marca NO_SHOW
    Dado que estoy autenticada como secretaria
    Y existe una cita confirmada que ya paso la hora
    Cuando marco la cita como NO_SHOW
    Entonces recibo un codigo de estado 200
    Y la cita cambia a estado "NO_SHOW"

  Escenario: Intentar marcar NO_SHOW en cita ya completada
    Dado que estoy autenticado como medico
    Y la cita ya esta en estado "COMPLETADA"
    Cuando intento marcar la cita como NO_SHOW
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "No se puede cambiar el estado de una cita completada."
```

### Feature: Reconsulta

```gherkin
Caracteristica: Reagendar cita por reconsulta
  Como secretaria
  Quiero reagendar una cita de un paciente que no se presento
  Para darle otra oportunidad de ser atendido

  Escenario: Secretaria marca RECONSULTA exitosamente
    Dado que estoy autenticada como secretaria
    Y existe una cita en estado "NO_SHOW" del paciente "Juan Garcia"
    Y hay un bloque disponible el 22/08/2024 a las 10:00
    Cuando marco la cita como RECONSULTA con nueva fecha 22/08/2024 bloque 10:00
    Entonces recibo un codigo de estado 200
    Y la cita original cambia a estado "RECONSULTA"
    Y se crea una nueva cita CONFIRMADA para el 22/08/2024 a las 10:00
    Y la nueva cita referencia a la original como reconsulta

  Escenario: Reconsulta fallida por cita que no esta en NO_SHOW
    Dado que estoy autenticada como secretaria
    Y existe una cita en estado "CONFIRMADA"
    Cuando intento marcar como RECONSULTA
    Entonces recibo un codigo de estado 400
    Y recibo un mensaje "Solo se puede reagendar una cita en estado NO_SHOW."

  Escenario: Reconsulta fallida por bloque no disponible
    Dado que estoy autenticada como secretaria
    Y existe una cita en estado "NO_SHOW"
    Y el bloque solicitado ya esta ocupado
    Cuando intento marcar como RECONSULTA
    Entonces recibo un codigo de estado 409
    Y recibo un mensaje "El bloque horario ya esta ocupado."
```

---

## 5. Operaciones de Administracion

### Feature: Cancelacion por Emergencia

```gherkin
Caracteristica: Cancelacion de citas por emergencia administrativa
  Como administrador
  Quiero cancelar citas por emergencia
  Para manejar situaciones imprevistas que afectan la atencion

  Escenario: Admin cancela cita por emergencia con notificacion
    Dado que estoy autenticado como administrador
    Y existe una cita confirmada del paciente "Juan Garcia" con el Dr. Lopez
    Cuando cancelo la cita por emergencia con motivo "Emergencia medica del Dr. Lopez"
    Entonces recibo un codigo de estado 200
    Y la cita cambia a estado "CANCELADA"
    Y se registra el motivo de cancelacion
    Y se envia email de notificacion al paciente "Juan Garcia"
    Y se registra en auditoria la accion del administrador
    Y recibo confirmacion de que la notificacion fue enviada

  Escenario: Admin cancela multiples citas del mismo medico
    Dado que estoy autenticado como administrador
    Y el Dr. Lopez tiene 5 citas confirmadas para hoy
    Cuando cancelo todas las citas del Dr. Lopez por emergencia
    Entonces todas las citas cambian a estado "CANCELADA"
    Y se envia notificacion a cada paciente afectado
    Y se registra en auditoria cada cancelacion
```

### Feature: Cambio de Estado de Medico

```gherkin
Caracteristica: Gestion del estado del medico
  Como administrador
  Quiero cambiar el estado de un medico
  Para gestionar su disponibilidad en la clinica

  Escenario: Cambiar medico a estado Vacacion
    Dado que estoy autenticado como administrador
    Y el Dr. Lopez tiene estado "activo"
    Cuando cambio su estado a "vacacion" con motivo "Vacaciones agosto 2024"
    Entonces recibo un codigo de estado 200
    Y el estado del Dr. Lopez cambia a "vacacion"
    Y se registra en auditoria el cambio de estado

  Escenario: Cambiar medico a estado Baja
    Dado que estoy autenticado como administrador
    Y el Dr. Lopez tiene estado "activo"
    Cuando cambio su estado a "baja" con motivo "Renuncia voluntaria"
    Entonces recibo un codigo de estado 200
    Y el estado del Dr. Lopez cambia a "baja"
    Y se registra en auditoria

  Escenario: Reactivar medico
    Dado que estoy autenticado como administrador
    Y el Dr. Lopez tiene estado "vacacion"
    Cuando cambio su estado a "activo"
    Entonces recibo un codigo de estado 200
    Y el estado del Dr. Lopez cambia a "activo"
    Y el medico puede cargar agenda nuevamente
```

### Feature: Carga de Agenda por Admin

```gherkin
Caracteristica: Admin carga agenda por incumplimiento de medico
  Como administrador
  Quiero cargar la agenda de un medico que no cumplio el plazo
  Para garantizar la disponibilidad de atencion

  Escenario: Admin identifica medicos sin agenda
    Dado que estoy autenticado como administrador
    Y faltan menos de 7 dias para la proxima semana
    Cuando consulto los medicos sin agenda cargada
    Entonces recibo la lista de medicos que no han cargado agenda
    Y puedo ver su especialidad y ultima fecha de agenda

  Escenario: Admin carga agenda de medico
    Dado que estoy autenticado como administrador
    Y el Dr. Lopez no cargo su agenda para la semana del 26/08/2024
    Cuando cargo la agenda del Dr. Lopez con bloques L-V 8:00-14:00
    Entonces recibo un codigo de estado 201
    Y se crea la agenda para el Dr. Lopez
    Y se registra en auditoria que fue cargada por el admin
```

---

## 6. Operaciones de Secretaria

### Feature: Operaciones de Secretaria

```gherkin
Caracteristica: Funciones de secretaria en gestion de citas
  Como secretaria de la clinica
  Quiero gestionar estados de citas
  Para mantener actualizado el sistema de atencion

  Escenario: Secretaria marca NO_SHOW cuando paciente no se presenta
    Dado que estoy autenticada como secretaria
    Y existe una cita confirmada del paciente "Juan Garcia" a las 10:00
    Y ya paso la hora de la cita (son las 10:30)
    Cuando marco la cita como NO_SHOW
    Entonces la cita cambia a estado "NO_SHOW"
    Y queda registrado que la secretaria realizo el cambio

  Escenario: Secretaria reagenda por reconsulta
    Dado que estoy autenticada como secretaria
    Y el paciente "Juan Garcia" tiene una cita en estado "NO_SHOW"
    Y el paciente solicita otra oportunidad
    Y hay disponibilidad el 22/08/2024 a las 14:00
    Cuando agendo la reconsulta para el 22/08/2024 a las 14:00
    Entonces la cita original cambia a "RECONSULTA"
    Y se crea una nueva cita "CONFIRMADA" para la nueva fecha
    Y la nueva cita tiene referencia a la cita original

  Escenario: Secretaria intenta cancelar cita (no permitido)
    Dado que estoy autenticada como secretaria
    Y existe una cita confirmada
    Cuando intento cancelar la cita
    Entonces recibo un codigo de estado 403
    Y recibo un mensaje "No tiene permisos para esta operacion."
```

---

## 7. Modulo de Notificaciones

### Feature: Notificaciones por Email

```gherkin
Caracteristica: Envio de notificaciones por email
  Como sistema
  Quiero enviar notificaciones automaticas
  Para mantener informados a los pacientes sobre sus citas

  Escenario: Email de confirmacion al agendar cita
    Dado que el paciente "Juan Garcia" agendo una cita exitosamente
    Cuando se procesa la notificacion
    Entonces se envia un email a "juan@email.com"
    Y el asunto contiene "Confirmacion de cita"
    Y el cuerpo incluye fecha, hora, medico y especialidad

  Escenario: Recordatorio 24 horas antes
    Dado que el paciente "Juan Garcia" tiene una cita manana a las 10:00
    Y la hora actual es hoy a las 10:00 (24h antes)
    Cuando se ejecuta el proceso de recordatorios
    Entonces se envia un email de recordatorio a "juan@email.com"
    Y el asunto contiene "Recordatorio de cita"

  Escenario: Notificacion de cancelacion por admin
    Dado que el administrador cancelo la cita del paciente "Juan Garcia"
    Y el motivo es "Emergencia medica del Dr. Lopez"
    Cuando se procesa la notificacion de cancelacion
    Entonces se envia un email a "juan@email.com"
    Y el asunto contiene "Cancelacion de cita"
    Y el cuerpo incluye el motivo de cancelacion
    Y se sugiere al paciente reagendar su cita
```

---

## 8. Modulo de Auditoria

### Feature: Registro de Auditoria

```gherkin
Caracteristica: Trazabilidad de acciones en el sistema
  Como administrador
  Quiero consultar el registro de auditoria
  Para tener trazabilidad de todas las acciones del sistema

  Escenario: Se registra cancelacion de cita por admin
    Dado que el administrador cancelo una cita por emergencia
    Cuando consulto el log de auditoria
    Entonces encuentro un registro con:
      | accion    | CANCELAR_CITA                     |
      | entidad   | citas                             |
      | usuario   | Administrador Principal           |
      | motivo    | Emergencia medica del Dr. Lopez   |
    Y contiene los datos anteriores (estado: CONFIRMADA)
    Y contiene los datos nuevos (estado: CANCELADA)

  Escenario: Se registra cambio de estado de medico
    Dado que el administrador cambio el estado del Dr. Lopez a "vacacion"
    Cuando consulto el log de auditoria
    Entonces encuentro un registro con accion "CAMBIAR_ESTADO_MEDICO"
    Y datos_anteriores contiene {"estado": "activo"}
    Y datos_nuevos contiene {"estado": "vacacion"}

  Escenario: Consultar auditoria por rango de fechas
    Dado que estoy autenticado como administrador
    Cuando consulto auditoria desde "2024-08-01" hasta "2024-08-31"
    Entonces recibo todos los registros de ese periodo
    Y estan ordenados por fecha descendente

  Escenario: Soft delete mantiene trazabilidad
    Dado que se elimina logicamente un paciente
    Cuando consulto el paciente eliminado
    Entonces el campo "deleted_at" tiene la fecha de eliminacion
    Y el registro sigue existiendo en la base de datos
    Y no aparece en consultas normales (filtro deleted_at IS NULL)
```
