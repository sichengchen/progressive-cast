# Progressive Cast

A podcast player.

## Tech Stack

- [Vite+](https://viteplus.dev/)
- [React](https://react.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Router](https://tanstack.com/router/latest)
- [Hono](https://hono.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Dexie.js](https://dexie.org/)
- [Drizzle ORM](https://orm.drizzle.team/)

## Workspace

- `apps/pwa`: `@pgcast/pwa`, the local-first podcast player PWA
- `apps/server`: `@pgcast/server`, the personal sync backend
- `packages/contracts`: `@pgcast/contracts`, the shared API and sync contracts

## PWA (`apps/pwa`)

The PWA stays fully usable without any backend configured.

### Personal Sync Backend

The PWA can connect to a personal sync backend from **Settings → Sync Backend**.

Users provide:

- a backend endpoint
- a personal bearer token

The UI does not assume Cloudflare. Any compatible deployment that implements the shared API contract works. Cloudflare is the recommended reference deployment.

### Cloudflare Workers Deployment

The PWA is now set up to deploy as static assets plus a Worker-backed `/api/*` layer.

If you want the PWA and the personal sync backend deployed together, use the repo script:

```bash
pnpm cf:deploy
```

The script will:

- prompt for the Worker names and an optional D1 location hint
- create or reuse the server D1 database
- generate the personal bearer token and realtime signing secret
- save those generated values to `.env.cloudflare-workers`
- apply the server migrations
- deploy the server Worker and the PWA Worker

When it finishes, it prints the PWA URL, the server URL, and the generated personal token to paste into **Settings → Sync Backend**.

```bash
pnpm --filter @pgcast/pwa cf:check
pnpm --filter @pgcast/pwa cf:deploy
```

The deployment config lives in [apps/pwa/wrangler.jsonc](/Users/sichengchen/src/progressive-cast/apps/pwa/wrangler.jsonc). Update the Worker `name`, and add `routes` or a custom domain there before production deployment if needed.

## Personal Sync Backend (`apps/server`)

`@pgcast/server` is a single-tenant personal sync backend for:

- subscriptions
- playback checkpoints and history
- current cross-device resume position
- syncable playback preferences

The runtime auth model is intentionally simple: every request uses `Authorization: Bearer <token>`.

### Portability

The server is architected so that:

- core sync logic is not tied to Cloudflare runtime types
- Hono routes depend on interfaces instead of deployment bindings
- Cloudflare Worker + D1 + Durable Objects is the shipped reference deployment, not a product requirement

### Reference Deployment

Cloudflare is the recommended deployment target for v1. Configure:

- a D1 database bound as `DB`
- a secret `PGCAST_API_TOKEN`
- a secret `PGCAST_REALTIME_TICKET_SECRET`
- a Durable Object binding `PLAYBACK_COORDINATOR`

Local development:

```bash
pnpm --filter @pgcast/server dev
```

Production deployment for the server is handled by `pnpm cf:deploy`, which also creates the D1 database when needed and generates the personal bearer token used by the PWA.

The reference worker runs on [http://localhost:8788](http://localhost:8788), so the PWA can be pointed at that endpoint from Settings during development.

## Quick Start

### Development

```bash
pnpm install
pnpm dev
```

The PWA client runs on [http://localhost:3000](http://localhost:3000). The PWA's local Hono API still runs inside `@pgcast/pwa`, and the personal sync backend runs separately on port `8788`.

### Building for Production

```bash
pnpm build
pnpm preview
```

### Checks and Tests

```bash
pnpm check
pnpm test
```

### Additional Docs

- [Export OPML from Cosmos (小宇宙)](docs/opml-cosmos.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
