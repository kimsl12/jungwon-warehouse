import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * Typed wrappers around Supabase RPCs.
 *
 * The auto-generated `database.types.ts` does not model nullability of RPC
 * parameters (postgres `text` / `uuid` are nullable in the function body
 * but the generator types them as required strings). These helpers cast at
 * a single trusted boundary so callers can use proper nullable types.
 */

export type ProcessTransactionArgs = {
  p_product_id: string;
  p_type: "in" | "out" | "loss";
  p_quantity: number;
  p_note: string | null;
  p_user_id: string | null;
  /** Required when p_type === "out", optional for "in" and "loss" */
  p_site_id: string | null;
};

export type ProcessTransactionResult = {
  transaction_id: string;
  product_id: string;
  new_quantity: number;
  low_stock: boolean;
};

export function callProcessTransaction(
  client: SupabaseClient<Database>,
  args: ProcessTransactionArgs,
) {
  return client.rpc("process_transaction", args as never);
}

export type BulkImportProductsArgs = {
  p_products: unknown[];
  p_user_id: string | null;
};

export type BulkImportProductsResult = {
  inserted: number;
  skipped: number;
};

export function callBulkImportProducts(
  client: SupabaseClient<Database>,
  args: BulkImportProductsArgs,
) {
  return client.rpc("bulk_import_products", {
    p_products: args.p_products,
    p_user_id: args.p_user_id,
  } as never);
}
