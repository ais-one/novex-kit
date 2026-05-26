## Digital Ocean CR
# username and password is same api token generated in DO dashboard
# CR_HOST=registry.digitalocean.com
# CR_NS=ais-one

## Digital Ocean App Platform:
# set liveness probe
# set Public HTTP port to 3000
# add VPC if need to connect to other services
# option to use dedicated (extra fee) or static egress IPs

# docker login --username $CR_USERNAME --password-stdin $CR_HOST
# docker build -t $CR_HOST/$CR_NS/$CR_IMAGENAME:${{ github.event.inputs.tag_ci }} \
#  --target $DOCKERFILE_TARGET \
#  --build-arg ARG_API_PORT=3000 \
#  $DOCKERFILE_PATH || exit 1001
# ARG <name>[=<default value>]
# E.G.
# ARG SETTINGS
# RUN ./run/init-stuff $SETTINGS
#
# ENV PORT $ARG_API_PORT
# ENV API_PORT $ARG_API_PORT
#

# Run from repo root
# docker build -f apps/sample-api/Dockerfile -t sample-api:latest .
# docker build \
#   -f apps/sample-api/Dockerfile \
#   --build-arg APP_NAME=sample-api \
#   --build-arg API_PORT=3000 \
#   -t novex-kit/sample-api:latest \
#   .

# Set Node Version - version 24
ARG NODE_VERSION=24
ARG API_PORT=3000
ARG APP_NAME=sample-api

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
COPY apps/sample-common/package.json ./apps/sample-common/

# npm workspaces: installs all deps hoisted to /app/node_modules
RUN npm ci --omit=dev --workspace=common/compiled/node --workspace=apps/sample-common --workspace=apps/${APP_NAME}

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS build
ARG APP_NAME

WORKDIR /app

COPY common/compiled/node/ ./common/compiled/node/
COPY common/vanilla/iso/ ./common/vanilla/iso/
COPY common/schemas/ ./common/schemas/
COPY apps/${APP_NAME}/ ./apps/${APP_NAME}/
COPY apps/sample-common/ ./apps/sample-common/

# ─── Stage 3: production image ────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS production
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
COPY --from=build /app/apps/sample-common              ./apps/sample-common/

# Copy app-level node_modules if they exist (non-hoisted deps)
# node_module[s] glob makes COPY a no-op when the directory is absent
COPY --from=deps  /app/apps/${APP_NAME}/node_module[s]          ./apps/${APP_NAME}/node_modules/
COPY --from=deps  /app/common/compiled/node/node_module[s]      ./common/compiled/node/node_modules/
COPY --from=deps  /app/apps/sample-common/node_module[s]          ./apps/sample-common/node_modules/

# Set final WORKDIR before dropping to non-root user
WORKDIR /app/apps/${APP_NAME}

# Drop to non-root user
USER appuser

EXPOSE ${API_PORT}

# Healthcheck uses $API_PORT via shell expansion
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD wget -qO- http://localhost:${API_PORT}/health || exit 1

CMD ["node", "src/index.js"]
