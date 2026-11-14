import { AppHeader } from "../features/app-header/AppHeader";
import { Welcome } from "../features/layout/Welcome";

export function WelcomeView() {
  return (
    <div class="workspace">
      <AppHeader />
      <div class="workspace-body">
        <main class="workspace-main">
          <Welcome />
        </main>
      </div>
    </div>
  );
}
