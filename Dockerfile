FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY pnpm-lock.yaml ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm --filter @crossing/server deploy --prod /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
RUN addgroup -S crossing && adduser -S crossing -G crossing && mkdir -p /data && chown crossing:crossing /data
COPY --from=build --chown=crossing:crossing /out ./
COPY --from=build --chown=crossing:crossing /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=crossing:crossing /app/apps/web/dist ./apps/web/dist
USER crossing
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["node", "apps/server/dist/index.js"]
