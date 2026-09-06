# AmNote

A fast, distraction-free native desktop Markdown note-taking application with local vault storage.

## Language

**Vault**:
The root local filesystem directory where notes, attachments, and metadata are stored.
_Avoid_: Workspace, database, repository

**Note**:
A single markdown document in the vault containing a title, YAML frontmatter, content, and metadata.
_Avoid_: Document, post, file

**Attachment**:
A local media asset stored in `.assets/<note-id>/` within the vault and referenced by an internal asset URL.
_Avoid_: Media, upload, asset file

**Syntax Token**:
A custom inline markdown pattern (such as `#tag`, `[[wiki-link]]`, `~annotation~`, `==highlight==`, or `@due(date)`) extended by AmNote.
_Avoid_: Custom mark, shortcode, tag pattern

**Markdown Codec**:
The bidirectional translator between markdown text on disk and the in-memory rich text document structure.
_Avoid_: Parser-serializer pair, HTML converter

**Vault Sync Coordinator**:
The headless domain service responsible for tracking dirty notes, debouncing disk writes, running 3-way merge conflict detection, and polling for external vault changes.
_Avoid_: Background sync hook, store sync helper

**UI Store**:
The application state slice dedicated strictly to ephemeral modal visibilities, drawer toggles, and layout presentation states.
_Avoid_: Global modal state, component toggles

**Editor Canvas**:
The central content area hosting the rich text editor, note title, and formatting overlays.
_Avoid_: Workspace pane, markdown view

**Editor Lightbox**:
The fullscreen preview overlay for inspecting, zooming, copying, and downloading note image attachments.
_Avoid_: Image popup, media viewer modal

**Editor Lock Screen**:
The secure gatekeeper overlay blocking note viewing and editing until the correct decryption password is authenticated.
_Avoid_: Password prompt, lock shield

**Editor Status Bar**:
The persistent bottom strip reporting document statistics (words, characters, reading time, goal completion) and canvas editing modes (focus, typewriter).
_Avoid_: Footer, info row

**Editor Suggestions**:
The unified floating menu coordinator orchestrating slash commands (`/`), wiki link autocomplete (`[[`), selection bubble actions, and date pickers.
_Avoid_: Menu state, popup controller

**Vault Adapter**:
The port interface (`VaultAdapter`) abstracting vault persistence operations across native desktop (`TauriVaultAdapter`) and in-memory test environments (`InMemoryVaultAdapter`).
_Avoid_: Database driver, storage client

**Vault Seeding Policy**:
The onboarding rule and procedure (`seedVaultIfFresh`) that inspects vault initialization markers and populates default guide notes on first launch.
_Avoid_: Database migration, initial state filler


