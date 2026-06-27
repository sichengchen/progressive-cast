# Episode Pagination Plan

## Goal

Avoid loading every episode when opening a podcast or the home feed. Load an initial page, then fetch the next page only when the user reaches the end of the rendered list.

## Contract

- Main process exposes paged local episode queries:
  - latest episodes across podcasts by `published_at DESC`
  - episodes for one podcast by `published_at DESC`
- Renderer store keeps page metadata per source and appends pages without replacing already visible rows.
- Episode lists trigger `load more` through an intersection observer instead of a fixed settings count.

## Scope

- Keep existing broad episode APIs only for current secondary views that still depend on them.
- Do not change RSS import or refresh behavior.
