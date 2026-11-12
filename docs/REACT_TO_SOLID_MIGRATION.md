# Architecture & Migration Guide: React to SolidJS (dbvolio)

This document serves as the architectural reference and step-by-step migration specification for converting dbvolio's frontend from React 19 to SolidJS.

---

## 1. Project Background & Migration Goal

dbvolio is a desktop DBML schema designer and diagram visualization tool built with **Tauri v2** + frontend web stack.
The goal is to replace the React frontend with a pure **SolidJS** frontend:
- **No React bridge/islands:** Remove React completely (`react`, `react-dom`, `@xyflow/react`, `@monaco-editor/react`, `zustand`, `lucide-react`).
- **Target stack:** `solid-js`, `vite-plugin-solid`, `lucide-solid`, native `monaco-editor`, native SolidJS canvas engine for diagramming.
- **Retain existing desktop capabilities:** Tauri v2 IPC, DBML parser, layout algorithms (Dagre / layout workers), SVG/PDF/PNG exports, keyboard shortcut maps, and editor sync.

---

## 2. Architectural Changes

### 2.1 Diagram Canvas Replacement (React Flow $\rightarrow$ Native Solid Canvas)
The original diagram uses `@xyflow/react`. In SolidJS, replace it with a lightweight, high-performance canvas:
- **Viewport Controller:**
  - Manages `pan: { x, y }`, `zoom: number`, `minZoom`, `maxZoom`.
  - Implements pointer wheel zoom, drag-to-pan, and fit-view calculations.
  - Controls overlay (zoom in, zoom out, fit view, toggle minimap/background grid).
- **Node Layer:**
  - Renders `TableNode` and `TableGroupNode` using native Solid elements (`<For each={nodes()}>`).
  - Draggable nodes with grid snapping and collision checks via pointer event listeners.
  - Updates node positions and triggers `syncTableGroupBounds` and layout changes.
- **Edge Layer:**
  - SVG overlay with cubic bezier or orthogonal path rendering (`<path d={...} />`).
  - Relationship markers (`1:1`, `1:n`, `n:m`) matching existing DBML cardinality semantics.
- **Minimap & Background Grid:**
  - Dot or grid SVG pattern with dynamic scale.
  - Interactive minimap viewport preview.

### 2.2 State Layer Replacement (Zustand $\rightarrow$ Solid Stores / Signals)
Replace Zustand (`zustand`) stores in `src/stores/` with Solid's fine-grained reactivity (`createStore`, `createSignal`):
- `diagram-store.ts`: Schema nodes, edges, active layout preset, layout options.
- `diagram-view-store.ts`: Viewport coordinates, zoom level, search query, selected node IDs.
- `project-store.ts`: Current project, open files, active file path, unsaved dirty states.
- `ui-store.ts`: Sidebar panel states (open/closed widths), modals, active toolbars.
- `editor-store.ts`: Active DBML content, validation diagnostics, cursor positions.
- `keymap-store.ts`: Global keyboard shortcut bindings and command registry.
- `app-settings-store.ts`: Dark/light theme, layout preferences, editor font settings.
- `quick-pick-store.ts`: Fuzzy command and table finder modal state.

### 2.3 Code Editor Replacement (`@monaco-editor/react` $\rightarrow$ Native Monaco)
- Use standard `monaco-editor` package.
- Initialize directly inside Solid's `onMount` on a container DOM `ref`.
- Cleanup editor instance on `onCleanup`.
- Preserve custom DBML syntax highlighting, autocomplete, and diagnostic markers.

### 2.4 Icons & Testing
- Replace `lucide-react` with `lucide-solid`.
- Replace `@testing-library/react` with `@solidjs/testing-library`.
- Configure `vitest` with `solid` environment plugin.

---

## 3. Step-by-Step Execution Plan

```
[Phase 1: Dependencies & Config] 
   └── Configure Vite, TS, Solid plugins, install packages, clean React deps.
[Phase 2: Reactive State Layer]
   └── Convert all stores in src/stores/ from Zustand to Solid createStore/signals.
[Phase 3: Native Solid Canvas Engine]
   └── Implement Viewport, Pan/Zoom, Node Renderer, SVG Edge Renderer, Minimap.
[Phase 4: Editor & Shell Components]
   └── Port Monaco Editor, SplitPane, Header, StatusBar, Explorer, Inspector, Modals.
[Phase 5: Verification & Tests]
   └── Update test harness, verify full test suite passes, verify Tauri build.
```

