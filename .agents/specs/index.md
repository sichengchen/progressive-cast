# Newcastle BDD Spec Index

These specs describe expected behavior for future test implementation. Each file is scoped to one testable boundary so service, integration, or UI tests can be added without reading a single large document.

## Spec Files

- `desktop-library-rss.feature`: RSS fetching/parsing, subscription lifecycle, episode listing, and podcast refresh.
- `desktop-playback.feature`: playback source selection, progress persistence, resume/completion behavior, and player controls.
- `desktop-downloads.feature`: episode download, failure handling, local file preference, deletion, and storage stats.
- `desktop-opml-preferences.feature`: OPML import/export and local user preferences.
- `desktop-sync-client.feature`: local sync settings, outbox flushing, and remote state application.
- `server-sync-api.feature`: public HTTP routes, auth, CORS, JSON errors, and sync API endpoints.
- `server-sync-domain.feature`: server-side merge, validation, normalization, preferences, and realtime publishing.
- `realtime.feature`: realtime ticket issuance, websocket authorization, connection, and broadcast behavior.

## Test Mapping

- Desktop service tests should prefer the `apps/desktop/src/main/*` service boundary when a scenario does not require renderer state.
- Renderer/store tests should use the desktop feature files only for behavior that depends on store state, UI state, or browser APIs.
- Server domain tests should target `apps/server/src/core/*` without HTTP when the scenario is about merge or normalization rules.
- Server API tests should target `apps/server/src/adapters/http/create-app.ts` when the scenario is about routes, status codes, auth, or response shape.
