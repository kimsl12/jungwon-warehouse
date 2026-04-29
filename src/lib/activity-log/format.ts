// activity_logs 의 details jsonb 를 사람이 읽을 한글 요약으로 변환하는 공용 헬퍼.
// /activity-log 전체 목록과 각 리소스 상세 페이지의 RecordActivityPanel 양쪽에서 사용.

export const ACTION_LABEL: Record<string, string> = {
  create: "생성",
  update: "수정",
  delete: "삭제",
  in: "입고",
  out: "출고",
};

export const TABLE_LABEL: Record<string, string> = {
  products: "재고",
  transactions: "입출고",
  sites: "현장",
  vendors: "거래처",
  purchase_orders: "발주서",
  material_requests: "자재신청",
  request_templates: "신청 템플릿",
  profiles: "사용자",
};

export function actionTone(action: string): string {
  switch (action) {
    case "create":
    case "in":
      return "bg-emerald-100 text-emerald-700";
    case "update":
    case "out":
      return "bg-secondary-container/30 text-secondary";
    case "delete":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-surface-high text-muted-foreground";
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 테이블별 디테일 포매터
// ──────────────────────────────────────────────────────────────────────────────

const PRODUCT_DIFF_FIELDS = [
  ["name", "이름"],
  ["category", "분류"],
  ["unit", "단위"],
  ["min_quantity", "최소수량"],
  ["location", "위치"],
  ["variant", "규격"],
] as const;

const SITE_DIFF_FIELDS = [
  ["name", "이름"],
  ["status", "상태"],
  ["note", "메모"],
] as const;

const VENDOR_DIFF_FIELDS = [
  ["name", "이름"],
  ["contact", "연락처"],
  ["fax", "팩스"],
  ["status", "상태"],
] as const;

const STATUS_LABEL: Record<string, string> = {
  // sites
  active: "활성",
  inactive: "비활성",
  // purchase_orders
  draft: "임시저장",
  ordered: "발주완료",
  received: "입고완료",
  partially_received: "부분입고",
  canceled: "취소",
  // material_requests
  submitted: "대기",
  approved: "승인",
  fulfilled: "출고완료",
  rejected: "거절",
};

function statusLabel(v: unknown): string {
  if (typeof v !== "string") return "—";
  return STATUS_LABEL[v] ?? v;
}

function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: ReadonlyArray<readonly [string, string]>,
): string {
  const changes: string[] = [];
  for (const [key, label] of fields) {
    const b = before[key];
    const a = after[key];
    if (b !== a && !(b == null && a == null)) {
      changes.push(`${label}: ${displayValue(b)} → ${displayValue(a)}`);
    }
  }
  return changes.join(" · ");
}

function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "∅";
  if (typeof v === "boolean") return v ? "Y" : "N";
  if (typeof v === "number") return v.toLocaleString("ko-KR");
  return String(v);
}

