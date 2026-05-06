import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Supa = SupabaseClient<Database>;

/**
 * 키워드를 토큰으로 분리한 뒤, products + product_aliases 양쪽에서
 * 모든 토큰이 매칭되는 product_id 의 교집합을 반환합니다.
 *
 * 매칭 컬럼:
 * - products: name, variant, category, subcategory
 * - product_aliases: alias
 *
 * 토큰 1글자는 매칭이 광범위해서 무시. 키워드가 비어있거나 의미 있는
 * 토큰이 없으면 null (= 필터 적용하지 않음을 의미) 반환.
 *
 * 사용 예:
 *   "22 부싱"  → ["22", "부싱"] → 둘 다 매칭하는 자재만
 *   "와이콘"   → product_aliases.alias = "와이콘" 등록되어 있으면 매칭
 *   "HFIX 4스" → ["hfix", "4스"] → 둘 다 매칭하는 자재
 */
export async function searchProductIdsByTokens(
  supabase: Supa,
  keyword: string,
): Promise<Set<string> | null> {
  const tokens = Array.from(
    new Set(
      keyword
        .toLowerCase()
        .split(/[\s,·\/]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2),
    ),
  );
  if (tokens.length === 0) return null;

  const sets = await Promise.all(
    tokens.map(async (token) => {
      const like = `%${token}%`;
      const ids = new Set<string>();
      const [direct, aliasHits] = await Promise.all([
        supabase
          .from("products")
          .select("id")
          .or(
            `name.ilike.${like},variant.ilike.${like},category.ilike.${like},subcategory.ilike.${like}`,
          ),
        supabase
          .from("product_aliases")
          .select("product_id")
          .ilike("alias", like),
      ]);
      for (const r of direct.data ?? []) ids.add(r.id);
      for (const r of aliasHits.data ?? []) ids.add(r.product_id);
      return ids;
    }),
  );

  // 교집합. 토큰이 1개면 그 set 그대로.
  return sets.reduce<Set<string>>((acc, set, i) => {
    if (i === 0) return set;
    return new Set([...acc].filter((id) => set.has(id)));
  }, new Set());
}
