FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web ./
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
RUN apt-get update       && apt-get install -y --no-install-recommends dumb-init ca-certificates       && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/.output ./.output
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
RUN npx playwright install --with-deps chromium
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3       CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) throw new Error('unhealthy') }).catch(() => process.exit(1))"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]
