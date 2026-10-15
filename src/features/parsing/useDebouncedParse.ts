import { startTransition, useEffect } from "react";
import { parseProject } from "../../services/dbml-parser";
import {
  getDiagramLayout,
  loadLayoutMetadata,
  mergeLayoutWithNodes,
} from "../../services/layout-service";
import { readProjectFile } from "../../services/tauri-bridge";
import { useDiagramStore } from "../../stores/diagram-store";
import { useEditorStore } from "../../stores/editor-store";
import { useProjectStore } from "../../stores/project-store";
import { useDiagramViewStore } from "../../stores/diagram-view-store";
import { applyDagreLayoutAsync } from "../diagram-layout/dagre-layout-async";
import { useAppSettingsStore } from "../../stores/app-settings-store";
import { schemaToFlow } from "../schema/schemaToFlow";

export function useDebouncedParse() {
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const entryPoint = useProjectStore((s) => s.entryPoint);
  const files = useProjectStore((s) => s.files);
  const contentRevision = useEditorStore((s) => s.contentRevision);
  const parseDebounceMs = useAppSettingsStore((s) => s.parseDebounceMs);

  useEffect(() => {
    if (!projectRoot || !entryPoint) {
      return;
    }

    const generation = useDiagramStore.getState().bumpParseGeneration();

    const handle = window.setTimeout(async () => {
      const openContents = useEditorStore.getState().getOpenFileContents();
      const fileMap: Record<string, string> = {};

      for (const file of files) {
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
      const needsLayout = positioned.every(
        (n) => n.position.x === 0 && n.position.y === 0,
      );
      if (needsLayout) {
        const rankdir = useDiagramViewStore.getState().layoutDirection;
        positioned = await applyDagreLayoutAsync(positioned, edges, rankdir);
      }
      if (generation === useDiagramStore.getState().parseGeneration) {
        startTransition(() => {
          if (generation === useDiagramStore.getState().parseGeneration) {
            useDiagramStore.getState().setFlow(positioned, edges);
          }
        });
      }
    }, parseDebounceMs);

    return () => window.clearTimeout(handle);
  }, [projectRoot, entryPoint, files, contentRevision, parseDebounceMs]);
}
