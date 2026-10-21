import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Node } from "@xyflow/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiagramContextMenu } from "../../src/components/diagram/DiagramContextMenu";
import { useDiagramStore } from "../../src/stores/diagram-store";

function renderMenu(
  overrides: Partial<ComponentProps<typeof DiagramContextMenu>> = {},
) {
  const props = {
    state: { x: 20, y: 20, tableId: null },
    isRunning: false,
    canRun: true,
    canRunSelection: false,
    onRunLayout: vi.fn(),
    onFitView: vi.fn(),
    onFocusTable: vi.fn(),
    onEditTable: vi.fn(),
    onNewTable: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<DiagramContextMenu {...props} />);
  return props;
}

afterEach(() => {
  cleanup();
  useDiagramStore.setState({ nodes: [], edges: [] });
});

describe("DiagramContextMenu", () => {
  it("offers new table and layout actions on the pane menu", async () => {
    const props = renderMenu();

    expect(screen.queryByText("Focus table")).not.toBeInTheDocument();
    expect(screen.queryByText("Grid")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("menuitem", { name: "New table" }));
    expect(props.onNewTable).toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("menuitem", { name: /auto-arrange all/i }),
    );
    expect(props.onRunLayout).toHaveBeenCalledWith("all");
  });

  it("shows table actions for a node menu", async () => {
    useDiagramStore.setState({
      nodes: [
        {
          id: "users",
          position: { x: 0, y: 0 },
          data: { table: { name: "users" } },
        } as Node,
      ],
    });
    const props = renderMenu({
      state: { x: 20, y: 20, tableId: "users" },
      canRunSelection: true,
    });

    expect(screen.getByText("users")).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "New table" }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("menuitem", { name: "Edit table" }),
    );
    expect(props.onEditTable).toHaveBeenCalledWith("users");

    await userEvent.click(screen.getByRole("menuitem", { name: "Focus table" }));
    expect(props.onFocusTable).toHaveBeenCalledWith("users");

    await userEvent.click(
      screen.getByRole("menuitem", { name: "Arrange related cluster" }),
    );
    expect(props.onRunLayout).toHaveBeenCalledWith("selection");
  });

  it("closes when clicking outside", async () => {
    const props = renderMenu();

    await userEvent.click(document.body);

    expect(props.onClose).toHaveBeenCalled();
  });
});
