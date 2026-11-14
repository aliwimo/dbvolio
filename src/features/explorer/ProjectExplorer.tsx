import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  File,
  FileCode,
  Folder,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
  Waypoints,
  X,
} from "lucide-solid";
import { createSignal, createMemo, For, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useEditorStore } from "../editor/editor-store";
import { filesForScope } from "../projects/project-scope-files";
import { useProjectStore } from "../projects/project-store";
import { fileExplorerName } from "../../shared/services/tauri-bridge";
import { useUiStore } from "../../shared/stores/ui-store";
import { RecentProjectsList } from "../projects/RecentProjectsList";
import { Button, Input, SearchField } from "../../shared/ui";
import { ExplorerTreeMenu } from "./ExplorerTreeMenu";
import {
  ancestorFolderPaths,
  buildTree,
  collectFolderPaths,
  countLeafFiles,
  filterDbmlEntries,
  filterTree,
  isDbmlPath,
  type TreeNode,
} from "./explorer-tree";

function absolutePath(root: string, relative: string): string {
  const sep = root.includes("\\") ? "\\" : "/";
  const rootClean = root.replace(/[/\\]+$/, "");
  return `${rootClean}${sep}${relative.split("\\").join("/").split("/").join(sep)}`;
}

function TreeItems(props: {
  nodes: TreeNode[];
  depth?: number;
  collapsed: Set<string>;
  onToggleFolder: (path: string) => void;
  forceExpand: boolean;
  onFileContextMenu: (path: string, x: number, y: number) => void;
}) {
  const openFile = useEditorStore.getState().openFile;
  const activePath = () => useEditorStore((s) => s.activePath);
  const tabs = () => useEditorStore((s) => s.tabs);

  const dirtyPaths = () =>
    new Set(tabs().filter((t) => t.isDirty).map((t) => t.relativePath));
  const openPaths = () => new Set(tabs().map((t) => t.relativePath));

  return (
    <For each={props.nodes}>
      {(node) => {
        const expanded = () =>
          props.forceExpand ||
          !props.collapsed.has(node.path) ||
          node.children.length === 0;
        const isActive = () => activePath() === node.path;
        const isDirty = () => dirtyPaths().has(node.path);
        const isOpen = () => openPaths().has(node.path);
        const isDbml = () => isDbmlPath(node.path);

        return (
          <div class="tree-branch">
            <div
              class={[
                "tree-item",
                isActive() ? "active" : "",
                isOpen() && !node.isDirectory ? "open" : "",
                isDirty() ? "dirty" : "",
                node.isDirectory ? "folder" : "file",
                !node.isDirectory && !isDbml() ? "other-file" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ "--depth": props.depth ?? 0 }}
              onClick={() => {
                if (node.isDirectory) {
                  props.onToggleFolder(node.path);
                  return;
                }
                if (isDbml()) {
                  useProjectStore.getState().setEntryPoint(node.path);
                  void openFile(node.path);
                }
              }}
              role="treeitem"
              aria-expanded={node.isDirectory ? expanded() : undefined}
              title={
                !node.isDirectory && !isDbml()
                  ? `${node.path} (not editable here)`
                  : node.path
              }
              tabIndex={0}
              onContextMenu={(event) => {
                if (node.isDirectory) return;
                event.preventDefault();
                props.onFileContextMenu(node.path, event.clientX, event.clientY);
              }}
            >
              <Show
                when={node.isDirectory}
                fallback={
                  <span class="tree-item-chevron tree-item-chevron-spacer" />
                }
              >
                <span class="tree-item-chevron" aria-hidden>
                  <Show when={expanded()} fallback={<ChevronRight size={14} />}>
                    <ChevronDown size={14} />
                  </Show>
                </span>
              </Show>

              <Show
                when={node.isDirectory}
                fallback={
                  <Show
                    when={isDbml()}
                    fallback={<File size={14} class="tree-item-icon" />}
                  >
                    <FileCode size={14} class="tree-item-icon" />
                  </Show>
                }
              >
                <Folder size={14} class="tree-item-icon" />
              </Show>

              <span class="tree-item-label">{node.name}</span>
            </div>

            <Show when={node.isDirectory && expanded() && node.children.length > 0}>
              <TreeItems
                nodes={node.children}
                depth={(props.depth ?? 0) + 1}
                collapsed={props.collapsed}
                onToggleFolder={props.onToggleFolder}
                forceExpand={props.forceExpand}
                onFileContextMenu={props.onFileContextMenu}
              />
            </Show>
          </div>
        );
      }}
    </For>
  );
}

