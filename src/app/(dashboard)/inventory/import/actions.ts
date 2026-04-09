"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseProductsCsv, type ParsedProductRow } from "@/lib/csv/parse";
import { createClient } from "@/lib/supabase/server";

export type ImportPreview =
  | {
      ok: true;
      rows: ParsedProductRow[];
      warnings: string[];
      /** Names that already exist in DB → would be skipped on plain import */
      existingNames: string[];
    }
  | { ok: false; error: string };

export type ImportResult =
  | { ok: true; inserted: number; updated: number; skipped: number; warnings: string[] }
  | { ok: false; error: string };

/**
 * Server Action: parse the uploaded CSV in-memory, look up which names
 * already exist in DB, and return everything the preview UI needs.
 *
 * The text round-trips through the form so the user can decide whether to
 * skip duplicates or overwrite them — we send the original CSV back as a
 * hidden field rather than re-uploading the file.
 */
export async function previewImport(formData: FormData): Promise<ImportPreview> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { ok: false, error: "관리자만 CSV 가져오기를 사용할 수 있습니다." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "CSV 파일을 선택해주세요." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "파일 크기가 너무 큽니다 (최대 5MB)." };
  }

  let csvText: string;
  try {
    const buf = await file.arrayBuffer();
    csvText = new TextDecoder("utf-8").decode(buf);
  } catch {
    return { ok: false, error: "파일을 읽을 수 없습니다." };
  }

  const parsed = parseProductsCsv(csvText);
  if (!parsed.ok) return parsed;

  // Look up which names already exist
  const names = parsed.rows.map((r) => r.name);
  const { data: existing } = await supabase
    .from("products")
    .select("name")
    .in("name", names);
  const existingNames = (existing ?? []).map((p) => p.name);

  return {
    ok: true,
    rows: parsed.rows,
    warnings: parsed.warnings,
    existingNames,
  };
}

/**
 * Server Action: actually import the rows.
 *
 * mode === "skip": uses bulk_import_products RPC which skips by name.
 * mode === "overwrite": for existing products, updates name/category/unit/
 * location/min_quantity (NOT quantity — preserves transaction integrity).
 * For new products, inserts.
 */
export async function commitImport(formData: FormData): Promise<ImportResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { ok: false, error: "관리자만 CSV 가져오기를 사용할 수 있습니다." };
  }

  const csvText = formData.get("csv");
  const mode = formData.get("mode");
  if (typeof csvText !== "string" || csvText.length === 0) {
    return { ok: false, error: "CSV 데이터가 없습니다." };
  }
  if (mode !== "skip" && mode !== "overwrite") {
    return { ok: false, error: "처리 방식을 선택해주세요." };
  }

  const parsed = parseProductsCsv(csvText);
  if (!parsed.ok) return parsed;

  const rows = parsed.rows;

  // Always check existing names so we can report counts accurately,
  // regardless of mode.
  const names = rows.map((r) => r.name);
  const { data: existing } = await supabase
    .from("products")
    .select("name")
    .in("name", names);
  const existingSet = new Set((existing ?? []).map((p) => p.name));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  if (mode === "skip") {
    // Use the RPC — it handles skip-on-duplicate atomically.
    const newRows = rows.filter((r) => !existingSet.has(r.name));
    skipped = rows.length - newRows.length;

    if (newRows.length > 0) {
      const { data, error } = await supabase.rpc("bulk_import_products", {
        p_products: newRows.map((r) => ({
          name: r.name,
          category: r.category,
          unit: r.unit,
          quantity: r.quantity,
          min_quantity: r.min_quantity,
          location: r.location,
        })),
        p_user_id: user.id,
      });
      if (error) return { ok: false, error: `등록 실패: ${error.message}` };
      const result = data as { inserted?: number; skipped?: number } | null;
      inserted = Number(result?.inserted ?? 0);
      // The RPC's own internal skip count covers names already in DB; we
      // already pre-filtered, so this should be 0 in practice.
      skipped += Number(result?.skipped ?? 0);
    }
  } else {
    // Overwrite mode: split into update vs insert.
    const toUpdate = rows.filter((r) => existingSet.has(r.name));
    const toInsert = rows.filter((r) => !existingSet.has(r.name));

    // Updates: name/category/unit/location/min_quantity only.
    // quantity is intentionally NOT updated to preserve transaction history.
    for (const r of toUpdate) {
      const { error } = await supabase
        .from("products")
        .update({
          category: r.category,
          unit: r.unit,
          location: r.location,
          min_quantity: r.min_quantity,
        })
        .eq("name", r.name);
      if (error) return { ok: false, error: `'${r.name}' 업데이트 실패: ${error.message}` };
      updated++;
    }

    if (toInsert.length > 0) {
      const { data, error } = await supabase.rpc("bulk_import_products", {
        p_products: toInsert.map((r) => ({
          name: r.name,
          category: r.category,
          unit: r.unit,
          quantity: r.quantity,
          min_quantity: r.min_quantity,
          location: r.location,
        })),
        p_user_id: user.id,
      });
      if (error) return { ok: false, error: `등록 실패: ${error.message}` };
      const result = data as { inserted?: number; skipped?: number } | null;
      inserted = Number(result?.inserted ?? 0);
      skipped = Number(result?.skipped ?? 0);
    }
  }

  revalidatePath("/inventory");
  revalidatePath("/overview");
  return { ok: true, inserted, updated, skipped, warnings: parsed.warnings };
}

/**
 * Wrapper used as the form `action` for the commit step. Returns a
 * redirect on success so the user lands back on /inventory with a fresh
 * list. The result UI is rendered via search params.
 */
export async function commitImportAndRedirect(formData: FormData) {
  const result = await commitImport(formData);
  if (!result.ok) {
    const params = new URLSearchParams({ error: result.error });
    redirect(`/inventory/import?${params.toString()}`);
  }
  const params = new URLSearchParams({
    inserted: String(result.inserted),
    updated: String(result.updated),
    skipped: String(result.skipped),
  });
  redirect(`/inventory?import=${params.toString()}`);
}
