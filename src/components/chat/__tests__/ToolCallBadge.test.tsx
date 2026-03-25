import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result" = "result"
): ToolInvocation {
  return {
    toolCallId: "test-id",
    toolName,
    args,
    state,
    ...(state === "result" ? { result: "ok" } : {}),
  } as ToolInvocation;
}

test("shows 'Creating' for str_replace_editor create command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/App.jsx",
      })}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor str_replace command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "str_replace",
        path: "/components/Button.tsx",
      })}
    />
  );
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor insert command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "insert",
        path: "/App.jsx",
      })}
    />
  );
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Reading' for str_replace_editor view command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "view",
        path: "/App.jsx",
      })}
    />
  );
  expect(screen.getByText("Reading App.jsx")).toBeDefined();
});

test("shows 'Renaming' for file_manager rename command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("file_manager", {
        command: "rename",
        path: "/OldName.jsx",
      })}
    />
  );
  expect(screen.getByText("Renaming OldName.jsx")).toBeDefined();
});

test("shows 'Deleting' for file_manager delete command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("file_manager", {
        command: "delete",
        path: "/App.jsx",
      })}
    />
  );
  expect(screen.getByText("Deleting App.jsx")).toBeDefined();
});

test("falls back to tool name for unknown tools", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("unknown_tool", { path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("uses 'file' as filename fallback when path is missing", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
      })}
    />
  );
  expect(screen.getByText("Creating file")).toBeDefined();
});

test("shows green dot when state is result", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/App.jsx",
      }, "result")}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

test("shows spinner when state is call", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", {
        command: "create",
        path: "/App.jsx",
      }, "call")}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});