type ModalState =
  | { type: "create" }
  | { type: "rename"; path: string }
  | { type: "delete"; path: string }
  | null;

export function ProjectExplorer() {
  const files = () => useProjectStore((s) => s.files);
  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const projectScope = () => useProjectStore((s) => s.projectScope);
  const entryPoint = () => useProjectStore((s) => s.entryPoint);
  const setEntryPoint = useProjectStore.getState().setEntryPoint;

  const showAllFiles = () => useUiStore((s) => s.explorerShowAllFiles);
  const setShowAllFiles = useUiStore.getState().setExplorerShowAllFiles;
  const activePath = () => useEditorStore((s) => s.activePath);
  const refreshFiles = useProjectStore.getState().refreshFiles;
  const createFile = useEditorStore.getState().createFile;
  const renameFile = useEditorStore.getState().renameFile;
  const deleteFile = useEditorStore.getState().deleteFile;

  const [query, setQuery] = createSignal("");
  const [collapsed, setCollapsed] = createSignal<Set<string>>(new Set());
  const [modalState, setModalState] = createSignal<ModalState>(null);
  const [modalInput, setModalInput] = createSignal("");
  const [modalError, setModalError] = createSignal<string | null>(null);
  const [fileMenu, setFileMenu] = createSignal<{
    path: string;
    x: number;
    y: number;
  } | null>(null);
  const [revealError, setRevealError] = createSignal<string | null>(null);
  const [explorerName, setExplorerName] = createSignal("File Explorer");
  let fileMenuEl: HTMLDivElement | undefined;

  onMount(() => {
    void fileExplorerName()
      .then((name) => {
        if (name.trim()) setExplorerName(name.trim());
      })
      .catch(() => undefined);
    const closeIfOutside = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (fileMenuEl?.contains(event.target as Node)) return;
      setFileMenu(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFileMenu(null);
    };
    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("keydown", onKey);
    onCleanup(() => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("keydown", onKey);
    });
  });

  const revealInFileExplorer = (relativePath: string) => {
    const root = projectRoot();
    if (!root) return;
    setRevealError(null);
    void revealItemInDir(absolutePath(root, relativePath))
      .then(() => setFileMenu(null))
      .catch((err) => {
        setRevealError(err instanceof Error ? err.message : String(err));
      });
  };

  const scopedFiles = createMemo(() =>
    filesForScope(files(), projectScope(), entryPoint())
  );

  const visibleEntries = createMemo(() =>
    showAllFiles() ? scopedFiles() : filterDbmlEntries(scopedFiles())
  );

  const fileCount = createMemo(() => scopedFiles().filter((f) => !f.isDirectory).length);
  const dbmlCount = createMemo(
    () => scopedFiles().filter((f) => !f.isDirectory && f.relativePath.endsWith(".dbml")).length
  );

  const fullTree = createMemo(() => buildTree(visibleEntries()));

  const visibleTree = createMemo(() => {
    const q = query().trim();
    return q ? filterTree(fullTree(), q) : fullTree();
  });

  const toggleFolder = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set<string>(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsed(new Set<string>());
  const collapseAll = () =>
    setCollapsed(new Set<string>(collectFolderPaths(fullTree())));

  const revealActive = () => {
    const current = activePath();
    if (!current) return;
    const ancestors = ancestorFolderPaths(current);
    setCollapsed((prev) => {
      const next = new Set<string>(prev);
      for (const a of ancestors) {
        next.delete(a);
      }
      return next;
    });
  };

  const openCreateModal = () => {
    setModalInput("");
    setModalError(null);
    setModalState({ type: "create" });
  };

  const openRenameModal = (path?: string) => {
    const p = path ?? activePath();
    if (!p) return;
    setModalInput(p);
    setModalError(null);
    setModalState({ type: "rename", path: p });
    setFileMenu(null);
  };

  const openDeleteModal = (path?: string) => {
    const p = path ?? activePath();
    if (!p) return;
    setModalError(null);
    setModalState({ type: "delete", path: p });
    setFileMenu(null);
  };

  const copyPath = (relativePath: string) => {
    const root = projectRoot();
    const text = root ? absolutePath(root, relativePath) : relativePath;
    void navigator.clipboard.writeText(text).finally(() => setFileMenu(null));
  };

  const closeModal = () => {
    setModalState(null);
    setModalInput("");
    setModalError(null);
  };

  const handleModalSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const state = modalState();
    if (!state) return;

    try {
      if (state.type === "create") {
        const trimmed = modalInput().trim();
        if (!trimmed) {
          setModalError("Please enter a file path.");
          return;
        }
        const candidate = trimmed.endsWith(".dbml") ? trimmed : `${trimmed}.dbml`;
        await createFile(candidate);
        await refreshFiles();
        closeModal();
      } else if (state.type === "rename") {
        const trimmed = modalInput().trim();
        if (!trimmed || trimmed === state.path) {
          closeModal();
          return;
        }
        await renameFile(state.path, trimmed);
        await refreshFiles();
        closeModal();
      } else if (state.type === "delete") {
        await deleteFile(state.path);
        await refreshFiles();
        closeModal();
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div class="panel panel-fill panel-flush explorer-panel">
      <div class="explorer-header">
        <Show when={projectRoot()}>
          <div class="explorer-header-row">
            <SearchField
              placeholder="Search files…"
              ariaLabel="Search files"
              value={query()}
              onInput={setQuery}
              trailing={
                query() ? (
                  <button
                    type="button"
                    class="explorer-search-clear"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={12} />
                  </button>
                ) : undefined
              }
            />
            <div class="explorer-actions">
              <Button
                variant="ghost"
                size="icon"
                title="New DBML file"
                aria-label="New DBML file"
                onClick={openCreateModal}
              >
                <Plus size={14} />
              </Button>
              <ExplorerTreeMenu
                disabled={!projectRoot()}
                canRevealActive={Boolean(activePath())}
                canClearFilter={Boolean(query().trim())}
                showAllFiles={showAllFiles()}
                canRename={Boolean(activePath())}
                canDelete={Boolean(activePath())}
                canUseForDiagram={Boolean(activePath()?.endsWith(".dbml"))}
                onExpandAll={expandAll}
                onCollapseAll={collapseAll}
                onRevealActive={revealActive}
                onClearFilter={() => setQuery("")}
                onRefresh={() => void refreshFiles()}
                onToggleShowAllFiles={() => setShowAllFiles(!showAllFiles())}
                onRename={openRenameModal}
                onDelete={openDeleteModal}
                onUseForDiagram={() => {
                  const ap = activePath();
                  if (ap && isDbmlPath(ap)) {
                    setEntryPoint(ap);
                  }
                }}
              />
            </div>
          </div>
        </Show>
      </div>

      <div class="explorer-tree" role="tree">
        <Show when={!projectRoot()}>
          <div class="explorer-recent">
            <p class="explorer-empty">Recent projects</p>
            <RecentProjectsList variant="compact" />
          </div>
        </Show>

        <Show when={projectRoot() && !showAllFiles() && dbmlCount() === 0}>
          <p class="explorer-empty">
            No <code>.dbml</code> files yet. Use + to add one, or enable{" "}
            <strong>Show all project files</strong>.
          </p>
        </Show>

        <Show when={projectRoot() && showAllFiles() && fileCount() === 0}>
          <p class="explorer-empty">This project folder is empty.</p>
        </Show>

        <Show when={projectRoot() && fileCount() > 0 && visibleTree().length === 0}>
          <p class="explorer-empty">No files match your filter.</p>
        </Show>

        <Show when={projectRoot() && visibleTree().length > 0}>
          <TreeItems
            nodes={visibleTree()}
            collapsed={collapsed()}
            onToggleFolder={toggleFolder}
            forceExpand={Boolean(query().trim())}
            onFileContextMenu={(path, x, y) => {
              setRevealError(null);
              setFileMenu({ path, x, y });
            }}
          />
        </Show>
      </div>

      <Show when={projectRoot() && fileCount() > 0}>
        <div class="explorer-footer">
          <Show
            when={showAllFiles()}
            fallback={<>{dbmlCount()} dbml file{dbmlCount() === 1 ? "" : "s"}</>}
          >
            {fileCount()} file{fileCount() === 1 ? "" : "s"} · {dbmlCount()} dbml
          </Show>
          <Show when={query().trim()}>
            {` · ${countLeafFiles(visibleTree())} shown`}
          </Show>
        </div>
      </Show>

      <Show when={fileMenu()}>
        {(menu) => (
          <Portal>
            <div
              class="explorer-file-menu"
              role="menu"
              ref={fileMenuEl}
              style={{ left: `${menu().x}px`, top: `${menu().y}px` }}
            >
              <Show when={isDbmlPath(menu().path)}>
                <button
                  type="button"
                  role="menuitem"
                  class="explorer-tree-menu-item"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={() => {
                    const path = menu().path;
                    setFileMenu(null);
                    useProjectStore.getState().setEntryPoint(path);
                    void useEditorStore.getState().openFile(path);
                  }}
                >
                  <FileCode size={14} />
                  <span>Open</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  class="explorer-tree-menu-item"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={() => {
                    setEntryPoint(menu().path);
                    setFileMenu(null);
                  }}
                >
                  <Waypoints size={14} />
                  <span>Use for diagram</span>
                </button>
              </Show>
              <button
                type="button"
                role="menuitem"
                class="explorer-tree-menu-item"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => copyPath(menu().path)}
              >
                <Copy size={14} />
                <span>Copy path</span>
              </button>
              <button
                type="button"
                role="menuitem"
                class="explorer-tree-menu-item"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => revealInFileExplorer(menu().path)}
              >
                <FolderOpen size={14} />
                <span>Show in {explorerName()}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                class="explorer-tree-menu-item"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => openRenameModal(menu().path)}
              >
                <Pencil size={14} />
                <span>Rename</span>
              </button>
              <button
                type="button"
                role="menuitem"
                class="explorer-tree-menu-item"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => openDeleteModal(menu().path)}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
              <Show when={revealError()}>
                <p class="explorer-file-menu-error">{revealError()}</p>
              </Show>
            </div>
          </Portal>
        )}
      </Show>

      <Show when={modalState()}>
        {(state) => (
          <Portal>
            <div class="modal-overlay" onClick={closeModal}>
              <div
                class="prompt-modal-dialog"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <div class="modal-header">
                  <h3 class="modal-title">
                    {state().type === "create" && "New DBML File"}
                    {state().type === "rename" && "Rename File"}
                    {state().type === "delete" && "Delete File"}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeModal}
                    aria-label="Close"
                  >
                    <X size={14} />
                  </Button>
                </div>
                <form onSubmit={handleModalSubmit}>
                  <div class="prompt-modal-body">
                    <Show
                      when={state().type === "delete"}
                      fallback={
                        <>
                          <p class="prompt-modal-message">
                            {state().type === "create"
                              ? "Enter file path (e.g. schema.dbml or tables/users.dbml):"
                              : "Enter new relative path:"}
                          </p>
                          <Input
                            type="text"
                            class="prompt-modal-input"
                            value={modalInput()}
                            onInput={(e) => setModalInput(e.currentTarget.value)}
                            placeholder={state().type === "create" ? "tables/orders.dbml" : (state() as any).path}
                            autofocus
                          />
                        </>
                      }
                    >
                      <p class="prompt-modal-message">
                        Are you sure you want to delete <strong>{(state() as any).path}</strong>? This cannot be undone.
                      </p>
                    </Show>
                    <Show when={modalError()}>
                      <p class="prompt-modal-error">{modalError()}</p>
                    </Show>
                  </div>
                  <div class="prompt-modal-footer">
                    <Button variant="outline" size="sm" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      variant={state().type === "delete" ? "destructive" : "default"}
                    >
                      {state().type === "create" && "Create File"}
                      {state().type === "rename" && "Rename"}
                      {state().type === "delete" && "Delete"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </Portal>
        )}
      </Show>
    </div>
  );
}
