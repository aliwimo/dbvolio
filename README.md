# dbvolio

Local-first desktop workspace for multi-file DBML projects: side-by-side editing, schema diagnostics, and an interactive ER diagram.

## Stack

- **Tauri 2** (Rust) — native dialogs, validated filesystem access, layout metadata
- **React + TypeScript + Vite** — UI
- **`@dbml/core`** — parsing (multi-file via `use … from '…'`)
- **Monaco**, **React Flow**, **Zustand**, **Dagre**

## Development

Prerequisites: [Tauri prerequisites](https://tauri.app/start/prerequisites/) (macOS: Xcode CLT, Rust).

```bash
npm install
npm run tauri dev
```

Other commands:

```bash
npm run build          # frontend production build
npm run test:run       # Vitest (parser + diagram adapters)
cd src-tauri && cargo test   # Rust path validation
npm run tauri build    # packaged macOS app
```

## Project layout convention

```text
my-database/
├── main.dbml              # typical entry point (selectable in the app)
├── tables/
│   └── users.dbml
└── .dbvolio/
    └── layout.json        # diagram positions (not DBML source)
```

Multi-file imports use DBML v10 syntax, for example:

```dbml
use * from './tables/users.dbml'
```

## Sample fixtures

See [`tests/fixtures/`](tests/fixtures/) for multi-file and composite FK examples you can copy into a project folder.

## Keyboard shortcuts

Defaults follow common VS Code bindings. Open **Settings → Keyboard** to search, rebind, or reset shortcuts (stored in `localStorage` on this device).

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl+O | Open project folder |
| ⌘/Ctrl+S | Save active file |
| ⌘/Ctrl+W | Close active editor tab |
| ⌘/Ctrl+, | Open settings |
| ⌘/Ctrl+B | Toggle file explorer |
| ⌘/Ctrl+Shift+E | Show file explorer |
| ⌘/Ctrl+Shift+1 | Toggle editor panel |
| ⌘/Ctrl+Shift+2 | Toggle diagram panel |
| ⌘/Ctrl+Shift+I | Toggle properties panel |
| ⌘/Ctrl+Shift+T | Toggle color theme |
