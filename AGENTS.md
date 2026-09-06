# AGENTS.md

## Commands

- `npm test` - run the full test suite
- `npm run dev` - run the development task
- `npm run build` - build the project
- `npm run lint` - run the lint task

## Code Map

- `src` - application source
- `.github` - project configuration

## Conventions

- Use ESM `import`/`export` syntax.
- Use `.tsx` extensions for React components.

## Agent skills

### Issue tracker

GitHub Issues using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`CONTEXT.md` and `docs/adr/` at root). See `docs/agents/domain.md`.

