# Brainworks

Tutoring enrollment and scheduling app. Planning documents are in `00-README.md` through `05-open-questions.md`.

## Local development

Requirements: Node 22+, npm, and either Docker Desktop or a Neon dev branch for the database.

```bash
npm install
cp .env.example .env.local      # then edit if needed
docker compose up -d            # local Postgres (skip if using a Neon branch URL in .env.local)
npm run dev                     # http://localhost:3000, health check at /api/health
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` | ESLint (includes layer-boundary rules) |
| `npm run format` / `format:check` | Prettier |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:unit` | Vitest unit tests |
| `npm run test:integration` | Vitest integration tests (needs `DATABASE_URL`) |
| `npm run test:e2e` | Playwright (starts the dev server, or set `PLAYWRIGHT_BASE_URL`) |

## Layers

See `01-architecture-and-stack.md`. API routes call services; only repositories touch the database; `src/domain` is pure TypeScript. ESLint enforces this.

## Environment variables

Validated at startup by `src/lib/env.ts`. See `.env.example`. Real values live in Vercel (per environment) and in `.env.local`, never in git.
