# ʕ•ᴥ•ʔ AmNote

> **AmNote** (by Ade Mahmud) is a distraction-free, elegant Markdown note taking desktop application inspired by Bear 2, crafted specifically for **Omarchy Linux** and **macOS**.

Built with **Tauri v2, React 19, TipTap, Tailwind CSS, and Rust**.

---

## ✨ Features

- 📁 **Pure Local Filesystem Markdown Vault**: All notes are stored directly in `~/Documents/AmNotes` as human-readable `.md` files with YAML frontmatter. No proprietary databases or vendor lock-in.
- 🔗 **Interconnected Note Linking (`[[...]]`)**: Cross-link notes with automatic real-time autocomplete suggestions and 1-click note creation & navigation.
- 📌 **Smart Note Cards & Pinned Separation**: Pinned notes grouped at the top of the note list under a dedicated section header.
- ☑ **Checklist Progress Pills**: Automatic task progress badges (`☑ 2/5 done` / `✔ Done`) and relative timestamps on note cards.
- 📑 **Interactive Document Outline & Backlinks**: Jump to headings in the Table of Contents with a single click and explore connected backlinks in the Note Inspector (`Ctrl+I`).
- ✍ **Typewriter Centering Mode (`Ctrl+Shift+T`)**: Keeps the active typing line vertically centered in the viewport for ergonomic writing sessions.
- 🎯 **Session Word Goals**: Set target word count goals with live status bar progress tracking.
- 🔤 **Hybrid Markdown Headings**: Clean, distraction-free typography by default; reveal `#`, `##`, `###` on cursor click or hover to cycle heading levels.
- 🖋 **Typography & UI Scale**: Choose from **Clarika**, **Bear Sans**, **Inter**, **Editorial Serif**, **JetBrains Mono**, or **System Native**, with 4 configurable UI scales.
- 🎨 **Rich Themes**: Red Graphite, Charcoal, Solarized, Dracula, Nord, Ayu, Sepia, and **Omarchy OS Auto-Sync**.
- ⌨ **Cheatsheet HUD (`Ctrl+/` or `?`)**: Fast modal reference for Markdown syntax and keyboard shortcuts.
- 🔒 **Password Protection**: Encrypt individual notes with SHA-256 session lock protection.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust & Cargo](https://rustup.rs/) (v1.75+)

### Development

```bash
# Clone the repository
git clone https://github.com/ademahmudf/amnote.git
cd amnote

# Install dependencies
npm install

# Run the Tauri desktop app in development mode
npm run dev
```

### Unit Tests

```bash
npm test
```

### Build Production Desktop Binary

```bash
# Build Linux package (.AppImage and .deb)
npm run build
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + N` | Create new note |
| `Ctrl + K` | Open Command Palette / Quick Search |
| `Ctrl + 1` | Toggle Sidebar navigation |
| `Ctrl + 2` | Toggle Note List panel |
| `Ctrl + 3` / `F11` | Toggle Zen / Focus Mode |
| `Ctrl + I` | Toggle Note Inspector (Outline & Stats) |
| `Ctrl + Shift + T` | Toggle Typewriter Centering Mode |
| `Ctrl + ,` | Open Preferences & Settings |
| `Ctrl + /` | Open Markdown & Shortcut Cheatsheet |
| `Ctrl + D` | Duplicate active note |

---

## 📜 License

Created with ❤️ by **Ade Mahmud**. MIT License.
