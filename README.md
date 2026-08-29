# Plataforma de Citas Medicas

Sistema integral para la gestion de citas medicas en clinicas y consultorios. Permite a pacientes agendar citas, a medicos gestionar sus horarios y atender pacientes, y a administradores supervisar las operaciones de la clinica.

## Demo en vivo

| Recurso | URL |
|---------|-----|
| Aplicacion (frontend) | https://dip-integraci-n-despliegue-capstone.vercel.app |
| API — health check | https://dipintegraci-n-desplieguecapstone-production.up.railway.app/api/health |

Usuarios de prueba y guion de demostracion paso a paso en **[docs/GUION_DEMO.md](docs/GUION_DEMO.md)**.

## Caracteristicas principales

- Registro y autenticacion de usuarios con verificacion por email
- Gestion de citas medicas con reglas de negocio (maximo 3 activas, minimo 24h
  de anticipacion salvo que el horario siga libre el mismo dia, cancelacion
  con 2h de anticipacion minima)
- Gestion de horarios y agenda de medicos (L-V 8:00-19:00, Sab 8:00-13:00)
- Ficha clinica con diagnostico, indicaciones, recetas y documentos adjuntos
  (analisis, radiografias) que el paciente puede descargar
- Historial clinico del paciente visible para el medico al atender (evita
  atender "a ciegas") y notas privadas por cita (solo medico tratante y
  administracion, nunca visibles para el paciente)
- Alerta de cita proxima en el dashboard (paciente: dentro de 24h; medico:
  dentro de 2h) calculada en el momento, sin cron ni emails automaticos
- Panel de administracion con control de emergencias y turnos dominicales
- Notificaciones por email: confirmacion al agendar y cancelacion cuando
  cancela un administrador (el recordatorio 24h y la cancelacion por el
  propio paciente no disparan email, solo quedan en el registro de auditoria)
- Registro de auditoria de todas las operaciones
- Control de acceso basado en roles (Paciente, Medico, Administrador, Secretaria)
- Interfaz responsive (escritorio, tablet y movil) con menu de navegacion adaptable
- Accesibilidad: labels vinculados a sus campos, foco de teclado visible y enlace
  para saltar la navegacion
- CI con GitHub Actions: corre los tests del backend y el build+lint del
  frontend en cada push/PR a `main`

## Estructura del proyecto

```
gestionClinica-app/
├── backend/                 # API REST con Node.js + Express
│   ├── src/
│   │   ├── config/         # Configuracion (database, env)
│   │   ├── middleware/     # Auth, autorizacion, rate limiting, validacion
│   │   ├── models/         # Modelos de datos (Paciente, Medico, Cita, etc.)
│   │   ├── routes/         # Rutas de la API REST
│   │   │   └── admin/      # Subrouters de /api/admin (citas, medicos,
│   │   │                   #   especialidades, turnos-domingo, stats)
│   │   ├── services/       # Logica de negocio
│   │   ├── utils/          # Utilidades (sanitizeCita: oculta las notas
│   │   │                   #   privadas del medico en respuestas a paciente/secretaria)
│   │   ├── validators/     # Esquemas de validacion
│   │   └── index.js        # Punto de entrada del servidor
│   ├── database/
│   │   └── migrations/     # Scripts SQL de migracion
│   ├── tests/              # Tests unitarios e integracion (Jest + Supertest)
│   ├── package.json
│   └── .env.example        # Variables de entorno de ejemplo
├── .github/workflows/       # CI: tests backend + build/lint frontend en cada push/PR
├── frontend/                # SPA con React + Vite
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── config/         # Configuracion (API client)
│   │   ├── context/        # Contextos de React (Auth, Theme)
│   │   ├── utils/          # Utilidades (clases de badge por estado de cita,
│   │   │                   #   calculo de "cita proxima" para las alertas)
│   │   └── pages/          # Paginas organizadas por rol
│   │       ├── patient/    # Vistas del paciente
│   │       ├── doctor/     # Vistas del medico
│   │       ├── admin/      # Vistas del administrador
│   │       └── secretary/  # Vistas de la secretaria
│   ├── public/             # Archivos estaticos
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── docs/                    # Documentacion del proyecto
│   ├── SDD-v3.md           # Diseno del sistema (fiel al codigo actual)
│   ├── DBD-v3.md           # Diseno de base de datos (fiel al codigo actual)
│   ├── BDD-v2.md           # Escenarios BDD en Gherkin, fieles al codigo
│   ├── Diagramas-v2.md     # Diagramas de secuencia, fieles al codigo
│   ├── SDD-v2.md, DBD-v2.md, BDD.md, Diagramas.md  # versiones anteriores (historial)
│   ├── DESPLIEGUE.md       # guia de despliegue paso a paso
│   └── GUION_DEMO.md       # guion de demostracion por rol
└── README.md
```

