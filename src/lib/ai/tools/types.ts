import type { FunctionDeclaration } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type ToolRole = "user" | "admin";

export type ToolContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  userRole: ToolRole;
};

export type ChatTool = {
  declaration: FunctionDeclaration;
  roles: readonly ToolRole[];
  execute: (
    args: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<unknown>;
};

export type ToolCallSummary = {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
};
