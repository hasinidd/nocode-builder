# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production backend ───────────────────────────────────────────────
FROM node:20-alpine AS backend
WORKDIR /app

# Backend dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Backend source
COPY backend/ ./

# Copy built frontend into backend's public folder (served by Express)
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]