### Phase 1: Dependencies and Build Configuration
1. **Update `package.json`**:
   - Add: `solid-js`, `vite-plugin-solid`, `lucide-solid`, `monaco-editor`.
   - Add devDeps: `@solidjs/testing-library`, `solid-jest` or vitest solid transform.
   - Remove: `react`, `react-dom`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `@xyflow/react`, `zustand`, `lucide-react`, `@monaco-editor/react`, `@testing-library/react`.
2. **Update `vite.config.ts`**:
   - Replace `@vitejs/plugin-react` with `vite-plugin-solid`.
3. **Update `tsconfig.json`**:
   - `"jsx": "preserve"`
   - `"jsxImportSource": "solid-js"`
4. Run `npm install` and ensure clean dependency resolution.

### Phase 2: Reactive State Layer (`src/stores/`)
Convert each store file to export idiomatic Solid signals / stores with the same external signatures:
1. `src/stores/ui-store.ts`
2. `src/stores/app-settings-store.ts`
3. `src/stores/project-store.ts`
4. `src/stores/editor-store.ts`
5. `src/stores/keymap-store.ts`
6. `src/stores/quick-pick-store.ts`
7. `src/stores/diagram-view-store.ts`
8. `src/stores/diagram-store.ts`

### Phase 3: Native Solid Diagram Canvas (`src/components/diagram/`)
Build a high-performance Solid diagram renderer without external heavy frameworks:
1. **Data Types & Flow Models:**
   - Define lightweight `DiagramNode` (`id`, `x`, `y`, `width`, `height`, `type`, `data`, `selected`) and `DiagramEdge` (`id`, `source`, `target`, `sourceHandle`, `targetHandle`, `label`, `cardinality`).
   - Keep layout algorithms in `src/features/diagram-layout/` working directly on these coordinates.
2. **Components:**
   - `CanvasViewport.tsx`: Handles wheel zoom, drag pan, pinch gestures, transform matrix.
   - `RelationshipEdge.tsx`: SVG bezier path rendering with labels and arrowheads.
   - `TableNode.tsx`: Pure Solid component rendering schema tables, columns, PK/FK indicators.
   - `TableGroupNode.tsx`: Draggable container grouping tables with auto-computed bounds.
   - `DiagramToolbar.tsx`: Zoom controls, layout selector, export triggers.
   - `DiagramContextMenu.tsx`: Right-click actions (create table, group, align, export).
   - `SchemaDiagram.tsx`: Root container orchestrating viewport, nodes, edges, and selection.

### Phase 4: UI Shell, Editor, and Panels
1. **Entry Point & Layout:**
   - `src/main.tsx`: `render(() => <App />, document.getElementById("root")!)`.
   - `src/app/App.tsx` and `src/app/Workspace.tsx`.
   - `src/components/layout/SplitPane.tsx`.
   - `src/components/layout/Header.tsx`, `StatusBar.tsx`, `ExportMenu.tsx`.
2. **Monaco Code Editor:**
   - `src/components/editor/DbmlEditor.tsx`: Native `monaco.editor.create` mounted on div ref.
   - `src/components/editor/EditorTabs.tsx`.
3. **Inspector & Explorer:**
   - `src/components/explorer/ProjectExplorer.tsx`, `ExplorerTreeMenu.tsx`.
   - `src/components/inspector/SchemaInspector.tsx`, `TableCreateModal.tsx`, `TableEditModal.tsx`.
   - `src/components/inspector/table-form/*` (form sections, inputs, color pickers).
4. **Modals & Settings:**
   - `src/components/quick-pick/QuickPickModal.tsx`.
   - `src/components/settings/AppSettings.tsx`, `KeyboardShortcutsSection.tsx`.

### Phase 5: Testing and Polish
1. Update test files in `tests/` to use Solid testing utilities (`render`, `screen`, `fireEvent`).
2. Run `npm run test:run` to ensure 100% test pass rate.
3. Validate diagram export features (PNG, SVG, PDF via `jspdf` / `svg2pdf.js`).
4. Validate Tauri desktop integration (`npm run tauri dev`).

---

## 4. Key Rules for Agents & Developers
1. **Fine-grained Reactivity:** Never destructure props in SolidJS components (`const { name } = props` breaks reactivity). Always access `props.name` or use `splitProps`.
2. **Lifecycle:** Use `onMount`, `onCleanup`, `createEffect`, and `createMemo` instead of React's `useEffect` / `useMemo`.
3. **Control Flow:** Prefer `<Show>`, `<For>`, and `<Switch>` / `<Match>` over JSX ternary and `.map()` for optimal DOM node recycling.
4. **Git Commits:** Follow conventional commits as defined in `AGENTS.md` (e.g. `refactor(diagram): port canvas viewport to solidjs`).
