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
npm run icons          # sync app icons from src/assets
npm run set-version -- patch # bump version across package.json, tauri.conf.json & Cargo.toml
```

## Building

### Local build

Use the same [Tauri prerequisites](https://tauri.app/start/prerequisites/) as development, then produce installable bundles on your machine:

```bash
npm install
npm run tauri build
```

Tauri runs `npm run build` for the frontend automatically (`beforeBuildCommand` in `src-tauri/tauri.conf.json`). Bundles are written under `src-tauri/target/release/bundle/`, for example:

| Platform | Typical outputs |
|----------|-------------------|
| macOS | `.app` in `bundle/macos/`, `.dmg` in `bundle/dmg/` |
| Windows | `.msi` and NSIS `.exe` in `bundle/msi/` and `bundle/nsis/` |
| Linux | `.deb` and `.AppImage` in `bundle/deb/` and `bundle/appimage/` |

To build only specific bundle types (optional):

```bash
npm run tauri build -- --bundles dmg          # macOS
npm run tauri build -- --bundles msi,nsis     # Windows
npm run tauri build -- --bundles deb,appimage # Linux
```

### Versioning

To keep all manifest and configuration files in sync (`package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`), use the `set-version` script:

```bash
# Bump semver
npm run set-version -- patch    # e.g. 0.1.1 -> 0.1.2
npm run set-version -- minor    # e.g. 0.1.1 -> 0.2.0
npm run set-version -- major    # e.g. 0.1.1 -> 1.0.0

# Or set an explicit version
npm run set-version -- 0.2.0
```

### GitHub Releases

Tagged releases (`v*`) are built in CI and attached to [GitHub Releases](https://github.com/aliwimo/dbvolio/releases): macOS Apple Silicon `.dmg`, Windows `.msi`/`.exe`, and Linux `.deb`/AppImage.

### macOS: unsigned, not notarized downloads

Release **`.dmg` files are not code-signed or notarized**. This project is not enrolled in the [Apple Developer Program](https://developer.apple.com/programs/), so Gatekeeper treats downloaded builds as untrusted. You may see “DB-Volio cannot be opened” or a quarantine warning after downloading the release.

You can either:

1. **Build locally** (recommended if you want a binary that never left your machine)—follow [Local build](#local-build) above and run the `.app` from `src-tauri/target/release/bundle/macos/`, or install from your own `.dmg`.

2. **Use a release DMG** and clear Apple’s download quarantine (adjust paths to match your download and install location):

   ```bash
   # After downloading the .dmg
   xattr -d com.apple.quarantine ~/Downloads/DB-Volio_*.dmg

   # After copying DB-Volio.app to Applications (if macOS still blocks launch)
   xattr -dr com.apple.quarantine /Applications/DB-Volio.app
   ```

   You may still need to **right-click → Open** the app once, or use **System Settings → Privacy & Security → Open Anyway** for the first launch. CI release DMGs target **Apple Silicon (M1+)**; Intel Macs should build from source locally.

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

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

## Status

Early preview (**0.1.0**). APIs, settings, and packaging may change. Feedback and issues welcome as the workspace evolves.
