/**
 * CSV generation helpers used by /api/export/* routes.
 *
 * - Quotes any field that contains a comma, quote, newline, or starts with a
 *   leading whitespace (Excel quirk).
 * - Prepends UTF-8 BOM so Excel for Windows opens Korean correctly.
 */

const BOM = "\uFEFF";

export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str === "") return "";

  const needsQuoting =
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r") ||
    str.startsWith(" ") ||
    str.endsWith(" ");

  if (!needsQuoting) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

export function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));
  return BOM + [headerLine, ...dataLines].join("\r\n") + "\r\n";
}

/**
 * Build a Content-Disposition: attachment header for a Korean filename.
 * Uses RFC 5987 `filename*` so non-ASCII filenames work in Chrome / Edge /
 * Firefox. Generic — used by CSV exports and PDF responses alike.
 */
export function attachmentDispositionHeader(filename: string): string {
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`;
}

/**
 * Format a Date as YYYYMMDD in local time. Used in export filenames.
 */
export function formatYmdCompact(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
