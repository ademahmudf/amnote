# Changelog

## v1.0.0-beta.3

### Features
- Calendar modal with daily notes, `@due()` task dates, and `@date:` / `@due` / `@overdue` search.
- Note-list Cozy/Compact density, absolute date on hover, task pill as a button.
- Responsive panes: auto-collapsing sidebar below 1024px, overlay panes with focus handling below 768px.
- Shared shortcuts source of truth with searchable cheatsheet; shared UI-scale helper.
- Semantic theme tokens (`danger`, `focus-ring`); tag contrast ≥ 4.5:1 in all 24 themes.
- Accent utilities now resolve to runtime theme variables across all themes.

### Fixes
- Sidebar tags section minimized by default; trash confirmation modal and banner delete action.
- Note-card badge alignment across macOS and Linux; unified editor selection styling.
- Session-lock wording corrected (Locked, not Encrypted); deferred non-core fonts.
- Duplicate `Ctrl+Shift+F` binding removed.

## v1.0.0-beta.2 and earlier
- See commit history (`git log v1.0.0-beta.1..v1.0.0-beta.2`) for prior beta changes,
  including Focus Mode, 3-way vault sync, typography additions, and tag sync.
