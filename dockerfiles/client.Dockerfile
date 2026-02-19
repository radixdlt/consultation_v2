# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

FROM base AS pruner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN pnpm add -g turbo
WORKDIR /app
COPY . .
RUN turbo prune consultation-dapp --docker

FROM base AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install

FROM base AS builder
ARG VITE_ENV
ARG VITE_VOTE_COLLECTOR_URL
ARG VITE_PUBLIC_DAPP_DEFINITION_ADDRESS
ARG VITE_PUBLIC_NETWORK_ID
ENV VITE_ENV=$VITE_ENV
WORKDIR /app
COPY --from=deps /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter consultation-dapp build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 app
COPY --from=builder --chown=app:nodejs /app/apps/consultation/.output ./.output
USER app
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
