# Guia de Despliegue en la Nube

Esta guia despliega la **Plataforma de Citas Medicas** completa y gratuita usando:

| Componente     | Servicio            | Costo   |
|----------------|---------------------|---------|
| Base de datos  | **Neon** (PostgreSQL serverless) | Gratis |
| Backend (API)  | **Vercel** (Node serverless)     | Gratis |
| Frontend (SPA) | **Vercel** (sitio estatico)      | Gratis |

Arquitectura resultante:

```
  Navegador
     |
     v
 [ Frontend en Vercel ]  --- HTTPS /api --->  [ Backend en Vercel ]
  (React + Vite)                               (Express serverless)
                                                     |
                                                     v
                                              [ Neon PostgreSQL ]
```

> Nota: el envio de emails (SMTP) es **opcional**. Si no lo configuras, el sistema
> funciona igual: los correos solo se registran en la consola en vez de enviarse.

---

## Requisitos previos

- Cuenta de **GitHub** (el repositorio ya esta subido).
- Cuenta de **Neon** -> https://neon.tech (registrate con GitHub).
- Cuenta de **Vercel** -> https://vercel.com (registrate con GitHub).
- **Node.js >= 18** instalado localmente (solo para correr migraciones y seed una vez).

---

## Paso 1 — Crear la base de datos en Neon

1. Entra a https://console.neon.tech y crea un nuevo proyecto (ej. `gestion-clinica`).
2. Elige la region mas cercana (ej. AWS `us-east`).
3. Cuando termine, abre **Connection Details** y copia la **connection string**.
   - Usa la opcion **Pooled connection** (recomendada para serverless).
   - Tiene esta forma:
     ```
     postgresql://usuario:password@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
4. Guarda esa URL: es tu `DATABASE_URL`.

---

## Paso 2 — Crear las tablas y cargar datos de demo

Esto se hace **una sola vez**, desde tu computadora, apuntando a la base de Neon.

```bash
cd backend
npm install

# Crea un archivo .env con tu URL de Neon
cp .env.example .env
# Edita .env y pega tu DATABASE_URL de Neon. Genera tambien los secretos JWT:
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(48).toString('hex'))"

# Crea todas las tablas (8 migraciones)
npm run migrate

# Carga usuarios de demo + agenda del medico
npm run seed
```

Si todo sale bien veras las tablas creadas y los usuarios de demo listados.

### Usuarios de demostracion

| Rol           | Email                    | Usuario     | Contrasena     |
|---------------|--------------------------|-------------|----------------|
| Administrador | admin@clinica.com        | admin       | `Admin123!`    |
| Medico        | medico@clinica.com       | dr.garcia   | `Medico123!`   |
| Secretaria    | secretaria@clinica.com   | secretaria  | `Secre123!`    |
| Paciente      | paciente@clinica.com     | —           | `Paciente123!` |

> El paciente de demo ya tiene el email verificado, asi que puede iniciar sesion
> directamente. El medico de demo tiene agenda disponible los proximos 21 dias.

---

## Paso 3 — Desplegar el Backend en Vercel

1. En https://vercel.com haz clic en **Add New... > Project** e importa tu repositorio
   `DipIntegraci-n-DespliegueCapstone`.
2. En la configuracion del proyecto:
   - **Root Directory**: selecciona `backend`.
   - Framework Preset: **Other**.
3. Abre **Environment Variables** y agrega:

   | Nombre               | Valor                                              |
   |----------------------|----------------------------------------------------|
   | `DATABASE_URL`       | *(tu connection string pooled de Neon)*            |
   | `JWT_SECRET`         | *(el secreto generado en el Paso 2)*               |
   | `JWT_REFRESH_SECRET` | *(el segundo secreto generado en el Paso 2)*       |
   | `NODE_ENV`           | `production`                                        |
   | `FRONTEND_URL`       | `https://PENDIENTE` *(se completa en el Paso 5)*   |

4. Haz clic en **Deploy**. Al terminar tendras una URL como
   `https://tu-backend.vercel.app`.
5. **Verifica** que responde abriendo en el navegador:
   `https://tu-backend.vercel.app/api/health`
   Debe devolver `{"status":"ok",...}`.

> Guarda la URL del backend: la necesitas en el Paso 4.

---

## Paso 4 — Desplegar el Frontend en Vercel

1. De nuevo **Add New... > Project** e importa **el mismo repositorio**.
2. Configuracion:
   - **Root Directory**: selecciona `frontend`.
   - Framework Preset: **Vite** (Vercel lo detecta solo).
3. Environment Variables:

   | Nombre         | Valor                                     |
   |----------------|-------------------------------------------|
   | `VITE_API_URL` | `https://tu-backend.vercel.app/api`       |

   *(Usa la URL real del backend del Paso 3, terminada en `/api`.)*
4. **Deploy**. Obtendras una URL como `https://tu-frontend.vercel.app`.

---

## Paso 5 — Conectar backend y frontend (CORS)

El backend solo acepta peticiones desde la URL que tenga en `FRONTEND_URL`.

1. Ve al proyecto **backend** en Vercel -> **Settings > Environment Variables**.
2. Edita `FRONTEND_URL` y pon la URL real del frontend: `https://tu-frontend.vercel.app`
   (sin barra `/` al final).
3. Ve a la pestana **Deployments** del backend y haz **Redeploy** del ultimo despliegue
   para que tome el nuevo valor.

Listo. Abre `https://tu-frontend.vercel.app`, inicia sesion con cualquiera de los
usuarios de demo y prueba el flujo completo.

---

## Desarrollo local (opcional)

Para correr el proyecto en tu maquina necesitas un PostgreSQL local **o** puedes
apuntar al mismo Neon.

**Backend:**
```bash
cd backend
npm install
cp .env.example .env      # configura DATABASE_URL y los JWT_*
npm run migrate           # solo la primera vez
npm run seed              # solo la primera vez
npm run dev               # http://localhost:3000
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:3000/api
npm run dev               # http://localhost:5173
```

---

## Solucion de problemas

| Sintoma | Causa probable | Solucion |
|---------|----------------|----------|
| `/api/health` no responde | Backend no desplegado o error de arranque | Revisa los **Logs** del proyecto backend en Vercel |
| Error CORS en el navegador | `FRONTEND_URL` del backend no coincide con la URL real del frontend | Corrige `FRONTEND_URL` y haz **Redeploy** (Paso 5) |
| `password authentication failed` | `DATABASE_URL` incorrecta | Vuelve a copiar la connection string **pooled** de Neon |
| El login del paciente dice "verifique su email" | Ese paciente no esta verificado | Usa `paciente@clinica.com` (seed) o verifica desde la base |
| `JWT_SECRET ... required in production` | Faltan variables JWT en Vercel | Agrega `JWT_SECRET` y `JWT_REFRESH_SECRET` |
| La subida de archivos a la ficha clinica no persiste | En serverless `/tmp` es efimero | Limitacion conocida; produccion real usaria almacenamiento de objetos (S3 / Vercel Blob) |

---

## Notas sobre produccion (mejoras futuras)

- **Almacenamiento de archivos**: mover las subidas de la ficha clinica a un servicio
  de objetos (Amazon S3, Vercel Blob) en vez de `/tmp`.
- **Emails reales**: configurar `SMTP_USER`/`SMTP_PASSWORD` (ej. cuenta de Gmail con
  contrasena de aplicacion) para enviar confirmaciones y recordatorios.
- **Recordatorios automaticos**: los recordatorios de 24h requieren un cron job
  (ej. Vercel Cron) que invoque el envio periodicamente.
