import { Show } from "solid-js";
import { ExportMenu } from "../layout/ExportMenu";
import { OpenProjectMenu } from "../layout/OpenProjectMenu";
import { PanelToggles } from "../layout/PanelToggles";
import { useProjectStore } from "../projects/project-store";
import { ProjectHeaderBadge } from "./ProjectHeaderBadge";
import { SaveButton } from "./SaveButton";
import { SettingsButton } from "./SettingsButton";

export function AppHeader() {
  const projectRoot = () => useProjectStore((s) => s.projectRoot);

  return (
    <header class="flex h-(--header-height) min-w-0 shrink-0 items-center gap-3 border-b border-(--border) bg-[color-mix(in_srgb,var(--bg-panel)_94%,var(--bg-app))] px-3">
      <div class="flex min-w-0 flex-auto items-center justify-start">
        <ProjectHeaderBadge />
      </div>

      <div class="flex min-w-0 flex-none items-center justify-end">
        <div
          class="toolbar-segment header-toolbar-actions"
          role="toolbar"
          aria-label="Toolbar"
        >
          <Show when={projectRoot()}>
            <PanelToggles />
            <span class="toolbar-segment-split" aria-hidden />
          </Show>

          <OpenProjectMenu />
          <SaveButton />
          <ExportMenu />
          <SettingsButton />
        </div>
      </div>
    </header>
  );
}
