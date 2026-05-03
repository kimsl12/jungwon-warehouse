import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import { RecordActivityPanel } from "@/components/activity-log/record-activity-panel";
import { RequestActions } from "@/components/requests/request-actions";
import { RequestFulfillForm } from "@/components/requests/request-fulfill-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const STATUS_META: Record<string, { label: string; tone: string }> = {
  submitted: { label: "대기", tone: "bg-warning-bg text-warning" },
  approved: { label: "승인", tone: "bg-info-bg text-info" },
  fulfilled: { label: "출고완료", tone: "bg-success-bg text-success" },
  rejected: { label: "거절", tone: "bg-danger-bg text-danger" },
  canceled: { label: "취소", tone: "bg-muted text-muted-foreground" },
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminRequestDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/inventory");

  const { data: request } = await supabase
    .from("material_requests")
    .select(
      "id, status, site_id, note, is_urgent, urgent_reason, created_at, approved_at, fulfilled_at, rejected_at, reject_reason, canceled_at, created_by, sites(name, address)",
    )
    .eq("id", id)
    .single();

  if (!request) notFound();

  const { data: items } = await supabase
    .from("material_request_items")
    .select(
      "id, product_id, product_name, product_variant, unit, requested_quantity, fulfilled_quantity, note, sort_order",
    )
    .eq("request_id", id)
    .order("sort_order", { ascending: true });

  // requester 이름
  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("name, title, phone")
    .eq("id", request.created_by)
    .single();

  const meta = STATUS_META[request.status] ?? STATUS_META.submitted;

  const canApprove = request.status === "submitted";
  const canReject = request.status === "submitted" || request.status === "approved";
  const canCancel = request.status === "submitted" || request.status === "approved";
  const canDelete = request.status === "canceled" || request.status === "rejected";
  const canFulfill = request.status === "approved";
  const canShowPdf = request.status === "approved" || request.status === "fulfilled";

  return (
    <div className="space-y-6">
      <Link
        href="/requests"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 신청 목록
      </Link>

      {/* Header */}
      <div
        className={`rounded p-6 space-y-3 ${request.is_urgent && request.status === "submitted" ? "bg-danger-bg border border-destructive/30" : "bg-card"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                자재 신청
              </p>
              {request.is_urgent && (
                <span className="inline-block rounded bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  긴급
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight mt-1">
              {request.sites?.name ?? "—"}
            </h2>
            {request.sites?.address && (
              <p className="text-xs text-muted-foreground">{request.sites.address}</p>
            )}
            {request.is_urgent && request.urgent_reason && (
              <p className="mt-2 text-sm font-medium text-danger">
                ⚠ 긴급 사유: {request.urgent_reason}
              </p>
            )}
          </div>
          <span
            className={`inline-block rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wider shrink-0 ${meta.tone}`}
          >
            {meta.label}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm pt-3 border-t">
          <InfoRow
            label="신청자"
            value={
              requesterProfile?.name
                ? `${requesterProfile.name}${requesterProfile.title ? ` ${requesterProfile.title}` : ""}`
                : "—"
            }
          />
          <InfoRow label="연락처" value={requesterProfile?.phone ?? null} />
          <InfoRow label="신청 일시" value={dateFormatter.format(new Date(request.created_at))} />
          {request.approved_at && (
            <InfoRow
              label="승인 일시"
              value={dateFormatter.format(new Date(request.approved_at))}
            />
          )}
          {request.fulfilled_at && (
            <InfoRow
              label="출고완료"
              value={dateFormatter.format(new Date(request.fulfilled_at))}
            />
          )}
          {request.rejected_at && (
            <InfoRow
              label="거절 일시"
              value={dateFormatter.format(new Date(request.rejected_at))}
            />
          )}
          {request.note && <InfoRow label="비고" value={request.note} span2 />}
          {request.reject_reason && (
            <InfoRow label="거절 사유" value={request.reject_reason} span2 tone="destructive" />
          )}
        </dl>
      </div>

      {/* Actions */}
      {(canApprove || canReject || canCancel || canDelete) && (
        <RequestActions
          requestId={request.id}
          canApprove={canApprove}
          canReject={canReject}
          canCancel={canCancel}
          canDelete={canDelete}
        />
      )}

      {/* PDF link */}
      {canShowPdf && (
        <a
          href={`/api/pdf/request/${request.id}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 rounded border bg-card px-4 py-2 text-sm font-medium hover:bg-surface-low"
        >
          <FileText className="h-4 w-4" /> 출고장 PDF 열기
        </a>
      )}

      {/* Items + fulfill form */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold">자재 목록</h3>
        {canFulfill ? (
          <RequestFulfillForm
            requestId={request.id}
            items={(items ?? []).map((it) => ({
              id: it.id,
              product_name: it.product_name,
              product_variant: it.product_variant,
              unit: it.unit,
              requested_quantity: it.requested_quantity,
              fulfilled_quantity: it.fulfilled_quantity,
              note: it.note,
            }))}
          />
        ) : (
          <div className="rounded bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_140px_100px] gap-3 px-5 py-3 bg-surface-high text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span>품목</span>
              <span>단위</span>
              <span className="text-right">요청 / 출고</span>
              <span className="text-right">상태</span>
            </div>
            {(items ?? []).map((it) => {
              const done = it.fulfilled_quantity >= it.requested_quantity;
              const partial = it.fulfilled_quantity > 0 && !done;
              return (
                <div
                  key={it.id}
                  className="grid grid-cols-[1fr_100px_140px_100px] gap-3 items-center px-5 py-3 border-t"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {it.product_name}
                      {it.product_variant && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · {it.product_variant}
                        </span>
                      )}
                    </p>
                    {it.note && (
                      <p className="text-xs text-muted-foreground truncate">{it.note}</p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{it.unit ?? "—"}</span>
                  <span className="text-right text-sm tabular-nums">
                    {it.requested_quantity.toLocaleString("ko-KR")} /{" "}
                    {it.fulfilled_quantity.toLocaleString("ko-KR")}
                  </span>
                  <span className="text-right">
                    {done ? (
                      <span className="inline-block rounded bg-success-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                        완료
                      </span>
                    ) : partial ? (
                      <span className="inline-block rounded bg-warning-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                        부분
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RecordActivityPanel
        tableName="material_requests"
        recordId={request.id}
        title="이 자재 신청의 활동 내역"
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
  span2 = false,
  tone,
}: {
  label: string;
  value: string | null;
  span2?: boolean;
  tone?: "destructive";
}) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <dt className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          "mt-0.5 text-sm " + (tone === "destructive" ? "text-destructive" : "")
        }
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}
