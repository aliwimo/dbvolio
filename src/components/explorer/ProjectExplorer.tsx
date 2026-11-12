import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  Folder,
  Plus,
  Search,
  X,
} from "lucide-solid";
import { createSignal, createMemo, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useEditorStore } from "../../stores/editor-store";
import { filesForScope } from "../../features/open/project-scope-files";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";
import { RecentProjectsList } from "../projects/RecentProjectsList";
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

function TreeItems(props: {
  nodes: TreeNode[];
  depth?: number;
  collapsed: Set<string>;
  onToggleFolder: (path: string) => void;
  forceExpand: boolean;
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

  const openRenameModal = () => {
    const p = activePath();
    if (!p) return;
    setModalInput(p);
    setModalError(null);
    setModalState({ type: "rename", path: p });
  };

  const openDeleteModal = () => {
    const p = activePath();
    if (!p) return;
    setModalError(null);
    setModalState({ type: "delete", path: p });
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
            <div class="explorer-search">
              <Search size={13} class="explorer-search-icon" aria-hidden />
              <input
                placeholder="Search files…"
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
              />
              <Show when={query()}>
                <button
                  type="button"
                  class="explorer-search-clear"
                  onClick={() => setQuery("")}
                >
                  <X size={12} />
                </button>
              </Show>
            </div>
            <div class="explorer-actions">
              <button
                type="button"
                class="btn-icon btn-icon-xs"
                title="New DBML file"
                aria-label="New DBML file"
                onClick={openCreateModal}
              >
                <Plus size={14} />
              </button>
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
                  <button
                    type="button"
                    class="btn-icon btn-icon-xs"
                    onClick={closeModal}
                    aria-label="Close"
                  >
                    <X size={14} />
                  </button>
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
                          <input
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
                    <button type="button" class="btn btn-sm btn-ghost" onClick={closeModal}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      class={`btn btn-sm ${state().type === "delete" ? "btn-danger" : "btn-primary"}`}
                      style={state().type === "delete" ? { background: "var(--danger)", color: "#fff", "border-color": "var(--danger)" } : undefined}
                    >
                      {state().type === "create" && "Create File"}
                      {state().type === "rename" && "Rename"}
                      {state().type === "delete" && "Delete"}
                    </button>
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
