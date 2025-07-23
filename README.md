# Progressive Cast

A PWA podcast player.

## Tech Stack

- [Next.js](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Dexie.js](https://dexie.org/)

## Quick Start

### Deploy with Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsichengchen%2Fprogressive-cast&demo-title=Progressive%20Cast&demo-description=A%20PWA%20podcast%20player.&demo-url=https%3A%2F%2Fcast.scchan.moe)

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Building for Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

## Usage

1. **Add Your First Podcast**: Click "Add Podcast" and paste an RSS feed URL
2. **Import Existing Subscriptions**: Use "Import OPML" to bulk-add from another app
3. **Start Listening**: Click any episode to begin playback

### Additional Docs
- [Export OPML from Cosmos (小宇宙)](docs/opml-cosmos.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
