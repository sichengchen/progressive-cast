# Electron Client Refactor Slice

## Scope

This slice creates `apps/desktop` as the new Newcastle desktop client boundary.

It intentionally does not migrate the full PWA UI yet. The goal is to make the Electron runtime shape real first:

- Electron main process owns local capabilities.
- Renderer talks only through typed preload IPC.
- Main modules are split by responsibility: library, episodes, downloads, playback, sync, settings, and database.
- The renderer starts as a small Newcastle shell that can exercise the IPC contract.

## Non-Goals

- No package-wide rename from `pgcast` yet.
- No PWA survival path.
- No media endpoints added to the server.
- No universal app abstraction.
- No SQLite driver choice locked before the first data repository implementation.

## Next Slice

Implement SQLite-backed repositories behind `apps/desktop/src/main/db.ts`, then wire `library.subscribe(feedUrl)` to RSS fetching and persistence.
