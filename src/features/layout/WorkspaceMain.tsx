import { Show } from "solid-js";
import { SchemaDiagram } from "../../features/diagram/SchemaDiagram";
import { DbmlEditor } from "../../features/editor/DbmlEditor";
import { EditorTabs } from "../../features/editor/EditorTabs";
import { useUiStore } from "../../shared/stores/ui-store";
import { SplitPane } from "./SplitPane";

function EditorPanel() {
  return (
    <div class="panel panel-fill panel-flush">
      <EditorTabs />
      <div class="panel-content">
        <DbmlEditor />
      </div>
    </div>
  );
}

export function WorkspaceMain() {
  const panels = () => useUiStore((s) => s.panels);

  return (
    <main class="workspace-main">
      <Show
        when={panels().editor && panels().diagram}
        fallback={
          <Show
            when={panels().editor}
            fallback={
              <Show
                when={panels().diagram}
                fallback={
                  <div class="workspace-empty">
                    <p>All center panels are hidden.</p>
                    <p class="empty-hint">
                      Use the Explorer, Editor, Diagram, or Inspector buttons in
                      the header to show a panel.
                    </p>
                  </div>
                }
              >
                <SchemaDiagram />
              </Show>
            }
          >
            <EditorPanel />
          </Show>
        }
      >
        <SplitPane
          direction="horizontal"
          initialRatio={0.48}
          first={<EditorPanel />}
          second={<SchemaDiagram />}
        />
      </Show>
    </main>
  );
}
