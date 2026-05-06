import type { ChatTool, ToolRole } from "./types";
import { navigateToTool } from "./navigation";

export type { ChatTool, ToolRole, ToolContext, ToolCallSummary } from "./types";

const ALL_TOOLS: readonly ChatTool[] = [navigateToTool];

export function getToolsForRole(role: ToolRole): ChatTool[] {
  return ALL_TOOLS.filter((t) => t.roles.includes(role));
}

export function getToolByName(name: string): ChatTool | undefined {
  return ALL_TOOLS.find((t) => t.declaration.name === name);
}
