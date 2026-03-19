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
bun run check
```

To apply automatic fixes and formatting:

```bash
bun run lint:fix
bun run format
```

## Production

Build and preview locally:

```bash
bun run build
bun run preview
```
