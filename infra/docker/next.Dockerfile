# Builds either Next.js app from the monorepo: --build-arg APP=web | admin
ARG APP=web

FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY packages/ui/package.json packages/ui/
RUN npm ci

FROM node:22-alpine AS build
ARG APP
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @slaf/${APP}

FROM node:22-alpine
ARG APP
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/${APP}/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=build --chown=node:node /repo/apps/${APP}/public ./apps/${APP}/public
USER node
ENV APP_DIR=apps/${APP}
CMD ["sh", "-c", "node ${APP_DIR}/server.js"]
