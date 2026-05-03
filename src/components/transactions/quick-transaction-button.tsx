"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

import { QuickTransactionDialog } from "@/components/transactions/quick-transaction-dialog";

type SiteOption = { id: string; name: string };

export function QuickTransactionButton({
  type,
  sites,
}: {
  type: "in" | "out";
  sites: SiteOption[];
}) {
  const [open, setOpen] = useState(false);

  const Icon = type === "in" ? ArrowDownToLine : ArrowUpFromLine;
  const label = type === "in" ? "새 입고" : "새 출고";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
      <QuickTransactionDialog
        type={type}
        open={open}
        onOpenChange={setOpen}
        sites={sites}
      />
    </>
  );
}
