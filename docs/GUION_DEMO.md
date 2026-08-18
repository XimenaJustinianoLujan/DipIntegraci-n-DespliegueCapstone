# Guion de Demostracion — Plataforma de Citas Medicas

Guion paso a paso para presentar el sistema desplegado en la nube. Duracion estimada:
**8–12 minutos**.

## URLs del sistema

| Recurso | URL |
|---------|-----|
| Aplicacion (frontend) | https://dip-integraci-n-despliegue-capstone.vercel.app |
| API — health check | https://dipintegraci-n-desplieguecapstone-production.up.railway.app/api/health |

## Usuarios de demostracion

| Rol | Email / Usuario | Contrasena |
|-----|-----------------|------------|
| Paciente | `paciente@clinica.com` | `Paciente123!` |
| Medico | `medico@clinica.com` (o `dr.garcia`) | `Medico123!` |
| Secretaria | `secretaria@clinica.com` (o `secretaria`) | `Secre123!` |
| Administrador | `admin@clinica.com` (o `admin`) | `Admin123!` |

---

## Antes de empezar (checklist 5 min antes)

- [ ] Re-ejecutar el seed para tener una **cita de hoy** fresca: en Railway → servicio backend → **Console** → `npm run seed`.
- [ ] Abrir el sitio y hacer **login de prueba** con el paciente (para "despertar" el backend, evita la demora del primer arranque).
- [ ] Tener esta tabla de credenciales a la vista.
- [ ] Abrir en una pestana aparte el **`/api/health`** (para mostrar el backend vivo).
- [ ] Cerrar sesion antes de empezar la demo real (para arrancar desde el login).

> Tip: abre el navegador en pantalla completa y con zoom al 110–125% para que se lea bien.

---

## Parte 0 — Introduccion (1 min)

> "Presento la **Plataforma de Citas Medicas**, un sistema web para gestionar citas
> en una clinica, con cuatro roles: paciente, medico, secretaria y administrador.
> Esta **desplegado completamente en la nube**: el frontend en Vercel, el backend y la
> base de datos PostgreSQL en Railway, integrados mediante una API REST."

Muestra el **diagrama de arquitectura** (ver `docs/DESPLIEGUE.md`) o descríbelo:

```
Navegador --> Frontend (Vercel, React+Vite) --HTTPS /api--> Backend (Railway, Docker+Express) --> PostgreSQL (Railway)
```

Opcional: abre la pestana de **`/api/health`** y muestra `{"status":"ok","environment":"production"}`
como prueba de que el backend esta operativo en produccion.

---

## Parte 1 — Rol PACIENTE (2–3 min)

1. En la pantalla de login, ingresa con `paciente@clinica.com` / `Paciente123!`.
2. **Dashboard**: senala el saludo personalizado ("Bienvenido/a, Ximena") y el "Panel del paciente".
3. Ve a **Agendar Cita** y realiza el flujo en cascada:
   - **Especialidad**: elige *Medicina General*.
   - **Medico**: elige *Dr. Carlos Garcia* (aparece al elegir la especialidad).
   - **Fecha**: elige un dia habil proximo (el medico tiene agenda para los proximos 21 dias).
   - **Horario disponible**: se cargan los bloques libres; selecciona uno.
   - Clic en **Confirmar Cita** → mensaje "Cita agendada exitosamente con estado CONFIRMADA".
4. Ve a **Mis Citas**: muestra la cita recien creada con su estado.

> **Reglas de negocio que puedes mencionar:** maximo 3 citas activas por paciente,
> minimo 24 horas de anticipacion, y validacion de horarios segun la agenda del medico.

---

## Parte 2 — Rol MEDICO (2 min)

1. Cierra sesion e ingresa con `medico@clinica.com` / `Medico123!`.
2. **Dashboard del medico**: muestra "Citas de Hoy" — aparece la **cita de demostracion**
   (Ximena) que crea el seed.
