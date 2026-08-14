# Diagramas de Secuencia y Flujo

## Plataforma de Citas Medicas

**Version:** 1.0  
**Fecha:** Agosto 2024  
**Formato:** ASCII/Texto

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
     │                    │    registro        │                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 3. Validar datos    │
     │                    │                    │──────┐              │
     │                    │                    │      │              │
     │                    │                    │<─────┘              │
     │                    │                    │                     │
     │                    │                    │ 4. Verificar email  │
     │                    │                    │    y DNI unicos     │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 5. SELECT email,dni │
     │                    │                    │<────────────────────│
     │                    │                    │                     │
     │                    │                    │ 6. Hash password    │
     │                    │                    │    (bcrypt)         │
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
     │                    │                    │ 9. Generar token    │
     │                    │                    │    verificacion     │
     │                    │                    │──────┐              │
     │                    │                    │      │              │
     │                    │                    │<─────┘              │
     │                    │                    │                     │
     │                    │                    │                     │
     │                    │                    │───┐ 10. Enviar      │
     │                    │                    │   │  email con      │
     │                    │                    │<──┘  enlace         │
     │                    │                    │                     │
     │                    │ 11. 201 Created    │                     │
     │                    │<───────────────────│                     │
     │                    │                    │                     │
     │ 12. "Verifique     │                    │                     │
     │      su email"     │                    │                     │
     │<───────────────────│                    │                     │
     │                    │                    │                     │
     │                    │                    │                     │
     │ 13. Clic en enlace │                    │                     │
     │    de email        │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 14. POST /api/auth/│                     │
     │                    │     verificar-email│                     │
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
     │                    │ 2. GET /api/agenda/│                     │                 │
     │                    │    disponibilidad  │                     │                 │
     │                    │    ?especialidad=X │                     │                 │
     │                    │───────────────────>│                     │                 │
     │                    │                    │                     │                 │
     │                    │                    │ 3. Consultar agenda │                 │
     │                    │                    │    y citas activas  │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 4. Bloques libres   │                 │
     │                    │                    │<────────────────────│                 │
     │                    │                    │                     │                 │
     │                    │ 5. Lista de medicos│                     │                 │
     │                    │    y horarios      │                     │                 │
     │                    │<───────────────────│                     │                 │
     │                    │                    │                     │                 │
     │ 6. Muestra         │                    │                     │                 │
     │   disponibilidad   │                    │                     │                 │
     │<───────────────────│                    │                     │                 │
     │                    │                    │                     │                 │
     │ 7. Selecciona      │                    │                     │                 │
     │   medico y bloque  │                    │                     │                 │
     │───────────────────>│                    │                     │                 │
     │                    │                    │                     │                 │
     │                    │ 8. POST /api/citas │                     │                 │
     │                    │   {medico_id,      │                     │                 │
     │                    │    fecha, bloque}  │                     │                 │
     │                    │───────────────────>│                     │                 │
     │                    │                    │                     │                 │
     │                    │                    │ 9. Validar reglas:  │                 │
     │                    │                    │ - Max 3 citas       │                 │
     │                    │                    │ - No misma espec.   │                 │
     │                    │                    │ - 24h anticipacion  │                 │
     │                    │                    │ - Bloque libre      │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 10. Validaciones OK │                 │
     │                    │                    │<────────────────────│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 11. INSERT cita     │                 │
     │                    │                    │     estado=CONFIRMADA                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 12. Cita creada     │                 │
     │                    │                    │<────────────────────│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 13. Enviar email    │                 │
     │                    │                    │    confirmacion     │                 │
     │                    │                    │────────────────────────────────────>│
     │                    │                    │                     │                 │
     │                    │                    │ 14. Registrar en    │                 │
     │                    │                    │     audit_log       │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │ 15. 201 Cita       │                     │                 │
     │                    │     confirmada     │                     │                 │
     │                    │<───────────────────│                     │                 │
     │                    │                    │                     │                 │
     │ 16. "Su cita ha    │                    │                     │                 │
     │    sido confirmada"│                    │                     │                 │
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
     │   "Cargar Agenda"  │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 2. GET /api/agenda/ │                    │
     │                    │    medico/:id/      │                    │
     │                    │    ultima-config    │                    │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 3. Buscar ultima    │
     │                    │                    │    configuracion    │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 4. Ultima config    │
     │                    │                    │<────────────────────│
     │                    │                    │                     │
     │                    │ 5. Propuesta de    │                     │
     │                    │    agenda (grilla) │                     │
     │                    │<───────────────────│                     │
     │                    │                    │                     │
     │ 6. Muestra grilla  │                    │                     │
     │   con ultima config│                    │                     │
     │   pre-seleccionada │                    │                     │
     │<───────────────────│                    │                     │
     │                    │                    │                     │
     │                    │                    │                     │
     ├── OPCION A: Confirmar sin cambios ──────────────────────────>│
     │                    │                    │                     │
     │ 7a. Confirma sin   │                    │                     │
     │    cambios         │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 8a. POST /api/     │                     │
     │                    │  agenda/medico/:id/│                     │
     │                    │  confirmar         │                     │
     │                    │  {usar_ultima:true}│                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │                     │
     ├── OPCION B: Modificar y confirmar ──────────────────────────>│
     │                    │                    │                     │
     │ 7b. Modifica       │                    │                     │
     │    bloques en      │                    │                     │
     │    la grilla       │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 8b. POST /api/     │                     │
     │                    │  agenda/medico/:id/│                     │
     │                    │  cargar            │                     │
     │                    │  {semana, bloques} │                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     ├── CONTINUACION COMUN ────────────────────────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 9. Validar semana   │
     │                    │                    │    (1 sem anticip.) │
     │                    │                    │──────┐              │
     │                    │                    │      │              │
     │                    │                    │<─────┘              │
     │                    │                    │                     │
     │                    │                    │ 10. INSERT agenda   │
     │                    │                    │     _medico bloques │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 11. OK              │
     │                    │                    │<────────────────────│
     │                    │                    │                     │
     │                    │                    │ 12. Audit log       │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │ 13. 201/200        │                     │
     │                    │    Agenda cargada  │                     │
     │                    │<───────────────────│                     │
     │                    │                    │                     │
     │ 14. "Agenda        │                    │                     │
     │   confirmada"      │                    │                     │
     │<───────────────────│                    │                     │
