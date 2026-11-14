import { createEffect, Show } from "solid-js";
import "../styles/theme.css";
import "../styles/ui-components.css";
import "../styles/workspace.css";
import "../styles/settings.css";
import "../styles/quick-pick.css";
import { useEditorStore } from "../features/editor/editor-store";
import { useRevealTableInEditor } from "../features/editor/useRevealTableInEditor";
import { useAppKeymap } from "../features/keymap/use-app-keymap";
import { useNativeAppMenu } from "../features/keymap/use-native-app-menu";
import { useProjectStore } from "../features/projects/project-store";
import { useExternalDbmlOpen } from "../features/projects/useExternalDbmlOpen";
import { QuickPickModal } from "../features/quick-pick/QuickPickModal";
import { useDebouncedParse } from "../features/schema/useDebouncedParse";
import { AppSettings } from "../features/settings/AppSettings";
import { WelcomeView } from "./WelcomeView";
import { WorkspaceView } from "./WorkspaceView";

export default function App() {
  useDebouncedParse();
  useRevealTableInEditor();
  useExternalDbmlOpen();
  useAppKeymap();
  useNativeAppMenu();

  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const entryPoint = () => useProjectStore((s) => s.entryPoint);
  const openFile = useEditorStore.getState().openFile;

  createEffect(() => {
    const ep = entryPoint();
    if (projectRoot() && ep) {
      void openFile(ep);
    }
  });

  return (
    <>
      <Show when={projectRoot()} fallback={<WelcomeView />}>
        <WorkspaceView />
      </Show>
      <AppSettings />
      <QuickPickModal />
    </>
  );
}
