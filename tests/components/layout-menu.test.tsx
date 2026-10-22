import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LayoutMenu } from "../../src/components/diagram/LayoutMenu";
import { useDiagramViewStore } from "../../src/stores/diagram-view-store";

function renderMenu() {
  const props = {
    isRunning: false,
    canRun: true,
    canRunSelection: false,
    onRunLayout: vi.fn(),
    onFitView: vi.fn(),
  };
  render(<LayoutMenu {...props} />);
  return props;
}

async function openMenu() {
  await userEvent.click(
    screen.getByRole("button", { name: "Auto-arrange options" }),
  );
}

afterEach(() => {
  cleanup();
  useDiagramViewStore.setState({
    layoutAlgorithm: "left-right",
    layoutSpacing: "default",
    layoutFitView: true,
    layoutSeparateComponents: true,
  });
});

describe("LayoutMenu", () => {
  it("renders the arrange menu in a portal", async () => {
    renderMenu();
    await openMenu();

    expect(
      screen.getByRole("menu", { name: "Auto-arrange" }),
    ).toBeInTheDocument();
  });

  it("applies spacing changes without closing or reopening the menu", async () => {
    const props = renderMenu();
    await openMenu();

    await userEvent.click(screen.getByRole("radio", { name: "Compact" }));

    expect(useDiagramViewStore.getState().layoutSpacing).toBe("compact");
    expect(props.onRunLayout).toHaveBeenCalledWith("all");
    expect(
      screen.getByRole("menu", { name: "Auto-arrange" }),
    ).toBeInTheDocument();
  });

  it("re-arranges when a layout option is toggled", async () => {
    const props = renderMenu();
    await openMenu();

    await userEvent.click(
      screen.getByLabelText("Arrange disconnected groups separately"),
    );

    expect(
      useDiagramViewStore.getState().layoutSeparateComponents,
    ).toBe(false);
    expect(props.onRunLayout).toHaveBeenCalledWith("all");
  });

  it("runs and closes when a preset is chosen", async () => {
    const props = renderMenu();
    await openMenu();

    await userEvent.click(
      screen.getByRole("menuitem", { name: /Dependency lanes/ }),
    );

    expect(props.onRunLayout).toHaveBeenCalledWith("all", "pipeline");
    expect(
      screen.queryByRole("menu", { name: "Auto-arrange" }),
    ).not.toBeInTheDocument();
  });

  it("closes when clicking outside the portal", async () => {
    renderMenu();
    await openMenu();

    await userEvent.click(document.body);

    expect(
      screen.queryByRole("menu", { name: "Auto-arrange" }),
    ).not.toBeInTheDocument();
  });
});
