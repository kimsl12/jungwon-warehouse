import { redirect } from "next/navigation";

/**
 * /m → /m/scan. Convenience entry point for the mobile mode.
 */
export default function MobileIndexPage() {
  redirect("/m/scan");
}
