## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues; external PRs are not a triage request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

EsperKit triage roles use the default label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses single-context domain docs: one root `CONTEXT.md` plus root `docs/adr/`. See `docs/agents/domain.md`.

### Artifact rule

Artifacts are private by default. An agent may write into the repository only when the artifact is part of the codebase/product, or a durable project record intentionally consumed by the project workflow. Agent process notes, temporary plans, reasoning, handoffs, review scratch, and session state must stay outside the repository unless the user explicitly asks to persist them at a named path.
