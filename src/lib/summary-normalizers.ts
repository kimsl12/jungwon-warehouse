/**
 * Pure helpers that turn the sparse rows from `daily_transaction_summary`
 * and `monthly_transaction_summary` views into dense, ordered, zero-filled
 * arrays for the dashboard charts.
 *
 * Pulled out of the page files so they can be unit-tested without spinning
 * up Next.js / React.
 */

export type DailyChartPoint = {
  /** ISO date (YYYY-MM-DD) */
  day: string;
  /** Display label (e.g. "4/3") */
  label: string;
  in: number;
  out: number;
};

export type MonthlyChartPoint = {
  /** ISO month (YYYY-MM) */
  month: string;
  /** Display label (e.g. "2026-04") */
  label: string;
  in: number;
  out: number;
};

type DailyRow = {
  day: string | null;
  type: string | null;
  total_quantity: number | null;
};

type MonthlyRow = {
  month: string | null;
  type: string | null;
  total_quantity: number | null;
};

/**
 * Build a 7-day window ending on `referenceDate` (defaults to today) and
 * zero-fill any (day, type) gaps.
 */
export function normalizeDailySummary(
  rows: DailyRow[],
  referenceDate: Date = new Date(),
): DailyChartPoint[] {
  const map = new Map<string, { in: number; out: number }>();

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = formatYmd(d);
    map.set(key, { in: 0, out: 0 });
  }

  for (const row of rows) {
    if (!row.day || !row.type) continue;
    const key = row.day.slice(0, 10);
    const entry = map.get(key);
    if (!entry) continue;
    if (row.type === "in") entry.in = Number(row.total_quantity ?? 0);
    if (row.type === "out") entry.out = Number(row.total_quantity ?? 0);
  }

  return Array.from(map.entries()).map(([day, v]) => {
    const [, m, d] = day.split("-").map(Number);
    return {
      day,
      label: `${m}/${d}`,
      in: v.in,
      out: v.out,
    };
  });
}

/**
 * Zero-fill the last 12 months ending on `referenceDate` (defaults to today).
 */
export function normalizeMonthlySummary(
  rows: MonthlyRow[],
  referenceDate: Date = new Date(),
): MonthlyChartPoint[] {
  const map = new Map<string, { in: number; out: number }>();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { in: 0, out: 0 });
  }

  for (const row of rows) {
    if (!row.month || !row.type) continue;
    const d = new Date(row.month);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = map.get(key);
    if (!entry) continue;
    if (row.type === "in") entry.in = Number(row.total_quantity ?? 0);
    if (row.type === "out") entry.out = Number(row.total_quantity ?? 0);
  }

  return Array.from(map.entries()).map(([key, v]) => ({
    month: key,
    label: key,
    in: v.in,
    out: v.out,
  }));
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
