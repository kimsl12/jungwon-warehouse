"use client";

import { useState } from "react";

export type AssigneeCandidate = {
  id: string;
  name: string | null;
  email: string | null;
  title: string | null;
  /**
   * 이 담당자가 현재 배정되어 있는 모든 현장 이름 (정렬됨).
   * "이미 N곳 담당 중" 배지와 현장명 목록을 보여주는 데 사용.
   */
  assignedSiteNames: string[];
};

/**
 * 현장 등록/수정 다이얼로그 내부에서 담당자(role='user' 프로필)를 다중 선택해
 * 이 현장에 배정하는 picker. 선택된 id들을 hidden input `assignee_ids` 에
 * JSON array로 담아 form 제출.
 *
 * 한 담당자는 여러 현장에 동시에 배정 가능. picker 는 각 담당자가 지금 몇 곳
 * 담당 중인지(현재 편집 중인 현장 제외)를 명시적으로 보여줘서, 중복 배정을
 * 안심하고 할 수 있게 한다.
 */
export function SiteAssigneesPicker({
  candidates,
  initialSelectedIds = [],
  currentSiteName,
  disabled,
}: {
  candidates: AssigneeCandidate[];
  initialSelectedIds?: string[];
  /** 편집 중인 현장명. 해당 현장은 "다른 N곳 담당" 계산에서 제외. */
  currentSiteName?: string;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedIds));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const value = JSON.stringify([...selected]);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium">
          담당자 배정{" "}
          <span className="text-muted-foreground font-normal">
            ({selected.size}명 선택)
          </span>
        </label>
        <p className="text-[10px] text-muted-foreground">
          한 담당자가 여러 현장에 동시 배정 가능
        </p>
      </div>

      <input type="hidden" name="assignee_ids" value={value} />

      {candidates.length === 0 ? (
        <p className="rounded border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          배정 가능한 현장 담당자(role=user)가 없습니다. 사용자 관리에서 먼저 현장 담당자로 등록하세요.
        </p>
      ) : (
        <div className="max-h-56 overflow-auto rounded border divide-y">
          {candidates.map((u) => {
            const checked = selected.has(u.id);
            const displayName = u.name ?? u.email ?? "—";

            // 현재 편집 중인 현장은 "다른 곳"에서 제외
            const otherSites = currentSiteName
              ? u.assignedSiteNames.filter((n) => n !== currentSiteName)
              : u.assignedSiteNames;
            const otherCount = otherSites.length;

            return (
              <label
                key={u.id}
                className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-surface-low"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(u.id)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4 rounded border-muted-foreground/30"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {displayName}
                      {u.title && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          {u.title}
                        </span>
                      )}
                    </p>
                    {otherCount > 0 && (
                      <span className="inline-block shrink-0 rounded bg-secondary/15 px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
                        다른 {otherCount}곳 담당
                      </span>
                    )}
                  </div>
                  {u.email && u.name && (
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                  )}
                  {otherCount > 0 && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                      배정 현장: {otherSites.join(" · ")}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
