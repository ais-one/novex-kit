# Set Node Version - version 24
ARG NODE_VERSION=24.22.1
ARG API_PORT=4000
ARG APP_NAME=cron

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps
ARG APP_NAME

# Install security updates
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json package-lock.json ./
COPY common/compiled/node/package.json ./common/compiled/node/
COPY common/vanilla/iso/package.json ./common/vanilla/iso/
COPY common/schemas/ ./common/schemas/
COPY apps/${APP_NAME}/package.json ./apps/${APP_NAME}/

# npm workspaces: installs all deps hoisted to /app/node_modules
RUN npm ci --omit=dev --workspace=common/compiled/node --workspace=apps/${APP_NAME}

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS build
ARG APP_NAME

WORKDIR /app

COPY common/compiled/node/ ./common/compiled/node/
COPY common/vanilla/iso/ ./common/vanilla/iso/
COPY common/schemas/ ./common/schemas/
COPY apps/${APP_NAME}/ ./apps/${APP_NAME}/

# ─── Stage 3: runtime image ───────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runtime
ARG APP_NAME
ARG API_PORT

RUN apk update && apk upgrade --no-cache \
    && addgroup -S appgroup \
    && adduser  -S appuser -G appgroup

WORKDIR /app

# Copy production node_modules (hoisted by npm workspaces) and source
COPY --from=deps  /app/node_modules                    ./node_modules/
COPY --from=build /app/common/compiled/node            ./common/compiled/node/
COPY --from=build /app/common/vanilla/iso              ./common/vanilla/iso/
COPY --from=build /app/common/schemas                  ./common/schemas/
COPY --from=build /app/apps/${APP_NAME}                ./apps/${APP_NAME}/

# Copy app-level node_modules if they exist (non-hoisted deps)
# node_module[s] glob makes COPY a no-op when the directory is absent
COPY --from=deps  /app/apps/${APP_NAME}/node_module[s]          ./apps/${APP_NAME}/node_modules/
COPY --from=deps  /app/common/compiled/node/node_module[s]      ./common/compiled/node/node_modules/

# Set final WORKDIR before dropping to non-root user
WORKDIR /app/apps/${APP_NAME}

# Drop to non-root user
USER appuser

EXPOSE ${API_PORT}

# Healthcheck uses $API_PORT via shell expansion
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD wget -qO- http://localhost:${API_PORT}/health || exit 1

CMD ["node", "src/index.js"]