```

---

## 4. Flujo de Completar Cita (Ficha Clinica)

```
┌─────────┐          ┌─────────┐          ┌──────────┐         ┌──────────┐
│  Medico │          │ Frontend│          │  Backend │         │   BD     │
└────┬────┘          └────┬────┘          └────┬─────┘         └────┬─────┘
     │                    │                    │                     │
     │ 1. Selecciona cita │                    │                     │
     │   del dia (pte     │                    │                     │
     │   en consultorio)  │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 2. GET /api/fichas/│                     │
     │                    │   paciente/:id     │                     │
     │                    │   (historial)      │                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 3. SELECT fichas    │
     │                    │                    │    del paciente     │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 4. Historial        │
     │                    │                    │<────────────────────│
     │                    │                    │                     │
     │                    │ 5. Historial del   │                     │
     │                    │    paciente        │                     │
     │                    │<───────────────────│                     │
     │                    │                    │                     │
     │ 6. Ve historial    │                    │                     │
     │   previo del pte   │                    │                     │
     │<───────────────────│                    │                     │
     │                    │                    │                     │
     │ 7. Completa form:  │                    │                     │
     │  - diagnostico     │                    │                     │
     │  - indicaciones    │                    │                     │
     │  - receta          │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 8. POST /api/fichas│                     │
     │                    │   {cita_id,        │                     │
     │                    │    diagnostico,    │                     │
     │                    │    indicaciones,   │                     │
     │                    │    receta}         │                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 9. BEGIN TRANSACTION│
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 10. INSERT ficha    │
     │                    │                    │     _clinica        │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 11. UPDATE cita     │
     │                    │                    │  estado=COMPLETADA  │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 12. INSERT audit_log│
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │                    │ 13. COMMIT          │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │ 14. 201 Ficha      │                     │
     │                    │    guardada, cita  │                     │
     │                    │    completada      │                     │
     │                    │<───────────────────│                     │
     │                    │                    │                     │
     │ 15. "Atencion      │                    │                     │
     │   registrada"      │                    │                     │
     │<───────────────────│                    │                     │
     │                    │                    │                     │
     │ 16. (Opcional)     │                    │                     │
     │   Adjunta docs     │                    │                     │
     │───────────────────>│                    │                     │
     │                    │                    │                     │
     │                    │ 17. POST /api/     │                     │
     │                    │  fichas/:id/docs   │                     │
     │                    │  (multipart)       │                     │
     │                    │───────────────────>│                     │
     │                    │                    │                     │
     │                    │                    │ 18. Guardar archivo │
     │                    │                    │    + INSERT doc     │
     │                    │                    │────────────────────>│
     │                    │                    │                     │
     │                    │ 19. 201 Documento  │                     │
     │                    │    guardado        │                     │
     │                    │<───────────────────│                     │
     │                    │                    │                     │
     │ 20. "Documento     │                    │                     │
     │   adjuntado"       │                    │                     │
     │<───────────────────│                    │                     │
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
     │ 2. Ingresa motivo  │                    │                     │                 │
     │   de emergencia    │                    │                     │                 │
     │───────────────────>│                    │                     │                 │
     │                    │                    │                     │                 │
     │                    │ 3. POST /api/admin/│                     │                 │
     │                    │  citas/:id/        │                     │                 │
     │                    │  cancelar-         │                     │                 │
     │                    │  emergencia        │                     │                 │
     │                    │  {motivo}          │                     │                 │
     │                    │───────────────────>│                     │                 │
     │                    │                    │                     │                 │
     │                    │                    │ 4. Verificar rol    │                 │
     │                    │                    │    admin            │                 │
     │                    │                    │──────┐              │                 │
     │                    │                    │      │              │                 │
     │                    │                    │<─────┘              │                 │
     │                    │                    │                     │                 │
     │                    │                    │ 5. BEGIN TRANSACTION│                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 6. UPDATE cita      │                 │
     │                    │                    │   estado=CANCELADA  │                 │
     │                    │                    │   cancelado_por=    │                 │
     │                    │                    │   admin_id          │                 │
     │                    │                    │   motivo_cancelacion│                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 7. SELECT email     │                 │
     │                    │                    │   paciente          │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 8. Email paciente   │                 │
     │                    │                    │<────────────────────│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 9. INSERT           │                 │
     │                    │                    │   notificacion      │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 10. INSERT          │                 │
     │                    │                    │    audit_log        │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 11. COMMIT          │                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │                    │ 12. Enviar email    │                 │
     │                    │                    │    cancelacion      │                 │
     │                    │                    │────────────────────────────────────>│
     │                    │                    │                     │                 │
     │                    │                    │ 13. Email enviado   │                 │
     │                    │                    │<────────────────────────────────────│
     │                    │                    │                     │                 │
     │                    │                    │ 14. UPDATE          │                 │
     │                    │                    │   notificacion      │                 │
     │                    │                    │   email_enviado=true│                 │
     │                    │                    │────────────────────>│                 │
     │                    │                    │                     │                 │
     │                    │ 15. 200 Cita       │                     │                 │
     │                    │    cancelada,      │                     │                 │
     │                    │    paciente        │                     │                 │
     │                    │    notificado      │                     │                 │
     │                    │<───────────────────│                     │                 │
     │                    │                    │                     │                 │
     │ 16. "Cita cancelada│                    │                     │                 │
     │   Paciente         │                    │                     │                 │
     │   notificado"      │                    │                     │                 │
     │<───────────────────│                    │                     │                 │
