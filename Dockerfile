FROM node:24.21.0-bookworm-slim AS base

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:/usr/local/bin:$PATH" \
    NEXT_TELEMETRY_DISABLED=1

RUN npm install -g pnpm@12.11.2

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --home-dir /app --shell /usr/sbin/nologin nextjs

COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nextjs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=build --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --from=build --chown=nextjs:nodejs /app/knexfile.ts ./knexfile.ts
COPY --from=build --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=build --chown=nextjs:nodejs /app/seeds ./seeds
COPY --from=build --chown=nextjs:nodejs /app/src/server/passwords.ts ./src/server/passwords.ts

RUN mkdir -p /app/data/login-backgrounds && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

CMD ["pnpm", "start"]
