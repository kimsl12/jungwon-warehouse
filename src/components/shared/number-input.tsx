"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";

/**
 * Numeric field for quantities and prices.
 *
 * `type="number"` alone leaves two rough edges: iOS Safari does not reliably
 * show the numeric keypad without `inputMode`, and a focused number input
 * silently changes value when the wheel scrolls over it — easy to do while
 * scrolling a long purchase order, and the wrong quantity then saves without
 * anyone noticing. Blurring on wheel keeps the scroll but drops the capture.
 */
export function NumberInput({
  decimal = false,
  onWheel,
  ...props
}: ComponentProps<typeof Input> & { decimal?: boolean }) {
  return (
    <Input
      type="number"
      inputMode={decimal ? "decimal" : "numeric"}
      onWheel={(event) => {
        event.currentTarget.blur();
        onWheel?.(event);
      }}
      {...props}
    />
  );
}
