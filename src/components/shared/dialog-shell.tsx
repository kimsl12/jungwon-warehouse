"use client";

import type { ComponentProps, CSSProperties } from "react";

import {
  AlertDialogContent,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { DialogContent } from "@/components/ui/dialog";
import { SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Dialog wrappers that fix two things the base primitives get wrong.
 *
 * 1. Width. The primitives carry `data-[size=default]:sm:max-w-sm` /
 *    `data-[side=right]:sm:max-w-sm`, whose attribute selectors outrank a
 *    plain `sm:max-w-md` from the caller, and `twMerge` cannot dedupe across
 *    different modifiers. Every width override we passed was silently losing
 *    and every dialog rendered at 384px. Width therefore goes through inline
 *    `style`, which no class rule can outrank. The `min()` expression keeps a
 *    1rem gutter on narrow screens without needing a media query.
 *
 * 2. Scrolling. `DialogContent` scrolls as a whole and `AlertDialogContent`
 *    has no height cap at all, so tall dialogs pushed the title and the
 *    submit buttons off-screen. These wrappers cap the height and lay the
 *    dialog out as a column, leaving only `DialogBody` scrollable.
 */

const WIDTH_PX = {
  sm: 384,
  md: 448,
  lg: 512,
  xl: 576,
  "2xl": 672,
  "4xl": 896,
} as const;

export type DialogWidth = keyof typeof WIDTH_PX;

function widthStyle(width: DialogWidth, style?: CSSProperties): CSSProperties {
  return { maxWidth: `min(calc(100% - 2rem), ${WIDTH_PX[width]}px)`, ...style };
}

/**
 * `overflow-y-auto` rather than `overflow-hidden` so the shell degrades
 * safely: with a `DialogBody` the body absorbs the overflow and the header
 * and footer stay pinned; without one the shell itself scrolls, which is the
 * old behaviour rather than clipped-and-unreachable content.
 */
const shellClass = "flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto";

/** Applied to any element between the shell and the body/footer (usually a form). */
export const dialogFormShell = "flex min-h-0 flex-1 flex-col overflow-hidden";

export function ScrollDialogContent({
  className,
  style,
  width = "sm",
  ...props
}: ComponentProps<typeof DialogContent> & { width?: DialogWidth }) {
  return (
    <DialogContent
      className={cn(shellClass, className)}
      style={widthStyle(width, style)}
      {...props}
    />
  );
}

export function ScrollAlertDialogContent({
  className,
  style,
  width = "sm",
  ...props
}: ComponentProps<typeof AlertDialogContent> & { width?: DialogWidth }) {
  return (
    <AlertDialogContent
      className={cn(shellClass, className)}
      style={widthStyle(width, style)}
      {...props}
    />
  );
}

export function WideSheetContent({
  className,
  style,
  width = "lg",
  ...props
}: ComponentProps<typeof SheetContent> & { width?: DialogWidth }) {
  return (
    <SheetContent
      className={cn("w-full", className)}
      style={{ width: "100%", maxWidth: `${WIDTH_PX[width]}px`, ...style }}
      {...props}
    />
  );
}

/**
 * The scrolling region. Bleeds to the dialog edges so the scrollbar hugs the
 * border instead of floating inside the padding.
 */
export function DialogBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "-mx-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-0.5",
        className,
      )}
      {...props}
    />
  );
}

/** AlertDialog footer that stays put when the body scrolls. */
export function AlertDialogStickyFooter({
  className,
  ...props
}: ComponentProps<typeof AlertDialogFooter>) {
  return <AlertDialogFooter className={cn("shrink-0", className)} {...props} />;
}
