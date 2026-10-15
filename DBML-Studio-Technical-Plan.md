# DBML Studio — Technical Plan and Setup Guide

**Target:** macOS on Apple Silicon (M1)  
**Stack:** Tauri 2, Rust, React, TypeScript, Vite  
**Initial scope:** Local-first, multi-file DBML projects with a side-by-side editor and custom interactive ER diagram.

## 1. Product vision

DBML Studio is a desktop workspace for managing `.dbml` projects. Users can open a project folder, browse and edit multiple DBML files, select an entry-point file, preview tables and relationships, inspect schema objects, see parsing diagnostics, and persist diagram layout separately from source files.

The first version requires no account, cloud service, remote API, or application database.

## 2. Architecture decisions

- **Tauri 2:** native macOS window, app packaging, native dialogs, and secure frontend-to-Rust IPC.
- **React + TypeScript + Vite:** application UI, workspace, editor tabs, explorer, inspector, and diagram interactions.
- **`@dbml/core`:** DBML parsing in JavaScript initially. Wrap it in an adapter and verify the installed version's multi-file API and import syntax with tests.
- **`@xyflow/react`:** custom ER diagram, table nodes, relationship edges, zoom, pan, and selection.
- **Monaco Editor:** source editing, line numbers, find/replace, and diagnostics integration.
- **Rust commands:** project filesystem operations, native dialogs, path validation, safe writes, and layout metadata persistence.
- **Zustand:** shared state only where it helps coordinate project, editor, diagnostics, and diagram state.
- **Dagre:** initial automatic diagram layout.

No separate HTTP backend is required. Tauri IPC connects the React frontend to Rust. DBML parsing remains in TypeScript initially; do not rewrite the parser in Rust without a concrete need.

## 3. Recommended dependencies

### Runtime

- `@tauri-apps/api`
- `@tauri-apps/plugin-dialog`
- `@xyflow/react`
- `@dbml/core`
- `@monaco-editor/react`
- `zustand`
- `lucide-react`
- `dagre`

Use `@tauri-apps/plugin-fs` only if the project deliberately uses its scoped filesystem API. The proposed architecture uses Rust commands for project-root validation and file operations.

### Development and tests

- `vitest`
- `jsdom`
- `@testing-library/react`
- `@testing-library/user-event`
- `@testing-library/jest-dom`
- `@types/dagre`

## 4. Target repository structure

```text
dbml-studio/
├── src/
│   ├── app/                    # App.tsx, Workspace.tsx
│   ├── components/
│   │   ├── layout/             # Header, split workspace, status bar
│   │   ├── explorer/           # ProjectExplorer, FileTreeItem
│   │   ├── editor/             # DbmlEditor, EditorTabs
│   │   ├── diagram/            # SchemaDiagram, TableNode, RelationshipEdge, layout
│   │   └── inspector/          # SchemaInspector
│   ├── features/
│   │   ├── projects/
│   │   ├── parsing/
│   │   ├── schema/
│   │   ├── diagnostics/
│   │   └── diagram-layout/
│   ├── services/               # dbml-parser, project-service, layout-service, tauri-bridge
│   ├── stores/                 # project-store, editor-store, diagram-store
│   ├── types/                  # dbml, project, diagnostics
│   ├── styles/
│   └── main.tsx
├── src-tauri/
│   ├── capabilities/
│   ├── src/
│   │   ├── commands/           # projects.rs, files.rs, layout.rs
│   │   ├── services/
│   │   ├── models/
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── tests/
│   ├── fixtures/
│   ├── parser/
│   └── components/
├── package.json
└── README.md
```

Create files as their milestone begins; do not generate a large number of empty modules at the start.

## 5. Multi-file project convention

Use normal folders and DBML files, not a proprietary project file format.

```text
my-database/
├── main.dbml
├── tables/
│   ├── users.dbml
│   ├── posts.dbml
│   └── comments.dbml
├── enums/
│   └── common.dbml
└── .dbml-studio/
    └── layout.json
```

- `main.dbml` is the chosen entry point.
- Resolve imports using the syntax and multi-file API supported by the installed `@dbml/core` version.
- The explorer may display imported and unreferenced files; the active schema is determined by the entry point and its imports.
- `.dbml-studio/layout.json` stores optional node positions, viewport, and layout preferences.
- Never concatenate files into one string and assume import resolution remains correct.
- Verify file registration, import paths, and diagnostics using real fixtures before treating multi-file support as complete.

## 6. Application-owned schema model

Normalize parser output once, at the parser adapter boundary. Do not let React components depend directly on the parser's raw data structure.

```ts
export interface SchemaColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  note?: string;
}

export interface SchemaIndex {
  name?: string;
  columns: string[];
  type?: string;
  unique?: boolean;
  note?: string;
}

export interface SchemaTable {
  id: string;
  schema?: string;
  name: string;
  columns: SchemaColumn[];
  indexes: SchemaIndex[];
  note?: string;
}

export interface SchemaReference {
  id: string;
  sourceTableId: string;
  sourceColumns: string[];
  targetTableId: string;
  targetColumns: string[];
}

export interface SchemaEnum {
  id: string;
  schema?: string;
  name: string;
  values: string[];
}

export interface SchemaModel {
  tables: SchemaTable[];
  references: SchemaReference[];
  enums: SchemaEnum[];
}
```

