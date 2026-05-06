import type { ChatTool, ToolRole } from "./types";
import { navigateToTool } from "./navigation";
import { searchInventoryTool, findLowStockTool } from "./inventory";
import { findRecentTransactionsTool } from "./transactions";
import { searchVendorTool, getVendorPricesTool } from "./vendors";
import { searchSiteTool, getSiteDetailsTool } from "./sites";

export type { ChatTool, ToolRole, ToolContext, ToolCallSummary } from "./types";

const ALL_TOOLS: readonly ChatTool[] = [
  navigateToTool,
  searchInventoryTool,
  findLowStockTool,
  findRecentTransactionsTool,
  searchVendorTool,
  getVendorPricesTool,
  searchSiteTool,
  getSiteDetailsTool,
];

export function getToolsForRole(role: ToolRole): ChatTool[] {
  return ALL_TOOLS.filter((t) => t.roles.includes(role));
}

export function getToolByName(name: string): ChatTool | undefined {
  return ALL_TOOLS.find((t) => t.declaration.name === name);
}
