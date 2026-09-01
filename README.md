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
- `packages/contracts`: `@newcastle/contracts`, the shared API and sync contracts

## Desktop App (`apps/desktop`)

Local development:

```bash
pnpm --filter @newcastle/desktop dev
```

Build:

```bash
pnpm --filter @newcastle/desktop build
```

## Sync Backend (`apps/server`)

`@newcastle/server` is a sync backend for:

- subscriptions
- playback checkpoints and history
- current cross-device resume position
- syncable playback preferences

Local development:

```bash
pnpm --filter @newcastle/server dev
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

- [Export OPML from Cosmos (小宇宙)](docs/opml-cosmos.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
