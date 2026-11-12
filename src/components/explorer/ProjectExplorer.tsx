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
  selectedPath: string | null;
  onSelectNode: (path: string) => void;
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
        const isSelected = () => props.selectedPath === node.path;
        const isDirty = () => dirtyPaths().has(node.path);
        const isOpen = () => openPaths().has(node.path);
        const isDbml = () => isDbmlPath(node.path);

        return (
          <div class="tree-branch">
            <div
              class={[
                "tree-item",
                isActive() ? "active" : "",
                isSelected() ? "selected" : "",
                isOpen() && !node.isDirectory ? "open" : "",
                isDirty() ? "dirty" : "",
                node.isDirectory ? "folder" : "file",
                !node.isDirectory && !isDbml() ? "other-file" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ "--depth": props.depth ?? 0 }}
              onClick={() => {
                props.onSelectNode(node.path);
                if (node.isDirectory) {
                  props.onToggleFolder(node.path);
                } else {
                  void openFile(node.path);
                }
              }}
            >
              <Show
                when={node.isDirectory}
                fallback={
                  <>
                    <span class="tree-arrow-spacer" />
                    <Show
                      when={isDbml()}
                      fallback={<File size={14} class="tree-icon" aria-hidden />}
                    >
                      <FileCode size={14} class="tree-icon tree-icon-dbml" aria-hidden />
                    </Show>
                  </>
                }
              >
                <button
                  type="button"
                  class="tree-arrow"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onToggleFolder(node.path);
                  }}
                >
                  <Show
                    when={expanded()}
                    fallback={<ChevronRight size={12} />}
                  >
                    <ChevronDown size={12} />
                  </Show>
                </button>
                <Folder size={14} class="tree-icon" aria-hidden />
              </Show>

              <span class="tree-name" title={node.path}>
                {node.name}
              </span>
            </div>

            <Show when={node.isDirectory && expanded() && node.children.length > 0}>
              <TreeItems
                nodes={node.children}
                depth={(props.depth ?? 0) + 1}
                collapsed={props.collapsed}
                onToggleFolder={props.onToggleFolder}
                forceExpand={props.forceExpand}
                selectedPath={props.selectedPath}
                onSelectNode={props.onSelectNode}
              />
            </Show>
          </div>
        );
      }}
    </For>
  );
}

export function ProjectExplorer() {
  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const rawFiles = () => useProjectStore((s) => s.files);
  const entryPoint = () => useProjectStore((s) => s.entryPoint);
  const projectScope = () => useProjectStore((s) => s.projectScope);
  const showAllFiles = () => useUiStore((s) => s.explorerShowAllFiles);
  const setExplorerShowAllFiles = useUiStore.getState().setExplorerShowAllFiles;
  const refreshFiles = useProjectStore.getState().refreshFiles;
  const activePath = () => useEditorStore((s) => s.activePath);
  const createFile = useEditorStore.getState().createFile;
  const renameFile = useEditorStore.getState().renameFile;
  const deleteFile = useEditorStore.getState().deleteFile;

  const [query, setQuery] = createSignal("");
  const [collapsed, setCollapsed] = createSignal<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = createSignal<string | null>(null);

  const scopedEntries = createMemo(() => {
    const list = filesForScope(rawFiles(), projectScope(), entryPoint());
    return showAllFiles() ? list : filterDbmlEntries(list);
  });

  const fullTree = createMemo(() => buildTree(scopedEntries()));

  const filteredTree = createMemo(() => {
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
  const collapseAll = () => {
    setCollapsed(new Set<string>(collectFolderPaths(fullTree())));
  };

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
    setSelectedPath(current);
  };

  const handleNewFile = async () => {
    const name = window.prompt("New DBML file name (e.g. schema.dbml):");
    if (!name?.trim()) return;
    const cleanName = name.trim().endsWith(".dbml")
      ? name.trim()
      : `${name.trim()}.dbml`;
    await createFile(cleanName);
    await refreshFiles();
  };

  const handleRename = async () => {
    const target = selectedPath();
    if (!target) return;
    const newName = window.prompt("Rename file to:", target);
    if (!newName?.trim() || newName === target) return;
    await renameFile(target, newName.trim());
    await refreshFiles();
  };

  const handleDelete = async () => {
    const target = selectedPath();
    if (!target) return;
    if (window.confirm(`Delete ${target}?`)) {
      await deleteFile(target);
      await refreshFiles();
    }
  };

  return (
    <div class="panel panel-fill explorer-panel">
      <div class="explorer-header">
        <span class="explorer-title">Files</span>
        <div class="explorer-actions">
          <Show when={projectRoot()}>
            <button
              type="button"
              class="btn-icon"
              title="New file"
              onClick={handleNewFile}
            >
              <Plus size={14} />
            </button>
          </Show>
          <ExplorerTreeMenu
            disabled={!projectRoot()}
            canRevealActive={Boolean(activePath())}
            canClearFilter={Boolean(query().trim())}
            showAllFiles={showAllFiles()}
            canRename={Boolean(selectedPath())}
            canDelete={Boolean(selectedPath())}
            canUseForDiagram={Boolean(selectedPath()?.endsWith(".dbml"))}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onRevealActive={revealActive}
            onClearFilter={() => setQuery("")}
            onRefresh={() => void refreshFiles()}
            onToggleShowAllFiles={() =>
              setExplorerShowAllFiles(!showAllFiles())
            }
            onRename={handleRename}
            onDelete={handleDelete}
            onUseForDiagram={() => {
              const sel = selectedPath();
              if (sel?.endsWith(".dbml")) {
                useProjectStore.getState().setEntryPoint(sel);
              }
            }}
          />
        </div>
      </div>

      <Show
        when={projectRoot()}
        fallback={<RecentProjectsList variant="default" />}
      >
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
              class="btn-icon explorer-search-clear"
              onClick={() => setQuery("")}
            >
              <X size={12} />
            </button>
          </Show>
        </div>

        <div class="explorer-tree" role="tree">
          <TreeItems
            nodes={filteredTree()}
            collapsed={collapsed()}
            onToggleFolder={toggleFolder}
            forceExpand={Boolean(query().trim())}
            selectedPath={selectedPath()}
            onSelectNode={setSelectedPath}
          />
        </div>
      </Show>
    </div>
  );
}
