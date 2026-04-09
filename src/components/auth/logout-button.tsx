"use client";

import { useTransition } from "react";

import { logout } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <form action={() => startTransition(() => logout())}>
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? "로그아웃 중..." : "로그아웃"}
      </Button>
    </form>
  );
}