## Requisitos previos

- Node.js >= 18.x
- PostgreSQL >= 14
- npm >= 9.x

## Instalacion y ejecucion

### Backend

```bash
# Entrar al directorio del backend
cd backend

# Instalar dependencias
npm install

# Copiar variables de entorno y configurar
cp .env.example .env
# Editar .env con tus valores reales (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET)

# Ejecutar migraciones de base de datos (crea todas las tablas en orden)
npm run migrate

# Cargar datos de demostracion (usuarios de cada rol + agenda del medico)
npm run seed

# Iniciar en modo desarrollo
npm run dev

# Iniciar en modo produccion
npm start

# Ejecutar tests
npm test
```

### Frontend

```bash
# Entrar al directorio del frontend
cd frontend

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Construir para produccion
npm run build

# Preview de la build
npm run preview
```

## Despliegue en la nube

La instancia de demostracion corre en **Railway** (backend con Docker + PostgreSQL,
todo en el mismo proyecto) y **Vercel** (frontend). La guia paso a paso
**[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)** documenta una ruta alternativa
equivalente con Neon en vez de la base de Railway; los pasos de migraciones,
seed y variables de entorno aplican igual en ambos casos.

## Variables de entorno

El backend requiere las siguientes variables de entorno (ver `backend/.env.example`):

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexion a PostgreSQL | `postgresql://user:password@host/dbname?sslmode=require` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | `your_jwt_secret_here` |
| `JWT_REFRESH_SECRET` | Secreto para firmar refresh tokens | `your_refresh_secret_here` |
| `JWT_EXPIRES_IN` | Tiempo de expiracion del token | `24h` |
| `PORT` | Puerto del servidor | `3000` |
| `SMTP_HOST` | Host del servidor SMTP | `smtp.example.com` |
| `SMTP_PORT` | Puerto del servidor SMTP | `587` |
| `SMTP_USER` | Usuario SMTP (vacio = no se envian emails) | `user@example.com` |
| `SMTP_PASSWORD` | Contrasena SMTP | `your_password` |
| `EMAIL_FROM` | Remitente de emails | `noreply@clinica.com` |
| `FRONTEND_URL` | URL del frontend (para links en emails) | `http://localhost:5173` |
| `NODE_ENV` | Entorno de ejecucion | `development` |

## API Endpoints principales

- `POST /api/auth/register` - Registro de pacientes
- `POST /api/auth/login` - Inicio de sesion
- `GET /api/medicos` - Listar medicos
- `POST /api/citas` - Crear cita
- `GET /api/citas/:id` - Ver detalle de cita
- `PATCH /api/citas/:id/cancelar` - Cancelar cita (paciente, min. 2h de anticipacion)
- `PATCH /api/citas/:id/notas` - Nota privada del medico sobre la cita (medico
  dueno o administrador; nunca visible para paciente/secretaria)
- `POST /api/agenda` - Cargar horario de medico
- `POST /api/fichas-clinicas` - Crear ficha clinica
- `GET /api/fichas-clinicas/:pacienteId` - Historial clinico de un paciente
  (el propio paciente, o cualquier medico/administrador)
- `GET /api/fichas-clinicas/:id/documentos` - Documentos adjuntos de una ficha
  (analisis, radiografias); descarga en `.../documentos/:docId/download`

Para la documentacion completa de endpoints, ver `docs/SDD-v3.md`.

## Tecnologias

**Backend:**
- Node.js + Express
- PostgreSQL (pg)
- JWT (jsonwebtoken)
- bcryptjs
- nodemailer
- express-validator
- multer (subida de archivos)
- Jest + Supertest (testing)

**Frontend:**
- React 19
- Vite
- React Router
- React Hook Form
- Axios
- Day.js

## Licencia

ISC
