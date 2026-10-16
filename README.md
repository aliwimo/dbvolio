# DB-Volio (dbvolio)

**DB-Volio** is a local-first desktop app for working with [DBML](https://dbml.dbdiagram.io/home/) (Database Markup Language). Open a project folder or a single `.dbml` file, edit schema source in Monaco, and keep an interactive ER diagram in sync—without sending your schema to a cloud service.

Built with **Tauri 2** and **React**, it targets multi-file DBML projects: split tables across files, resolve `use … from '…'` imports, diagnose parse errors inline, and export SQL or diagram images when you are ready to share.

## Features

### Project workspace

- **Open a folder** or a **single `.dbml` file** (macOS: double-click `.dbml` in Finder to launch the app).
- **Recent projects** on the welcome screen and in Settings.
- **File explorer** with optional “show all files” when working in folder scope.
- **Multi-tab editor** with dirty-state tracking and save to disk via native dialogs.
- **Diagram root (entry point)** selector when a folder contains several top-level DBML files—the parsed schema and layout follow the chosen entry file.
- **Go to file** quick pick (`⌘/Ctrl+P`) to jump between project files.

Filesystem access stays on your machine: the Rust backend validates paths so reads and writes stay inside the opened project root.

### DBML editing

- **Monaco** editor with DBML syntax highlighting (`@dbml/core` Monarch tokens).
- **Live parse** (debounced): the diagram and diagnostics update as you type.
- **Inline diagnostics** in the editor and a compact **status bar** (table/ref counts, errors, unsaved file).
- Configurable **editor preferences**: font, wrapping, minimap, tabs, whitespace, folding, and more (Settings → Editor).
- **Reveal in editor**: selecting a table on the diagram scrolls to its definition when that file tab is open.

### ER diagram

- **React Flow** canvas with table nodes, relationship edges, zoom, fit, and search.
- **Drag** nodes; positions persist per entry file under `.dbvolio/layout.json` (layout metadata only—not DBML source).
- **Auto-layout** presets (relationship flow, dependency lanes, hub & orbit, tile grid) with direction and spacing options.
- **Diagram options**: grid, minimap, edge labels, relationship animation, selection emphasis, snap-to-grid, and more (toolbar or Settings → Diagram).
- Navigate between **tables, columns, enums, and refs** from the diagram and the **Properties** panel.

### Properties panel (schema inspector)

- Browse the parsed model: tables, columns, keys, indexes, enums, and relationships.
- **Create tables** and **edit table/column metadata** through forms; changes are written back into the correct `.dbml` file(s) in the project.

### Export

When the project parses cleanly, use **Export** in the header:

| Output | Description |
|--------|-------------|
| **Postgres SQL** | `schema.sql` via `@dbml/core` ModelExporter |
| **Diagram SVG / PNG / PDF** | Snapshot of the current canvas view |

### Settings & keyboard

- **Settings** (`⌘/Ctrl+,`): appearance (light/dark), default panel visibility, editor and diagram defaults, recent projects, keyboard shortcuts, about.
- Shortcuts follow common **VS Code** bindings; rebind or reset them under **Settings → Keyboard** (stored in `localStorage` on this device).
- Native **application menu** on supported platforms, wired to the same command palette.

## Stack

| Layer | Technology |
|-------|------------|
| Shell | **Tauri 2** (Rust)—dialogs, filesystem, path guards, layout file I/O |
| UI | **React 19**, **TypeScript**, **Vite** |
| Parsing | **`@dbml/core`**—multi-file projects via DBML v10 `use … from '…'` |
| Editor | **Monaco** (`@monaco-editor/react`) |
| Diagram | **React Flow** (`@xyflow/react`), **Dagre**, **Zustand** |
| Export | **jsPDF**, **svg2pdf.js** |

## Development

**Prerequisites:** [Tauri prerequisites](https://tauri.app/start/prerequisites/) (macOS: Xcode Command Line Tools, Rust).

```bash
npm install
npm run tauri dev
```

**Other commands:**

```bash
npm run build          # frontend production build
npm run test:run       # Vitest (parser, diagram adapters, stores)
cd src-tauri && cargo test   # Rust path validation
npm run tauri build    # packaged desktop app
npm run icons          # sync app icons from src/assets
```

## Project layout convention

Typical multi-file project:

```text
my-database/
├── main.dbml              # entry point (selectable in the app)
├── tables/
│   └── users.dbml
└── .dbvolio/
    └── layout.json        # diagram node positions per entry file
```

Multi-file imports use DBML v10 syntax, for example:

```dbml
use * from './tables/users.dbml'
```

Single-file mode opens one `.dbml` path; the explorer and parse scope focus on that file only.

## Sample fixtures

Copy examples from [`tests/fixtures/`](tests/fixtures/)—including multi-file layouts and composite foreign keys—into a folder and open it as a project.

## Keyboard shortcuts (defaults)

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl+O | Open project folder |
| ⌘/Ctrl+Shift+O | Open DBML file |
| Ctrl+R | Open recent project |
| ⌘/Ctrl+Shift+W | Close project |
| ⌘/Ctrl+S | Save active file |
| ⌘/Ctrl+W | Close active editor tab |
| ⌘/Ctrl+P | Go to file |
| ⌘/Ctrl+, | Open settings |
| ⌘/Ctrl+B | Toggle file explorer |
| ⌘/Ctrl+Shift+E | Show file explorer |
| ⌘/Ctrl+Shift+1 | Toggle editor panel |
| ⌘/Ctrl+Shift+2 | Toggle diagram panel |
| ⌘/Ctrl+Shift+I | Toggle properties panel |
| ⌘/Ctrl+Shift+T | Toggle color theme |

## Status

Early preview (**0.1.0**). APIs, settings, and packaging may change. Feedback and issues welcome as the workspace evolves.
