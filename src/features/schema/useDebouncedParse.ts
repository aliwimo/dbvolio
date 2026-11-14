import { createEffect, onCleanup } from "solid-js";
import { parseProject } from "./dbml-parser";
import {
  getDiagramLayout,
  loadLayoutMetadata,
  mergeLayoutWithNodes,
} from "../diagram-layout/layout-service";
import { readProjectFile } from "../../shared/services/tauri-bridge";
import { useDiagramStore } from "../diagram/diagram-store";
import { useEditorStore } from "../editor/editor-store";
import { filesForScope } from "../projects/project-scope-files";
import { useProjectStore } from "../projects/project-store";
import { useDiagramViewStore } from "../diagram/diagram-view-store";
import { applyAutoLayoutAsync } from "../diagram-layout/apply-auto-layout";
import { isGroupNode } from "../diagram-layout/table-group-bounds";
import { useAppSettingsStore } from "../settings/app-settings-store";
import { schemaToFlow } from "./schemaToFlow";

export function useDebouncedParse() {
  createEffect(() => {
    const projectRoot = useProjectStore((s) => s.projectRoot);
    const entryPoint = useProjectStore((s) => s.entryPoint);
    const projectScope = useProjectStore((s) => s.projectScope);
    const files = useProjectStore((s) => s.files);
    const contentRevision = useEditorStore((s) => s.contentRevision);
    const parseDebounceMs = useAppSettingsStore((s) => s.parseDebounceMs);

    void contentRevision;

    if (!projectRoot || !entryPoint) {
      return;
    }

    const generation = useDiagramStore.getState().bumpParseGeneration();

    const handle = window.setTimeout(async () => {
      const openContents = useEditorStore.getState().getOpenFileContents();
      const fileMap: Record<string, string> = {};

      const scopedFiles = filesForScope(files, projectScope, entryPoint);
      for (const file of scopedFiles) {
        if (file.isDirectory || !file.relativePath.endsWith(".dbml")) {
          continue;
        }
        if (openContents[file.relativePath] !== undefined) {
          fileMap[file.relativePath] = openContents[file.relativePath];
        } else {
          try {
            const disk = await readProjectFile(file.relativePath);
            fileMap[file.relativePath] = disk.content;
          } catch {
            // skip unreadable files
          }
        }
      }

      const result = parseProject(projectRoot, fileMap, entryPoint);
      useDiagramStore.getState().setParseResult(generation, result);

      const model =
        result.model ?? useDiagramStore.getState().lastValidModel;
      if (!model) {
        return;
      }

      const { nodes, edges } = schemaToFlow(model);
      const layoutFile = await loadLayoutMetadata();
      const diagramLayout = getDiagramLayout(layoutFile, entryPoint);
      if (diagramLayout.viewport) {
        useDiagramViewStore.getState().setPendingViewport(diagramLayout.viewport);
      }
      let positioned = mergeLayoutWithNodes(nodes, diagramLayout.nodes);
      const tableNodes = positioned.filter((n) => !isGroupNode(n));
      const needsLayout =
        tableNodes.length > 0 &&
        tableNodes.every((n) => n.position.x === 0 && n.position.y === 0);
      if (needsLayout) {
        const view = useDiagramViewStore.getState();
        positioned = await applyAutoLayoutAsync(positioned, edges, {
          algorithm: view.layoutAlgorithm,
          rankdir: view.layoutDirection,
          spacing: view.layoutSpacing,
          scope: "all",
          selectedNodeId: null,
          separateComponents: view.layoutSeparateComponents,
        });
      }
      if (generation === useDiagramStore.getState().parseGeneration) {
        useDiagramStore.getState().setFlow(positioned, edges);
      }
    }, parseDebounceMs);

    onCleanup(() => window.clearTimeout(handle));
  });
}
