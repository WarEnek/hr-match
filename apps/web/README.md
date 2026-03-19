# hr-match web app

Nuxt 3 application for ATS-safe CV generation.

## Setup

Install dependencies with Bun:

```bash
bun install
```

## Development

Start the development server on `http://localhost:3000`:

```bash
bun run dev
```

## Quality checks

```bash
bun run lint
bun run format:check
bun run typecheck
bun run test:run
bun run check
```

To apply automatic fixes and formatting:

```bash
bun run lint:fix
bun run format
```

## Security-related environment

- `NOVITA_ALLOWED_HOSTS` — comma-separated hostnames allowed for outbound LLM HTTP calls (must include the host of `NOVITA_BASE_URL`).
- `ALLOW_INSECURE_LLM_HTTP=true` — only in development: allows `http://127.0.0.1` / `http://localhost` when those hosts are listed in `NOVITA_ALLOWED_HOSTS`.
- `INTERNAL_WORKER_TOKEN` — required for `POST /api/internal/embeddings/run`; use a dedicated secret (do not reuse `NUXT_SESSION_SECRET`).

## Production

Build and preview locally:

```bash
bun run build
bun run preview
```

Run tests in watch mode or with coverage:

```bash
bun run test
bun run test:coverage
```