export function formatLogDetails(
  table: string,
  action: string,
  details: unknown,
): string {
  if (!details || typeof details !== "object") return "";
  const d = details as Record<string, unknown>;

  // ─── transactions ─────────────────────────────────────────
  if (table === "transactions") {
    const qty =
      typeof d.quantity === "number" ? d.quantity.toLocaleString("ko-KR") : "?";
    const note =
      typeof d.note === "string" && d.note.length > 0 ? ` — ${d.note}` : "";
    return `수량 ${qty}${note}`;
  }

  // ─── products ────────────────────────────────────────────
  if (table === "products") {
    if (action === "create" || action === "delete") {
      const name = typeof d.name === "string" ? d.name : "?";
      const qty =
        typeof d.quantity === "number"
          ? d.quantity.toLocaleString("ko-KR")
          : "?";
      return `${name} (수량 ${qty})`;
    }
    if (action === "update") {
      const before = (d.before ?? {}) as Record<string, unknown>;
      const after = (d.after ?? {}) as Record<string, unknown>;
      const summary = diffFields(before, after, PRODUCT_DIFF_FIELDS);
      return summary || "변경 사항 없음";
    }
  }

  // ─── sites ──────────────────────────────────────────────
  if (table === "sites") {
    if (action === "create") {
      const name = typeof d.name === "string" ? d.name : "?";
      return `현장 등록: ${name}`;
    }
    if (action === "delete") {
      const name = typeof d.name === "string" ? d.name : "?";
      return `현장 삭제: ${name}`;
    }
    if (action === "update") {
      const before = (d.before ?? {}) as Record<string, unknown>;
      const after = (d.after ?? {}) as Record<string, unknown>;
      // status는 한글 라벨로
      const fields = SITE_DIFF_FIELDS.map(
        ([k, l]) => [k, l] as readonly [string, string],
      );
      const changes: string[] = [];
      for (const [key, label] of fields) {
        if (before[key] !== after[key]) {
          if (key === "status") {
            changes.push(
              `${label}: ${statusLabel(before[key])} → ${statusLabel(after[key])}`,
            );
          } else {
            changes.push(
              `${label}: ${displayValue(before[key])} → ${displayValue(after[key])}`,
            );
          }
        }
      }
      return changes.join(" · ") || "변경 사항 없음";
    }
  }

  // ─── vendors ────────────────────────────────────────────
  if (table === "vendors") {
    if (action === "create") {
      const name = typeof d.name === "string" ? d.name : "?";
      return `거래처 등록: ${name}`;
    }
    if (action === "delete") {
      const name = typeof d.name === "string" ? d.name : "?";
      return `거래처 삭제: ${name}`;
    }
    if (action === "update") {
      const before = (d.before ?? {}) as Record<string, unknown>;
      const after = (d.after ?? {}) as Record<string, unknown>;
      return (
        diffFields(before, after, VENDOR_DIFF_FIELDS) || "변경 사항 없음"
      );
    }
  }

  // ─── purchase_orders ────────────────────────────────────
  if (table === "purchase_orders") {
    const po = typeof d.po_number === "string" ? d.po_number : null;
    if (action === "create") {
      return `발주서 ${po ?? ""} 생성 (${statusLabel(d.status)})`;
    }
    if (action === "delete") {
      return `발주서 ${po ?? ""} 삭제`;
    }
    if (action === "update") {
      const before = statusLabel(d.before_status);
      const after = statusLabel(d.after_status);
      return `${po ? po + " · " : ""}상태: ${before} → ${after}`;
    }
  }

  // ─── material_requests ──────────────────────────────────
  if (table === "material_requests") {
    if (action === "create") {
      const urgent = d.is_urgent ? "🔴 긴급 " : "";
      return `${urgent}자재 신청 (${statusLabel(d.status)})`;
    }
    if (action === "delete") {
      return `자재 신청 삭제`;
    }
    if (action === "update") {
      const before = statusLabel(d.before_status);
      const after = statusLabel(d.after_status);
      return `상태: ${before} → ${after}`;
    }
  }

  // ─── request_templates ──────────────────────────────────
  if (table === "request_templates") {
    const name = typeof d.name === "string" ? d.name : "?";
    const isPublic = d.is_public === true;
    const visibility = isPublic ? "공용" : "개인";
    if (action === "create") {
      const cnt =
        typeof d.item_count === "number" ? `, ${d.item_count}개 자재` : "";
      return `${visibility} 템플릿 추가: ${name}${cnt}`;
    }
    if (action === "delete") {
      const cnt =
        typeof d.item_count === "number" ? `, ${d.item_count}개 자재` : "";
      return `${visibility} 템플릿 삭제: ${name}${cnt}`;
    }
    if (action === "update") {
      const beforeName =
        typeof d.before_name === "string" ? d.before_name : null;
      const changes: string[] = [];
      if (beforeName && beforeName !== name) {
        changes.push(`이름: ${beforeName} → ${name}`);
      }
      if (d.before_is_public !== d.after_is_public) {
        changes.push(
          `공개: ${d.before_is_public ? "공용" : "개인"} → ${d.after_is_public ? "공용" : "개인"}`,
        );
      }
      return changes.length > 0 ? `${name} — ${changes.join(" · ")}` : name;
    }
  }

  // ─── profiles ───────────────────────────────────────────
  if (table === "profiles") {
    if (action === "update") {
      const field = typeof d.field === "string" ? d.field : "필드";
      const newVal = d.new_value;
      if (field === "role") {
        const roleLabel = newVal === "admin" ? "관리자" : "사용자";
        return `역할 변경: ${roleLabel}`;
      }
      return `${field}: ${displayValue(newVal)}`;
    }
  }

  // 폴백
  return JSON.stringify(d).slice(0, 80);
}
