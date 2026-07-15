ARG NODE_VERSION=24
ARG API_PORT=3001
ARG APP_NAME=base-iam

FROM node:${NODE_VERSION}-alpine AS deps
ARG APP_NAME
RUN apk update && apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json ./
COPY common/compiled/node/package.json ./common/compiled/node/
COPY common/vanilla/iso/package.json ./common/vanilla/iso/
COPY common/schemas/ ./common/schemas/
COPY apps/${APP_NAME}/package.json ./apps/${APP_NAME}/
RUN npm ci --omit=dev --workspace=common/compiled/node --workspace=apps/${APP_NAME}

FROM node:${NODE_VERSION}-alpine AS build
ARG APP_NAME
WORKDIR /app
COPY common/compiled/node/ ./common/compiled/node/
COPY common/vanilla/iso/ ./common/vanilla/iso/
COPY common/schemas/ ./common/schemas/
COPY apps/${APP_NAME}/ ./apps/${APP_NAME}/

FROM node:${NODE_VERSION}-alpine AS production
ARG APP_NAME
ARG API_PORT
RUN apk update && apk upgrade --no-cache \
    && addgroup -S appgroup \
    && adduser  -S appuser -G appgroup
WORKDIR /app
COPY --from=deps  /app/node_modules                    ./node_modules/
COPY --from=build /app/common/compiled/node            ./common/compiled/node/
COPY --from=build /app/common/vanilla/iso              ./common/vanilla/iso/
COPY --from=build /app/common/schemas                  ./common/schemas/
COPY --from=build /app/apps/${APP_NAME}                ./apps/${APP_NAME}/
COPY --from=deps  /app/apps/${APP_NAME}/node_module[s]          ./apps/${APP_NAME}/node_modules/
COPY --from=deps  /app/common/compiled/node/node_module[s]      ./common/compiled/node/node_modules/
WORKDIR /app/apps/${APP_NAME}
USER appuser
EXPOSE ${API_PORT}
CMD ["node", "src/index.js"]
