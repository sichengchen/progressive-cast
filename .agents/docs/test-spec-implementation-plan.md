# Test Spec Implementation Plan

## Scope

Implement focused tests from `.agents/specs` at the existing service/API boundaries:

- Desktop main services: RSS, library, playback, downloads, sync, settings.
- Server domain service: sync merge/mutation/preference/realtime behavior.
- Server HTTP app: operational routes, auth, structured errors, sync endpoints, realtime tickets.

Renderer-only scenarios will be covered only where there is an existing testable store/service boundary. Avoid adding a new UI test stack for this pass.

## Execution

1. Add missing desktop service tests around the current `node:test` harness.
2. Add missing server Vitest cases around `createTestServer`, in-memory repositories, and test realtime coordinator.
3. Run desktop and server tests.
4. Make minimal implementation fixes for spec mismatches revealed by those tests.
