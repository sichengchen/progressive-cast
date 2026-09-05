# Rajio

A desktop podcast player.

## Tech Stack

- Electron
- React
- Vite
- Hono
- Drizzle ORM
- Cloudflare Workers + D1 for the reference sync backend

## Workspace

- `apps/desktop`: Electron desktop app
- `apps/server`: sync backend
- `packages/contracts`: `@rajio-app/contracts`, the shared API and sync contracts

## Desktop App (`apps/desktop`)

Local development:

```bash
pnpm --filter @rajio-app/desktop dev
```

Build:

```bash
pnpm --filter @rajio-app/desktop build
```

## Sync Backend (`apps/server`)

`@rajio-app/server` is a sync backend for:

- subscriptions
- playback checkpoints and history
- current cross-device resume position
- syncable playback preferences

Local development:

```bash
pnpm --filter @rajio-app/server dev
```

Production deployment:

```bash
pnpm cf:deploy
```

The deployment script creates or reuses the D1 database, applies migrations, deploys the server Worker, and prints the sync endpoint plus bearer token for Rajio desktop settings.

## Quick Start

```bash
pnpm install
pnpm dev
```

Checks and tests:

```bash
pnpm check
pnpm test
```

## Additional Docs

- [Product roadmap](docs/ROADMAP.md)
- [Export OPML from Cosmos (小宇宙)](docs/opml-cosmos.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
