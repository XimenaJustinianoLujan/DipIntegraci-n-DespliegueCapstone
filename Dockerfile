# syntax=docker/dockerfile:1
# Imagen del backend (API Express) para Railway.
# El repositorio es un monorepo: la aplicacion vive en backend/.

FROM node:20-alpine

WORKDIR /app

# Instalar dependencias primero para aprovechar la cache de capas de Docker.
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copiar el codigo del backend.
COPY backend/ ./

ENV NODE_ENV=production

# Railway inyecta la variable PORT automaticamente; el servidor la usa (src/config/env.js).
CMD ["npm", "start"]