```

---

## 6. Flujo de Emergencia Dominical

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  Admin  │     │Paciente │     │ Frontend│     │  Backend │     │   BD     │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬─────┘     └────┬─────┘
     │               │               │               │                  │
     │ === PREPARACION (dias previos) ===            │                  │
     │               │               │               │                  │
     │ 1. Asigna medicos de turno    │               │                  │
     │   para domingo 25/08          │               │                  │
     │──────────────────────────────────────────────>│                  │
     │               │               │               │                  │
     │               │               │               │ 2. INSERT turnos │
     │               │               │               │    _domingo      │
     │               │               │               │─────────────────>│
     │               │               │               │                  │
     │               │               │               │ 3. INSERT        │
     │               │               │               │    audit_log     │
     │               │               │               │─────────────────>│
     │               │               │               │                  │
     │ 4. Confirmacion               │               │                  │
     │<──────────────────────────────────────────────│                  │
     │               │               │               │                  │
     │               │               │               │                  │
     │ === DIA DOMINGO - ATENCION POR ORDEN DE LLEGADA ===             │
     │               │               │               │                  │
     │               │ 5. Paciente   │               │                  │
     │               │   llega a     │               │                  │
     │               │   emergencia  │               │                  │
     │               │──────────────>│               │                  │
     │               │               │               │                  │
     │               │               │ 6. GET /api/  │                  │
     │               │               │   agenda/     │                  │
     │               │               │   domingos/   │                  │
     │               │               │   turno?fecha=│                  │
     │               │               │   2024-08-25  │                  │
     │               │               │──────────────>│                  │
     │               │               │               │                  │
     │               │               │               │ 7. SELECT medicos│
     │               │               │               │   de turno       │
     │               │               │               │─────────────────>│
     │               │               │               │                  │
     │               │               │               │ 8. Lista medicos │
     │               │               │               │<─────────────────│
     │               │               │               │                  │
     │               │               │ 9. Medicos    │                  │
     │               │               │   disponibles │                  │
     │               │               │<──────────────│                  │
     │               │               │               │                  │
     │               │ 10. Se muestra│               │                  │
     │               │   medicos de  │               │                  │
     │               │   turno       │               │                  │
     │               │<──────────────│               │                  │
     │               │               │               │                  │
     │               │               │               │                  │
     │ === ATENCION SIN CITA PREVIA ===              │                  │
     │               │               │               │                  │
     │               │ 11. Paciente  │               │                  │
     │               │   es atendido │               │                  │
     │               │   por orden   │               │                  │
     │               │   de llegada  │               │                  │
     │               │               │               │                  │
     │               │               │               │                  │
     │ === MEDICO REGISTRA ATENCION ===              │                  │
     │               │               │               │                  │
     │               │               │ 12. POST /api/│                  │
     │               │               │   fichas      │                  │
     │               │               │   {paciente,  │                  │
     │               │               │   diagnostico,│                  │
     │               │               │   tipo:       │                  │
     │               │               │   emergencia} │                  │
     │               │               │──────────────>│                  │
     │               │               │               │                  │
     │               │               │               │ 13. INSERT ficha │
     │               │               │               │    (sin cita     │
     │               │               │               │    previa)       │
     │               │               │               │─────────────────>│
     │               │               │               │                  │
     │               │               │ 14. 201       │                  │
     │               │               │   Atencion    │                  │
     │               │               │   registrada  │                  │
     │               │               │<──────────────│                  │
     │               │               │               │                  │

NOTA: Los domingos la atencion es de emergencia 24h.
      No se requiere cita previa.
      El paciente es atendido por orden de llegada.
      Los medicos de turno son asignados previamente por el admin.
```

