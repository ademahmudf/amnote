# 0001: Unify Markdown Codec and Retire Phantom Serializer

## Context
AmNote has maintained two distinct serialization paths: a production serializer (`ProseMirrorMarkdownSerializer`) that serializes live ProseMirror documents on note save, and a legacy DOM-based serializer (`htmlToMarkdown`) that was only used by unit tests. Because unit tests asserted against `htmlToMarkdown`, production serializer regressions could pass undetected while syntax tokens (`#tag`, `[[wiki-link]]`, `~annotation~`, `==highlight==`, `@due`) had to be maintained across three disparate regex implementations.

## Decision
We retire and delete `htmlToMarkdown` and consolidate markdown transformation into a single `MarkdownCodec` module. Unit tests must assert against the production serialization pipeline. Custom syntax tokens are declared once in a shared registry consumed by both AST parsing and serialization.

## Consequences
- Unit tests now reflect the exact serialization that runs when a user saves a note.
- Adding or modifying custom markdown syntax requires editing a single token definition rather than three regex sets.
- Tests testing markdown serialization must run through the ProseMirror document model or the unified codec interface.
