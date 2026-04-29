"use client";

import { useState, useTransition } from "react";

import {
  updateUserProfile,
  type ProfileUpdateState,
} from "@/app/(dashboard)/users/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  title: string | null;
  phone: string | null;
  assignedSiteIds: string[];
};

export function ProfileEditDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<ProfileUpdateState>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setState(null);
    startTransition(async () => {
      const result = await updateUserProfile(null, formData);
      if (result?.success) {
        onOpenChange(false);
        setState(null);
      } else {
        setState(result);
      }
    });
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setState(null);
  }

  const showAssignedHint = user.role === "user";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>사용자 정보 수정</DialogTitle>
          <DialogDescription>
            {user.email ?? "(이메일 없음)"} — 여기에 입력한 이름·직급·연락처는
            발주서 PDF 담당자 칸에 자동으로 사용됩니다.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="id" value={user.id} />
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">이름</Label>
              <Input
                id="profile-name"
                name="name"
                defaultValue={user.name ?? ""}
                disabled={isPending}
                maxLength={50}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="profile-title">직급</Label>
                <Input
                  id="profile-title"
                  name="title"
                  defaultValue={user.title ?? ""}
                  disabled={isPending}
                  placeholder="예: 차장, 부장"
                  maxLength={30}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-phone">연락처</Label>
                <Input
                  id="profile-phone"
                  name="phone"
                  defaultValue={user.phone ?? ""}
                  disabled={isPending}
                  placeholder="010-0000-0000"
                  maxLength={30}
                />
              </div>
            </div>
          </div>
          {state?.error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>

        {showAssignedHint && (
          <div className="mt-4 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
            이 사용자의 <b>담당 현장</b>은 <b>현장 관리</b> 페이지에서 배정하세요.
            {user.assignedSiteIds.length > 0 ? (
              <>
                {" "}
                현재 <b className="text-foreground">{user.assignedSiteIds.length}곳</b> 배정되어 있습니다.
              </>
            ) : (
              <> 현재 배정된 현장이 없습니다.</>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
