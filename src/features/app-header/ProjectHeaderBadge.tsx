import { FileText, FolderOpen, X } from "lucide-solid";
import { Show } from "solid-js";
import { useCommandKeybindingLabel } from "../keymap/format-command-keybinding";
import { useProjectStore } from "../projects/project-store";
import { Button } from "../../shared/ui";

export function ProjectHeaderBadge() {
  const projectName = () => useProjectStore((s) => s.projectName);
  const projectScope = () => useProjectStore((s) => s.projectScope);
  const closeProject = useProjectStore.getState().closeProject;
  const closeShortcut = () => useCommandKeybindingLabel("project.close");

  const closeLabel = () =>
    projectScope() === "file" ? "Close file" : "Close folder";
  const closeTitle = () =>
    closeShortcut() ? `${closeLabel()} (${closeShortcut()})` : closeLabel();

  return (
    <Show
      when={projectName()}
      fallback={
        <div class="inline-flex min-w-0 select-none items-center gap-2" aria-hidden>
          <span class="inline-flex size-[22px] shrink-0 items-center justify-center rounded-md bg-(--accent-soft) text-(--accent)">
            DB
          </span>
          <span class="hidden shrink-0 text-[13px] font-semibold tracking-[-0.03em] text-(--text) min-[761px]:inline">
            dbvolio
          </span>
        </div>
      }
    >
      <div class="group inline-flex min-w-0 max-w-[min(160px,42vw)] items-center gap-1.5 rounded-lg border border-transparent bg-transparent py-1 pr-1 pl-1.5 transition-[background,border-color] duration-120 ease-out hover:border-[color-mix(in_srgb,var(--border)_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--bg-subtle)_92%,var(--border))] focus-within:border-[color-mix(in_srgb,var(--border)_70%,transparent)] focus-within:bg-[color-mix(in_srgb,var(--bg-subtle)_92%,var(--border))] min-[761px]:max-w-[min(280px,38vw)]">
        <Show
          when={projectScope() === "file"}
          fallback={
            <FolderOpen
              size={14}
              class="ml-0.5 shrink-0 text-(--text-muted)"
              aria-hidden
            />
          }
        >
          <FileText
            size={14}
            class="ml-0.5 shrink-0 text-(--text-muted)"
            aria-hidden
          />
        </Show>
        <span
          class="min-w-0 flex-1 truncate text-xs font-medium text-(--text)"
          title={projectName() ?? ""}
        >
          {projectName()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          class="size-6 shrink-0 opacity-70 transition-opacity duration-120 ease-out [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
          aria-label={closeLabel()}
          title={closeTitle()}
          onClick={() =>
            void closeProject().catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              window.alert(message);
            })
          }
        >
          <X size={14} />
        </Button>
      </div>
    </Show>
  );
}
