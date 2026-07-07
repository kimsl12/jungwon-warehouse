import { NextResponse } from "next/server";

import {
  attachmentDispositionHeader,
  formatYmdCompact,
  rowsToCsv,
} from "@/lib/csv/generate";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  submitted: "대기",
  approved: "승인",
  fulfilled: "출고완료",
  rejected: "거절",
  canceled: "취소",
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * GET /api/export/material-requests
 *
 * 자재 신청 내역 CSV (신청 품목 단위 1행). 관리 페이지가 admin 전용이므로 동일 기준.
 * Filename: 정원전기_자재신청내역_YYYYMMDD.csv
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return new NextResponse("Admin only", { status: 403 });
  }

  const { data: items, error } = await supabase
    .from("material_request_items")
    .select(
      `product_name, product_variant, unit, requested_quantity, fulfilled_quantity, note, sort_order,
       material_requests!inner(created_at, status, is_urgent, created_by,
         sites(name))`,
    );

  if (error) {
    return new NextResponse(
      `Failed to fetch material requests: ${error.message}`,
      {
        status: 500,
      },
    );
  }

  // item 테이블엔 created_at 이 없어 신청일시 최신순 + 라인 순서로 정렬
  const sorted = (items ?? []).sort(
    (a, b) =>
      (b.material_requests?.created_at ?? "").localeCompare(
        a.material_requests?.created_at ?? "",
      ) || a.sort_order - b.sort_order,
  );

  // 신청자 이름 매핑
  const userIds = Array.from(
    new Set(
      (items ?? [])
        .map((it) => it.material_requests?.created_by)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const profileNameMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    for (const p of profileRows ?? []) profileNameMap.set(p.id, p.name);
  }

  const headers = [
    "신청일시",
    "현장",
    "신청자",
    "상태",
    "긴급",
    "품목명",
    "변형",
    "단위",
    "요청수량",
    "출고수량",
    "비고",
  ];
  const rows = sorted.map((it) => {
    const req = it.material_requests;
    return [
      req?.created_at ? dateFormatter.format(new Date(req.created_at)) : "",
      req?.sites?.name ?? "",
      req?.created_by ? (profileNameMap.get(req.created_by) ?? "") : "",
      STATUS_LABEL[req?.status ?? ""] ?? req?.status ?? "",
      req?.is_urgent ? "긴급" : "",
      it.product_name,
      it.product_variant ?? "",
      it.unit ?? "",
      it.requested_quantity,
      it.fulfilled_quantity,
      it.note ?? "",
    ];
  });

  const csv = rowsToCsv(headers, rows);
  const filename = `정원전기_자재신청내역_${formatYmdCompact()}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": attachmentDispositionHeader(filename),
      "Cache-Control": "no-store",
    },
  });
}
