/**
 * Integration tests for the `process_transaction` RPC.
 *
 * These hit the real Supabase project using the service_role key, so they
 * need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the env
 * (loaded from .env.local by vitest.setup.ts). The tests are skipped if
 * either var is missing — local-only by design.
 *
 * Each test creates its own product with a unique name and cleans up
 * afterwards so they can run in parallel.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/database.types";
import { callProcessTransaction } from "@/lib/supabase/rpc";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const skipReason =
  !SUPABASE_URL || !SERVICE_ROLE
    ? "skipped: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing"
    : null;

describe.skipIf(skipReason !== null)("process_transaction RPC", () => {
  let supabase: SupabaseClient<Database>;
  const createdProductIds: string[] = [];
  const TEST_PREFIX = `__test_${Date.now()}_`;

  beforeAll(() => {
    supabase = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  });

  afterAll(async () => {
    if (createdProductIds.length > 0) {
      // Delete transactions first to avoid FK violation
      await supabase.from("transactions").delete().in("product_id", createdProductIds);
      await supabase.from("products").delete().in("id", createdProductIds);
    }
  });

  async function createTestProduct(initialQuantity: number, minQuantity = 0) {
    const name = `${TEST_PREFIX}${crypto.randomUUID()}`;
    const { data, error } = await supabase
      .from("products")
      .insert({
        name,
        category: "test",
        unit: "ea",
        quantity: initialQuantity,
        min_quantity: minQuantity,
        location: "TEST",
      })
      .select()
      .single();
    if (error) throw error;
    createdProductIds.push(data.id);
    return data;
  }

  it("processes a normal in (입고) transaction", async () => {
    const product = await createTestProduct(50);

    const { data, error } = await callProcessTransaction(supabase, {
      p_product_id: product.id,
      p_type: "in",
      p_quantity: 30,
      p_note: "test in",
      p_user_id: null,
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({
      product_id: product.id,
      new_quantity: 80,
      low_stock: false,
    });

    const { data: updated } = await supabase
      .from("products")
      .select("quantity")
      .eq("id", product.id)
      .single();
    expect(updated?.quantity).toBe(80);
  });

  it("processes a normal out (출고) transaction", async () => {
    const product = await createTestProduct(100);

    const { data, error } = await callProcessTransaction(supabase, {
      p_product_id: product.id,
      p_type: "out",
      p_quantity: 25,
      p_note: "test out",
      p_user_id: null,
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({
      product_id: product.id,
      new_quantity: 75,
      low_stock: false,
    });
  });

  it("returns low_stock: true when new quantity falls to or below min_quantity", async () => {
    const product = await createTestProduct(20, 10);

    const { data, error } = await callProcessTransaction(supabase, {
      p_product_id: product.id,
      p_type: "out",
      p_quantity: 15,
      p_note: null,
      p_user_id: null,
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({
      new_quantity: 5,
      low_stock: true,
    });
  });

  it("rejects out transaction that would result in negative stock (INSUFFICIENT_STOCK)", async () => {
    const product = await createTestProduct(10);

    const { data, error } = await callProcessTransaction(supabase, {
      p_product_id: product.id,
      p_type: "out",
      p_quantity: 100,
      p_note: null,
      p_user_id: null,
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toContain("INSUFFICIENT_STOCK");

    // Verify the product quantity was NOT changed (transaction rolled back)
    const { data: unchanged } = await supabase
      .from("products")
      .select("quantity")
      .eq("id", product.id)
      .single();
    expect(unchanged?.quantity).toBe(10);

    // Verify NO transaction row was inserted
    const { data: txs } = await supabase
      .from("transactions")
      .select("id")
      .eq("product_id", product.id);
    expect(txs).toHaveLength(0);
  });

  it("rejects invalid type", async () => {
    const product = await createTestProduct(10);

    const { data, error } = await callProcessTransaction(supabase, {
      p_product_id: product.id,
      // @ts-expect-error intentional invalid input
      p_type: "invalid",
      p_quantity: 5,
      p_note: null,
      p_user_id: null,
    });

    expect(data).toBeNull();
    expect(error?.message).toContain("INVALID_TYPE");
  });

  it("rejects zero or negative quantity", async () => {
    const product = await createTestProduct(10);

    const { error: zeroErr } = await callProcessTransaction(supabase, {
      p_product_id: product.id,
      p_type: "in",
      p_quantity: 0,
      p_note: null,
      p_user_id: null,
    });
    expect(zeroErr?.message).toContain("INVALID_QUANTITY");

    const { error: negErr } = await callProcessTransaction(supabase, {
      p_product_id: product.id,
      p_type: "in",
      p_quantity: -5,
      p_note: null,
      p_user_id: null,
    });
    expect(negErr?.message).toContain("INVALID_QUANTITY");
  });

  it("returns PRODUCT_NOT_FOUND for non-existent product", async () => {
    const { data, error } = await callProcessTransaction(supabase, {
      p_product_id: "00000000-0000-0000-0000-000000000000",
      p_type: "in",
      p_quantity: 5,
      p_note: null,
      p_user_id: null,
    });

    expect(data).toBeNull();
    expect(error?.message).toContain("PRODUCT_NOT_FOUND");
  });

  it("logs the transaction in activity_logs", async () => {
    const product = await createTestProduct(50);

    await callProcessTransaction(supabase, {
      p_product_id: product.id,
      p_type: "in",
      p_quantity: 10,
      p_note: "audit log test",
      p_user_id: null,
    });

    const { data: logs } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("table_name", "transactions")
      .eq("action", "in")
      .order("created_at", { ascending: false })
      .limit(5);

    // At least one log entry exists with our product_id in details
    const matched = (logs ?? []).find((l) => {
      const details = l.details as { product_id?: string } | null;
      return details?.product_id === product.id;
    });
    expect(matched).toBeDefined();
  });
});
