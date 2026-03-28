FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .

# Install all deps (including devDeps for building)
RUN pnpm install --frozen-lockfile

# Build everything
RUN pnpm --filter shared build
RUN pnpm --filter client build
RUN pnpm --filter server build

# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy only what's needed to run
COPY --from=base /app/server/dist ./server/dist
COPY --from=base /app/server/package.json ./server/package.json
COPY --from=base /app/shared/dist ./shared/dist
COPY --from=base /app/shared/package.json ./shared/package.json
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install production deps only
RUN pnpm install --prod --frozen-lockfile

EXPOSE 4000
ENV PORT=4000
CMD ["node", "server/dist/index.js"]
