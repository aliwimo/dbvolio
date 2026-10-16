import { Clock, FileCode, FolderOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { filesForScope } from "../../features/open/project-scope-files";
import { openDbmlInWorkspace } from "../../features/open/open-dbml-in-workspace";
import { quickPickMatchesQuery } from "../../features/quick-pick/filter-quick-pick-items";
import { recentProjectLabel } from "../projects/RecentProjectsList";
import { useProjectStore } from "../../stores/project-store";
import {
  useQuickPickStore,
  type QuickPickKind,
} from "../../stores/quick-pick-store";

interface PickItem {
  id: string;
  label: string;
  description?: string;
  icon: "recent" | "file";
  run: () => void;
}

function titleForKind(kind: QuickPickKind): string {
  return kind === "recent" ? "Open Recent" : "Go to File";
}

function placeholderForKind(kind: QuickPickKind): string {
  return kind === "recent"
    ? "Search recent projects…"
    : "Search files by name…";
}

export function QuickPickModal() {
  const kind = useQuickPickStore((s) => s.kind);
  const query = useQuickPickStore((s) => s.query);
  const selectedIndex = useQuickPickStore((s) => s.selectedIndex);
  const setQuery = useQuickPickStore((s) => s.setQuery);
  const setSelectedIndex = useQuickPickStore((s) => s.setSelectedIndex);
  const close = useQuickPickStore((s) => s.close);

  const recentProjects = useProjectStore((s) => s.recentProjects);
  const openProjectPath = useProjectStore((s) => s.openProjectPath);
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const projectScope = useProjectStore((s) => s.projectScope);
  const entryPoint = useProjectStore((s) => s.entryPoint);
  const files = useProjectStore((s) => s.files);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const items = useMemo((): PickItem[] => {
    if (!kind) {
      return [];
    }

    if (kind === "recent") {
      return recentProjects.map((path) => {
        const { name } = recentProjectLabel(path);
        return {
          id: path,
          label: name,
          description: path,
          icon: "recent" as const,
          run: () => {
            void openProjectPath(path).catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              window.alert(message);
            });
          },
        };
      });
    }

    if (!projectRoot) {
      return [];
    }

    const scoped = filesForScope(files, projectScope, entryPoint);
    return scoped
      .filter((f) => !f.isDirectory && f.relativePath.endsWith(".dbml"))
      .map((f) => ({
        id: f.relativePath,
        label: f.relativePath.split("/").pop() ?? f.relativePath,
        description: f.relativePath,
        icon: "file" as const,
        run: () => {
          openDbmlInWorkspace(f.relativePath);
        },
      }));
  }, [
    kind,
    recentProjects,
    openProjectPath,
    projectRoot,
    files,
    projectScope,
    entryPoint,
  ]);

  const filtered = useMemo(() => {
    return items.filter((item) =>
      quickPickMatchesQuery(`${item.label} ${item.description ?? ""}`, query),
    );
  }, [items, query]);

  const clampedIndex =
    filtered.length === 0 ? 0 : Math.min(selectedIndex, filtered.length - 1);

  useEffect(() => {
    if (clampedIndex !== selectedIndex) {
      setSelectedIndex(clampedIndex);
    }
  }, [clampedIndex, selectedIndex, setSelectedIndex]);

  useEffect(() => {
    if (!kind) {
      return;
    }
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [kind]);

  useEffect(() => {
    if (!kind || !listRef.current) {
      return;
    }
    const active = listRef.current.querySelector(".quick-pick-item.active");
    active?.scrollIntoView({ block: "nearest" });
  }, [kind, clampedIndex, filtered.length]);

  const activate = useCallback(
    (item: PickItem | undefined) => {
      if (!item) {
        return;
      }
      close();
      item.run();
    },
    [close],
  );

  const onPickerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filtered.length > 0) {
        setSelectedIndex((clampedIndex + 1) % filtered.length);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length > 0) {
        setSelectedIndex((clampedIndex - 1 + filtered.length) % filtered.length);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      activate(filtered[clampedIndex]);
    }
  };

  if (!kind) {
    return null;
  }

  const emptyMessage =
    kind === "files" && !projectRoot
      ? "Open a project to browse files."
      : "No matching items.";

  return (
    <div
      className="quick-pick-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div
        className="quick-pick"
        role="dialog"
        aria-modal="true"
        aria-label={titleForKind(kind)}
        onKeyDown={onPickerKeyDown}
      >
        <header className="quick-pick-header">
          <h2 className="quick-pick-title">{titleForKind(kind)}</h2>
        </header>
        <input
          ref={inputRef}
          type="search"
          className="quick-pick-input"
          placeholder={placeholderForKind(kind)}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onPickerKeyDown}
          aria-label={placeholderForKind(kind)}
          autoComplete="off"
          spellCheck={false}
        />
        <ul
          ref={listRef}
          className="quick-pick-list"
          role="listbox"
          aria-activedescendant={
            filtered[clampedIndex]
              ? `quick-pick-${filtered[clampedIndex].id}`
              : undefined
          }
        >
          {filtered.length === 0 ? (
            <li className="quick-pick-empty">{emptyMessage}</li>
          ) : (
            filtered.map((item, index) => (
              <li key={item.id} role="presentation">
                <button
                  id={`quick-pick-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === clampedIndex}
                  className={[
                    "quick-pick-item",
                    index === clampedIndex ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => activate(item)}
                >
                  {item.icon === "recent" ? (
                    <Clock size={15} className="quick-pick-item-icon" />
                  ) : (
                    <FileCode size={15} className="quick-pick-item-icon" />
                  )}
                  <span className="quick-pick-item-text">
                    <span className="quick-pick-item-label">{item.label}</span>
                    {item.description && item.description !== item.label && (
                      <span className="quick-pick-item-desc">
                        {item.description}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        {kind === "recent" && (
          <footer className="quick-pick-footer">
            <FolderOpen size={14} aria-hidden />
            <span>Type to filter recent folders</span>
          </footer>
        )}
      </div>
    </div>
  );
}