Extend the model based on compatibility fixtures: composite keys, schemas, partial tables, table groups, relationship actions, database-specific types, and other supported DBML features. Do not claim full DBML support until tested.

## 7. Main workflow

1. User chooses a project folder with a native dialog.
2. Rust records/validates the selected project root.
3. Explorer lists relevant project files.
4. User opens DBML files in editor tabs and selects an entry point.
5. TypeScript registers project files and parses the entry point using the supported `@dbml/core` multi-file API.
6. A normalization layer produces `SchemaModel`.
7. Diagram adapter maps the model to React Flow nodes and edges.
8. Monaco displays parsing diagnostics.
9. If current source is invalid, retain the last valid diagram and label it stale.
10. Save source files explicitly; persist layout separately.

Debounce parsing and discard stale parse results if a newer edit has already been processed.

## 8. Rust/Tauri command plan

Implement typed commands incrementally:

- `select_project_directory`
- `list_project_files`
- `read_project_file`
- `write_project_file`
- `create_project_file`
- `rename_project_file`
- `delete_project_file` (only after explicit confirmation)
- `read_layout_metadata`
- `write_layout_metadata`

Security and reliability requirements:

- Never trust arbitrary frontend paths.
- Canonicalize and validate paths against the selected project root.
- Prevent path traversal and symlink escapes.
- Use atomic writes where practical.
- Detect external file modifications instead of silently overwriting them.
- Keep Tauri capabilities narrow; only grant required permissions.

## 9. Workspace UI

- **Header:** project name, entry-point selector, save status, theme, common actions.
- **Explorer:** project tree, create/rename/delete actions, open file.
- **Editor:** Monaco, tabs, unsaved markers, diagnostics.
- **Diagram:** custom table nodes and relationship edges, zoom, pan, fit-to-screen, auto-layout, search.
- **Inspector:** selected table/column details.
- **Status bar:** parse state, table count, relationship count, active file.

Default to a resizable side-by-side code and diagram layout. Later allow users to switch focus or hide panels.

## 10. Milestones and acceptance criteria

### Milestone 1 — Foundation
- Scaffold Tauri 2 + React + TypeScript.
- Confirm native app launches.
- Build header, explorer placeholder, editor panel, diagram panel, status bar, resizable split view, and theme.
- **Done when:** app launches with the planned workspace shell.

### Milestone 2 — Project/file operations
- Native folder picker and Rust commands to list, read, and write files.
- File explorer and editor tabs.
- Unsaved-change tracking and safe handling of external changes.
- **Done when:** a real folder with multiple DBML files can be edited and saved reliably.

### Milestone 3 — Parser and multi-file loading
- Integrate `@dbml/core`.
- Verify installed version, entry-point parsing, file registration, import syntax, and path resolution.
- Add fixtures and normalize parser output.
- **Done when:** multi-file fixtures produce the expected model and useful diagnostics for invalid syntax/imports.

### Milestone 4 — Interactive ER diagram
- Custom React Flow table nodes and relationship edges.
- Show columns, types, PK/FK markers, and useful index metadata.
- Add zoom, pan, fit-to-screen, selection, and Dagre layout.
- Test composite references.
- **Done when:** representative fixtures render tables and relationships correctly.

### Milestone 5 — Live editing and layout
- Monaco integration and debounced parsing.
- Discard stale results and preserve last valid diagram during parse errors.
- Synchronize code and diagram selection.
- Persist layout separately from DBML source.
- **Done when:** editing updates the diagram without refreshing or silently rewriting source.

### Milestone 6 — Polish and release
- Recent projects, keyboard shortcuts, error recovery.
- SVG/PNG export and SQL generation.
- Tests, app icon, versioning, release build.
- **Done when:** a packaged app works outside the development environment.

## 11. Testing strategy

Keep fixtures for simple tables, PKs, nullable/unique constraints, composite FKs, enums, indexes, schema-qualified names, imported and unreferenced files, invalid syntax, unresolved imports, incomplete in-progress input, large schemas, and duplicate names.

Test parser normalization separately from React. Test Rust path validation, traversal attempts, permissions, and safe writes. Include a macOS smoke test for opening and saving a project.

## 12. First development session

Build one vertical slice before expanding:

1. Scaffold and launch the app.
2. Build the workspace shell.
3. Open one DBML file.
4. Parse it with `@dbml/core`.
5. Normalize its schema.
6. Render tables and relationships with React Flow.
7. Extend the proven parser/project pipeline to imported multi-file projects.

## 13. Engineering principles

- DBML source is authoritative.
- Diagram layout never silently rewrites source files.
- Normalize parser output at one boundary.
- Restrict file operations to the selected project root.
- Test multi-file imports rather than assuming behavior.
- Preserve the last valid diagram during invalid edits and clearly show that it is stale.
- Avoid unnecessary servers, databases, accounts, and cloud dependencies.
- Keep the app runnable at every milestone.

## References

- Tauri: https://tauri.app/
- Tauri prerequisites: https://tauri.app/start/prerequisites/
- Tauri dialog plugin: https://v2.tauri.app/plugin/dialog/
- DBML: https://dbml.dbdiagram.io/
- `@dbml/core`: https://www.npmjs.com/package/@dbml/core
- React Flow: https://reactflow.dev/
- Monaco React: https://github.com/suren-atoyan/monaco-react
- Vitest: https://vitest.dev/
