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
 * 토큰 분리 단계:
 * 1) 공백·콤마·가운뎃점·슬래시로 1차 분리
 * 2) 각 부분을 한글/영문/숫자 경계에서 추가 분리
 *    예) "36부싱" → ["36", "부싱"], "HFIX4" → ["hfix", "4"]
 *
 * 한글·영문 1글자는 매칭이 광범위해 제외. 숫자 1글자는 보존
 * (예: "HFIX4" 의 "4" 는 자재 구분에 의미가 큼).
 *
 * 키워드가 비어있거나 의미 있는 토큰이 없으면 null 반환 (= 필터 안 함).
 *
 * 사용 예:
 *   "22 부싱" / "22부싱" / "부싱22" → ["22", "부싱"] → 둘 다 매칭
 *   "36부싱"  → ["36", "부싱"] → "부싱 36mm" 매칭
 *   "와이콘"   → product_aliases.alias = "와이콘" 등록 시 매칭
 *   "HFIX 4스" → ["hfix", "4", "스"] 중 "스" 1글자 한글이라 제외 → ["hfix", "4"]
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
        .flatMap((part) => part.match(/[가-힣]+|[a-z]+|[0-9]+/g) ?? [])
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 || /^\d$/.test(t)),
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
