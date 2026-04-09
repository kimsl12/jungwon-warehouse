/**
 * Pure unit tests for the chart-data normalizers used by /overview and
 * /reports. They take sparse rows from the Supabase summary views and
 * fill in zeros for missing days/months/types.
 *
 * Reference date is fixed so the tests are deterministic.
 */
import { describe, it, expect } from "vitest";

import {
  normalizeDailySummary,
  normalizeMonthlySummary,
} from "@/lib/summary-normalizers";

const REF = new Date("2026-04-09T12:00:00Z");

describe("normalizeDailySummary", () => {
  it("returns 7 ordered days even when input is empty", () => {
    const result = normalizeDailySummary([], REF);
    expect(result).toHaveLength(7);
    // First entry is 6 days ago, last is today
    expect(result[6].day).toBe("2026-04-09");
    expect(result[0].day).toBe("2026-04-03");
    // All zeros
    for (const point of result) {
      expect(point.in).toBe(0);
      expect(point.out).toBe(0);
    }
  });

  it("merges in and out rows by day", () => {
    const result = normalizeDailySummary(
      [
        { day: "2026-04-09", type: "in", total_quantity: 50 },
        { day: "2026-04-09", type: "out", total_quantity: 20 },
        { day: "2026-04-08", type: "in", total_quantity: 10 },
      ],
      REF,
    );

    const today = result.find((r) => r.day === "2026-04-09");
    const yesterday = result.find((r) => r.day === "2026-04-08");

    expect(today).toEqual({ day: "2026-04-09", label: "4/9", in: 50, out: 20 });
    expect(yesterday).toEqual({ day: "2026-04-08", label: "4/8", in: 10, out: 0 });
  });

  it("ignores rows outside the 7-day window", () => {
    const result = normalizeDailySummary(
      [
        { day: "2026-03-01", type: "out", total_quantity: 999 }, // outside window
        { day: "2026-04-09", type: "in", total_quantity: 5 },
      ],
      REF,
    );

    expect(result).toHaveLength(7);
    const totalOut = result.reduce((s, r) => s + r.out, 0);
    expect(totalOut).toBe(0); // 999 was discarded
  });

  it("handles null fields gracefully", () => {
    const result = normalizeDailySummary(
      [
        { day: null, type: "in", total_quantity: 10 },
        { day: "2026-04-09", type: null, total_quantity: 10 },
        { day: "2026-04-09", type: "in", total_quantity: null },
      ],
      REF,
    );

    expect(result).toHaveLength(7);
    const today = result.find((r) => r.day === "2026-04-09");
    expect(today).toEqual({ day: "2026-04-09", label: "4/9", in: 0, out: 0 });
  });

  it("accepts ISO timestamps with time portion in the day field", () => {
    const result = normalizeDailySummary(
      [{ day: "2026-04-09T00:00:00+00:00", type: "in", total_quantity: 7 }],
      REF,
    );
    const today = result.find((r) => r.day === "2026-04-09");
    expect(today?.in).toBe(7);
  });
});

describe("normalizeMonthlySummary", () => {
  it("returns 12 ordered months even when input is empty", () => {
    const result = normalizeMonthlySummary([], REF);
    expect(result).toHaveLength(12);
    expect(result[11].month).toBe("2026-04");
    expect(result[0].month).toBe("2025-05");
    for (const point of result) {
      expect(point.in).toBe(0);
      expect(point.out).toBe(0);
    }
  });

  it("merges in and out rows by month", () => {
    const result = normalizeMonthlySummary(
      [
        { month: "2026-04-01T00:00:00+00:00", type: "in", total_quantity: 100 },
        { month: "2026-04-01T00:00:00+00:00", type: "out", total_quantity: 60 },
        { month: "2026-03-01T00:00:00+00:00", type: "in", total_quantity: 200 },
      ],
      REF,
    );

    const apr = result.find((r) => r.month === "2026-04");
    const mar = result.find((r) => r.month === "2026-03");

    expect(apr).toEqual({ month: "2026-04", label: "2026-04", in: 100, out: 60 });
    expect(mar).toEqual({ month: "2026-03", label: "2026-03", in: 200, out: 0 });
  });

  it("ignores rows outside the 12-month window", () => {
    const result = normalizeMonthlySummary(
      [
        { month: "2024-01-01T00:00:00+00:00", type: "out", total_quantity: 999 },
        { month: "2026-04-01T00:00:00+00:00", type: "in", total_quantity: 5 },
      ],
      REF,
    );
    const totalOut = result.reduce((s, r) => s + r.out, 0);
    expect(totalOut).toBe(0);
  });

  it("handles null fields gracefully", () => {
    const result = normalizeMonthlySummary(
      [
        { month: null, type: "in", total_quantity: 10 },
        { month: "2026-04-01T00:00:00+00:00", type: null, total_quantity: 10 },
      ],
      REF,
    );
    expect(result).toHaveLength(12);
    const apr = result.find((r) => r.month === "2026-04");
    expect(apr?.in).toBe(0);
  });
});
