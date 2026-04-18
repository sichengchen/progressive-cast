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

## PWA (`apps/pwa`)

`@pgcast/pwa`, the PWA podcast player.

### Cloudflare Workers Deployment

The PWA is now set up to deploy as static assets plus a Worker-backed `/api/*` layer.

```bash
pnpm --filter @pgcast/pwa cf:check
pnpm --filter @pgcast/pwa cf:deploy
```

The deployment config lives in [apps/pwa/wrangler.jsonc](/Users/sichengchen/src/progressive-cast/apps/pwa/wrangler.jsonc). Update the Worker `name`, and add `routes` or a custom domain there before production deployment if needed.

## Quick Start

### Development

```bash
pnpm install
pnpm dev
```

The PWA client runs on [http://localhost:3000](http://localhost:3000). The Hono API runs alongside it inside the `@pgcast/pwa` dev script.

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
