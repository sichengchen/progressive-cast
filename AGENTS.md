# Repository instructions for agents

These instructions apply to the entire repository. More specific `AGENTS.md` files, if present in subdirectories, may add to or override them for files in their scope.

## Before working in a domain

Read the repository-root [`CONTEXT.md`](CONTEXT.md) and any relevant architecture decision records in [`docs/adr/`](docs/adr/). Use the domain vocabulary defined in `CONTEXT.md`, and call out any proposal that conflicts with an existing ADR.

If either source is absent, continue without raising it as a problem. See [`docs/agents/domain.md`](docs/agents/domain.md) for the complete domain-documentation conventions.

## Issues and PRDs

GitHub Issues is the source of truth for issues and product requirement documents. Use the `gh` CLI for issue operations and infer the repository from the current Git remote.

External pull requests are not a triage request surface. Because GitHub issues and pull requests share a number space, resolve an ambiguous reference such as `#42` before acting on it.

Follow [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) for commands, publication rules, and Wayfinder conventions.

## Triage labels

Use only the repository's canonical triage labels for EsperKit roles:

| Role | Label |
| --- | --- |
| Needs maintainer triage | `needs-triage` |
| Waiting for reporter information | `needs-info` |
| Ready for an autonomous agent | `ready-for-agent` |
| Requires human implementation | `ready-for-human` |
| Will not be actioned | `wontfix` |

See [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) for the authoritative mapping.

## Repository artifacts

Keep agent-only artifacts private and outside the repository by default. This includes temporary plans, reasoning notes, handoffs, review scratch, and session state.

Write an artifact into the repository only when one of the following is true:

- It is part of the codebase or shipped product.
- It is a durable project record intentionally consumed by the project's workflow.
- The user explicitly asks you to persist it at a named repository path.
