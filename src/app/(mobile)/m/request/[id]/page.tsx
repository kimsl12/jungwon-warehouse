import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Copy, FileText } from "lucide-react";

import { MobileRequestCancelButton } from "@/components/mobile/mobile-request-cancel-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const STATUS_META: Record<string, { label: string; tone: string; hint: string }> = {
  submitted: {
    label: "대기",
    tone: "bg-amber-100 text-amber-700",
    hint: "관리자 승인 대기 중입니다.",
  },
  approved: {
    label: "승인",
    tone: "bg-blue-100 text-blue-700",
    hint: "공장에서 출고 준비 중입니다. 아래 출고장으로 확인하세요.",
  },
  fulfilled: {
    label: "출고완료",
    tone: "bg-emerald-100 text-emerald-700",
    hint: "요청하신 자재가 모두 출고되었습니다.",
  },
  rejected: {
    label: "거절",
    tone: "bg-red-100 text-red-700",
    hint: "관리자가 거절했습니다.",
  },
  canceled: {
    label: "취소",
    tone: "bg-muted text-muted-foreground",
    hint: "취소된 신청입니다.",
  },
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function MobileRequestDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: request } = await supabase
    .from("material_requests")
    .select(
      "id, status, site_id, note, created_at, approved_at, fulfilled_at, rejected_at, reject_reason, canceled_at, created_by, sites(name, address)",
    )
    .eq("id", id)
    .single();

  if (!request) notFound();

  const { data: items } = await supabase
    .from("material_request_items")
    .select("id, product_name, product_variant, unit, requested_quantity, fulfilled_quantity, note, sort_order")
    .eq("request_id", id)
    .order("sort_order", { ascending: true });

  const meta = STATUS_META[request.status] ?? STATUS_META.submitted;
  const isOwner = request.created_by === user.id;
  const canCancel = isOwner && request.status === "submitted";
  const canShowPdf = request.status === "approved" || request.status === "fulfilled";

  return (
    <div className="space-y-5">
      <Link
        href="/m/request"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 신청 목록
      </Link>

      {/* Status card */}
      <div className="rounded-lg bg-card p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              현장
            </p>
            <p className="mt-0.5 text-lg font-bold truncate">{request.sites?.name ?? "—"}</p>
            {request.sites?.address && (
              <p className="text-xs text-muted-foreground truncate">{request.sites.address}</p>
            )}
          </div>
          <span
            className={`inline-block rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wider shrink-0 ${meta.tone}`}
          >
            {meta.label}
          </span>
        </div>
        <p className="pt-2 border-t text-xs text-muted-foreground">{meta.hint}</p>
        {request.status === "rejected" && request.reject_reason && (
          <p className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
            거절 사유: {request.reject_reason}
          </p>
        )}
      </div>

      {/* Timing */}
      <div className="rounded-md border bg-background p-3 text-xs space-y-1">
        <TimingRow label="신청" value={dateFormatter.format(new Date(request.created_at))} />
        {request.approved_at && (
          <TimingRow label="승인" value={dateFormatter.format(new Date(request.approved_at))} />
        )}
        {request.fulfilled_at && (
          <TimingRow label="출고완료" value={dateFormatter.format(new Date(request.fulfilled_at))} />
        )}
        {request.rejected_at && (
          <TimingRow label="거절" value={dateFormatter.format(new Date(request.rejected_at))} />
        )}
        {request.canceled_at && (
          <TimingRow label="취소" value={dateFormatter.format(new Date(request.canceled_at))} />
        )}
      </div>

      {/* PDF */}
      {canShowPdf && (
        <a
          href={`/api/pdf/request/${request.id}`}
          target="_blank"
          rel="noopener"
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-md border bg-card text-sm font-medium active:bg-muted"
        >
          <FileText className="h-4 w-4" /> 출고장 PDF 열기
        </a>
      )}

      {/* 이 신청 복제 — 본인 신청에 한해 노출 */}
      {isOwner && (
        <Link
          href={`/m/request/new?from=${request.id}`}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-md border bg-surface-low text-sm font-medium active:bg-surface-high"
        >
          <Copy className="h-4 w-4" /> 이 내용으로 다시 신청
        </Link>
      )}

      {/* Items */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          자재 목록 ({items?.length ?? 0})
        </h2>
        <div className="space-y-2">
          {(items ?? []).map((it) => {
            const isComplete = it.fulfilled_quantity >= it.requested_quantity;
            const isPartial = it.fulfilled_quantity > 0 && !isComplete;
            return (
              <div key={it.id} className="rounded-md border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {it.product_name}
                      {it.product_variant && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · {it.product_variant}
                        </span>
                      )}
                    </p>
                    {it.note && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">{it.note}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-semibold tabular-nums">
                      {it.requested_quantity.toLocaleString("ko-KR")}
                      {it.unit && (
                        <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                          {it.unit}
                        </span>
                      )}
                    </p>
                    {(isPartial || isComplete) && (
                      <p
                        className={
                          isComplete
                            ? "text-[11px] font-medium text-emerald-600"
                            : "text-[11px] font-medium text-blue-600"
                        }
                      >
                        {isComplete ? "출고완료" : `${it.fulfilled_quantity.toLocaleString("ko-KR")}${it.unit ?? ""} 출고됨`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note */}
      {request.note && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            신청 비고
          </h2>
          <p className="rounded-md border bg-background p-3 text-sm whitespace-pre-wrap">
            {request.note}
          </p>
        </div>
      )}

      {canCancel && <MobileRequestCancelButton requestId={request.id} />}
    </div>
  );
}

function TimingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