3. Ve a **Atender Paciente**:
   - En la lista "Citas Confirmadas de Hoy", haz clic en la cita de la paciente.
   - Completa la **Ficha Clinica**: Diagnostico (obligatorio), Indicaciones, Receta.
   - (Opcional) Adjunta un documento (PDF/imagen).
   - Clic en **Guardar Ficha y Completar Cita** → la cita pasa a estado **COMPLETADA**.
4. Menciona el boton **NO_SHOW** (cuando el paciente no se presenta).

> **Punto fuerte:** aqui se ve el control de acceso por rol — el medico solo ve y
> gestiona SUS citas, y solo el medico puede crear fichas clinicas.

---

## Parte 3 — Rol SECRETARIA (1–2 min)

1. Cierra sesion e ingresa con `secretaria@clinica.com` / `Secre123!`.
2. **Panel de secretaria**: tabla de citas del dia (filtro por fecha arriba).
3. Sobre una cita CONFIRMADA, muestra el boton **NO_SHOW** (marcar inasistencia).
4. Explica que una cita en NO_SHOW puede pasarse a **RECONSULTA** (reagendar al paciente).

> Cambia el filtro de fecha para mostrar que puede consultar citas de cualquier dia.

---

## Parte 4 — Rol ADMINISTRADOR (1–2 min)

1. Cierra sesion e ingresa con `admin@clinica.com` / `Admin123!`.
2. **Panel de administracion**: indicadores de "Medicos Activos" y "Citas Hoy".
3. Ve a **Gestionar Medicos**: muestra que puede cambiar el estado de un medico
   (Activo / Baja / Vacacion).
4. Ve a **Turnos Domingo**: asigna un medico a un domingo para **emergencias**
   (atencion 24h sin cita previa, por orden de llegada).

> **Reglas de negocio:** los domingos son solo para emergencias, gestionadas por el
> administrador; los medicos en Baja o Vacacion no reciben citas.

---

## Parte 5 — Cierre tecnico: Integracion y Despliegue (1–2 min)

Este es el corazon del capstone. Resalta:

- **Monorepo desplegado con Docker**: el backend se construye con un `Dockerfile` y
  corre en Railway; la base PostgreSQL vive en el mismo proyecto.
- **Frontend en Vercel** (build de Vite), conectado al backend por la variable
  `VITE_API_URL`.
- **Integracion entre servicios**: autenticacion con **JWT**, control de acceso por
  **roles (RBAC)**, y configuracion de **CORS** para permitir el dominio del frontend.
- **Base de datos versionada**: 8 **migraciones** SQL ejecutables con `npm run migrate`
  y datos de demo con `npm run seed` (idempotente).
- **Calidad**: 46 pruebas automatizadas (Jest) que pasan.
- **CI implicito**: cada `git push` a `main` redespliega backend (Railway) y frontend
  (Vercel) automaticamente.

Cierra mostrando el repositorio en GitHub y la guia `docs/DESPLIEGUE.md`.

---

## Posibles preguntas del jurado (y respuestas)

- **¿Como se protegen las rutas?** Con middleware de autenticacion JWT + autorizacion
  por rol; el frontend usa rutas protegidas (`ProtectedRoute`).
- **¿Que pasa si dos pacientes piden el mismo horario?** Un indice unico parcial en la
  base impide dos citas activas en el mismo bloque del mismo medico.
- **¿Los datos persisten?** Si, en PostgreSQL gestionado (Railway) con volumen propio.
- **¿Y los emails?** El sistema los soporta (confirmacion, recordatorio, cancelacion);
  en la demo estan en modo consola porque no configuramos un SMTP real.
- **¿Como escalarias?** Separar almacenamiento de archivos a un servicio de objetos
  (S3/Blob), agregar un cron para recordatorios y CI/CD con pruebas antes del deploy.

---

## Plan B (si algo falla en vivo)

- **El primer login tarda**: el contenedor estaba dormido; reintenta (por eso conviene
  el "warm-up" del checklist).
- **No aparece la cita de hoy**: vuelve a correr `npm run seed` en la Console de Railway.
- **Error de conexion**: verifica `/api/health`; si responde, es el frontend — refresca
  con Ctrl+F5.
- **Sin internet**: ten grabado un video corto de respaldo del flujo completo.