---

## 7. Flujo de Generacion de Username para Medico

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  ALGORITMO DE GENERACION DE USERNAME                      │
└──────────────────────────────────────────────────────────────────────────┘

Entrada: nombre="Juan", apellido="Perez", segundo_apellido="Garcia"

     ┌─────────────────────────────┐
     │ 1. Generar username base:   │
     │    primera_letra_nombre +   │
     │    apellido (lowercase)     │
     │    => "jperez"              │
     └─────────────┬───────────────┘
                   │
                   v
     ┌─────────────────────────────┐
     │ 2. Verificar si existe      │
     │    en tabla medicos         │
     └─────────────┬───────────────┘
                   │
          ┌────────┴────────┐
          │                 │
     No existe         Ya existe
          │                 │
          v                 v
     ┌──────────┐    ┌─────────────────────────────┐
     │ Usar     │    │ 3. Tiene segundo_apellido?   │
     │ "jperez" │    └─────────────┬───────────────┘
     └──────────┘                  │
                          ┌────────┴────────┐
                          │                 │
                         SI                NO
                          │                 │
                          v                 v
              ┌────────────────┐   ┌────────────────────────┐
              │ 4a. Agregar    │   │ 4b. Usar dos primeras  │
              │ primera letra  │   │ letras del nombre +    │
              │ segundo_apell. │   │ apellido               │
              │ => "jperezg"   │   │ => "juperez"           │
              └───────┬────────┘   └───────────┬────────────┘
                      │                        │
                      v                        v
              ┌────────────────┐       ┌────────────────┐
              │ Verificar      │       │ Verificar      │
              │ disponibilidad │       │ disponibilidad │
              └────────────────┘       └────────────────┘
```

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
                    │     CONFIRMADA      │ <-- Estado inicial
                    │                     │     (no existe PENDIENTE)
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────────┐
              │                │                    │
              │ Medico guarda  │ Paciente o admin   │ Medico o secretaria
              │ ficha clinica  │ cancela            │ marca no presentado
              │                │                    │
              v                v                    v
    ┌──────────────┐  ┌──────────────┐    ┌──────────────┐
    │              │  │              │    │              │
    │  COMPLETADA  │  │  CANCELADA   │    │   NO_SHOW    │
    │              │  │              │    │              │
    │  (terminal)  │  │  (terminal)  │    └──────┬───────┘
    └──────────────┘  └──────────────┘           │
                                                  │ Secretaria reagenda
                                                  │ (paciente pide
                                                  │  otra oportunidad)
                                                  │
                                                  v
                                         ┌──────────────┐
                                         │              │
                                         │  RECONSULTA  │
                                         │              │
                                         │  (terminal)  │
                                         └──────────────┘
                                                  │
                                                  │ Genera nueva cita
                                                  │ con estado CONFIRMADA
                                                  v
                                         ┌──────────────┐
                                         │  NUEVA CITA  │
                                         │  CONFIRMADA  │
                                         │(referencia a │
                                         │ la original) │
                                         └──────────────┘

REGLAS:
- CONFIRMADA --> COMPLETADA: Solo cuando medico guarda ficha clinica
- CONFIRMADA --> CANCELADA: Paciente (2h antes) o Admin (emergencia)
- CONFIRMADA --> NO_SHOW: Medico o Secretaria (despues de hora de cita)
- NO_SHOW --> RECONSULTA: Secretaria (crea nueva cita vinculada)
- COMPLETADA, CANCELADA: Estados terminales, no se puede volver atras
```
