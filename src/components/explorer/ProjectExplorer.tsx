import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  Folder,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useEditorStore } from "../../stores/editor-store";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";
import { RecentProjectsList } from "../projects/RecentProjectsList";
import { ExplorerTreeMenu } from "./ExplorerTreeMenu";
import {
  ancestorFolderPaths,
  buildTree,
  collectFolderPaths,
  countDbmlFiles,
  countLeafFiles,
  filterDbmlEntries,
  filterTree,
  isDbmlPath,
  type TreeNode,
} from "./explorer-tree";

function TreeItems({
  nodes,
  depth = 0,
  collapsed,
  onToggleFolder,
  forceExpand,
}: {
  nodes: TreeNode[];
  depth?: number;
  collapsed: Set<string>;
  onToggleFolder: (path: string) => void;
  forceExpand: boolean;
}) {
  const openFile = useEditorStore((s) => s.openFile);
  const activePath = useEditorStore((s) => s.activePath);
  const tabs = useEditorStore((s) => s.tabs);
  const dirtyPaths = useMemo(
    () => new Set(tabs.filter((t) => t.isDirty).map((t) => t.relativePath)),
    [tabs],
  );
  const openPaths = useMemo(
    () => new Set(tabs.map((t) => t.relativePath)),
    [tabs],
  );

  return (
    <>
      {nodes.map((node) => {
        const expanded =
          forceExpand || !collapsed.has(node.path) || node.children.length === 0;
        const isActive = activePath === node.path;
        const isDirty = dirtyPaths.has(node.path);
        const isOpen = openPaths.has(node.path);
        const isDbml = isDbmlPath(node.path);

        return (
          <div key={node.path} className="tree-branch">
            <div
              className={[
                "tree-item",
                isActive ? "active" : "",
                isOpen && !node.isDirectory ? "open" : "",
                isDirty ? "dirty" : "",
                node.isDirectory ? "folder" : "file",
                !node.isDirectory && !isDbml ? "other-file" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ ["--depth" as string]: depth }}
              onClick={() => {
                if (node.isDirectory) {
                  onToggleFolder(node.path);
                  return;
                }
                if (isDbml) {
                  void openFile(node.path);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (node.isDirectory) {
                    onToggleFolder(node.path);
                  } else if (isDbml) {
                    void openFile(node.path);
                  }
                }
              }}
              role="treeitem"
              aria-expanded={node.isDirectory ? expanded : undefined}
              title={
                !node.isDirectory && !isDbml
                  ? `${node.path} (not editable here)`
                  : node.path
              }
              tabIndex={0}
            >
              {node.isDirectory ? (
                <span className="tree-item-chevron" aria-hidden>
                  {expanded ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </span>
              ) : (
                <span className="tree-item-chevron tree-item-chevron-spacer" />
              )}
              {node.isDirectory ? (
                <Folder size={14} className="tree-item-icon" />
              ) : isDbml ? (
                <FileCode size={14} className="tree-item-icon" />
              ) : (
                <File size={14} className="tree-item-icon" />
              )}
              <span className="tree-item-label">{node.name}</span>
            </div>
            {node.isDirectory && expanded && node.children.length > 0 && (
              <TreeItems
                nodes={node.children}
                depth={depth + 1}
                collapsed={collapsed}
                onToggleFolder={onToggleFolder}
                forceExpand={forceExpand}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function ProjectExplorer() {
  const files = useProjectStore((s) => s.files);
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const refreshFiles = useProjectStore((s) => s.refreshFiles);
  const createFile = useEditorStore((s) => s.createFile);
  const deleteFile = useEditorStore((s) => s.deleteFile);
  const renameFile = useEditorStore((s) => s.renameFile);
  const activePath = useEditorStore((s) => s.activePath);
  const setEntryPoint = useProjectStore((s) => s.setEntryPoint);
  const showAllFiles = useUiStore((s) => s.explorerShowAllFiles);
  const setShowAllFiles = useUiStore((s) => s.setExplorerShowAllFiles);

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const treeEntries = useMemo(
    () => (showAllFiles ? files : filterDbmlEntries(files)),
    [files, showAllFiles],
  );
  const tree = useMemo(() => buildTree(treeEntries), [treeEntries]);
  const visibleTree = useMemo(
    () => filterTree(tree, query),
    [tree, query],
  );
  const fileCount = useMemo(() => countLeafFiles(tree), [tree]);
  const dbmlCount = useMemo(() => countDbmlFiles(tree), [tree]);
  const forceExpand = query.trim().length > 0;

  const toggleFolder = (path: string) => {
    if (forceExpand) {
      return;
    }
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAllFolders = () => {
    setCollapsed(new Set());
  };

  const collapseAllFolders = () => {
    setCollapsed(new Set(collectFolderPaths(tree)));
  };

  const revealActiveFile = () => {
    if (!activePath) {
      return;
    }
    setCollapsed((prev) => {
      const next = new Set(prev);
      for (const folderPath of ancestorFolderPaths(activePath)) {
        next.delete(folderPath);
      }
      return next;
    });
  };

  const onCreate = async () => {
    const name = window.prompt("New file path (e.g. tables/orders.dbml)");
    if (!name?.endsWith(".dbml")) {
      return;
    }
    await createFile(name);
    await refreshFiles();
  };

  const onRename = async () => {
    if (!activePath) {
      return;
    }
    const next = window.prompt("Rename to (relative path):", activePath);
    if (!next || next === activePath || !next.endsWith(".dbml")) {
      return;
    }
    await renameFile(activePath, next);
    await refreshFiles();
  };

  const onDelete = async () => {
    if (!activePath) {
      return;
    }
    if (!window.confirm(`Delete ${activePath}? This cannot be undone.`)) {
      return;
    }
    await deleteFile(activePath);
    await refreshFiles();
  };

  return (
    <div className="panel panel-fill explorer-panel">
      <div className="explorer-header">
        {projectRoot ? (
          <div className="explorer-header-row">
            <label className="explorer-search">
              <Search size={14} className="explorer-search-icon" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter files"
                spellCheck={false}
              />
              {query && (
                <button
                  type="button"
                  className="explorer-search-clear"
                  title="Clear filter"
                  aria-label="Clear filter"
                  onClick={() => setQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <div className="explorer-actions">
              <button
                type="button"
                className="btn-icon btn-icon-xs"
                title="New DBML file"
                onClick={() => void onCreate()}
              >
                <Plus size={15} />
              </button>
              <ExplorerTreeMenu
                disabled={false}
                canRevealActive={Boolean(activePath)}
                canClearFilter={query.trim().length > 0}
                showAllFiles={showAllFiles}
                canRename={Boolean(activePath)}
                canDelete={Boolean(activePath)}
                canUseForDiagram={Boolean(activePath && isDbmlPath(activePath))}
                onExpandAll={expandAllFolders}
                onCollapseAll={collapseAllFolders}
                onRevealActive={revealActiveFile}
                onClearFilter={() => setQuery("")}
                onRefresh={() => void refreshFiles()}
                onToggleShowAllFiles={() => setShowAllFiles(!showAllFiles)}
                onRename={() => void onRename()}
                onDelete={() => void onDelete()}
                onUseForDiagram={() => {
                  if (activePath && isDbmlPath(activePath)) {
                    setEntryPoint(activePath);
                  }
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
      <div className="explorer-tree" role="tree">
        {!projectRoot && (
          <div className="explorer-recent">
            <p className="explorer-empty">Recent projects</p>
            <RecentProjectsList variant="compact" />
          </div>
        )}
        {projectRoot && !showAllFiles && dbmlCount === 0 && (
          <p className="explorer-empty">
            No <code>.dbml</code> files yet. Use + to add one, or enable{" "}
            <strong>Show all project files</strong>.
          </p>
        )}
        {projectRoot && showAllFiles && fileCount === 0 && (
          <p className="explorer-empty">This project folder is empty.</p>
        )}
        {projectRoot && fileCount > 0 && visibleTree.length === 0 && (
          <p className="explorer-empty">No files match your filter.</p>
        )}
        {projectRoot && visibleTree.length > 0 && (
          <TreeItems
            nodes={visibleTree}
            collapsed={collapsed}
            onToggleFolder={toggleFolder}
            forceExpand={forceExpand}
          />
        )}
      </div>
      {projectRoot && fileCount > 0 && (
        <div className="explorer-footer">
          {showAllFiles ? (
            <>
              {fileCount} file{fileCount === 1 ? "" : "s"} · {dbmlCount} dbml
            </>
          ) : (
            <>
              {dbmlCount} dbml file{dbmlCount === 1 ? "" : "s"}
            </>
          )}
          {query.trim()
            ? ` · ${countLeafFiles(visibleTree)} shown`
            : ""}
        </div>
      )}
    </div>
  );
}
