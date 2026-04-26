// ============================================================
// Berlin-Timezone-Helpers (extrahiert in Phase 2e aus Phase
// 2c.3 Action-Board-Route)
//
// DST-aware Tag-Berechnung fuer Europe/Berlin via
// Intl.DateTimeFormat mit longOffset. CET/CEST wird automatisch
// aufgeloest, kein manuelles UTC-Offset-Tracking.
//
// Pattern-Reuse: Phase 2c.3 (action-board) und Phase 2e
// (yesterday). Bei Yesterday wird `daysOffset = -1` genutzt,
// bei Today (Action-Board) bleibt es bei 0.
// ============================================================

/**
 * Liefert das Tag-Fenster (00:00:00 bis 23:59:59) in Berlin-Zeit
 * fuer den Bezugstag, der durch `daysOffset` relativ zu `now`
 * verschoben ist. Default: Heute (offset 0). Yesterday: -1.
 */
export function getBerlinDayWindow(
  now: Date,
  daysOffset: number = 0,
): { start: Date; end: Date } {
  const reference = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZoneName: "longOffset",
  }).formatToParts(reference);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const offset = get("timeZoneName").replace("GMT", "") || "+00:00";
  const start = new Date(`${dateStr}T00:00:00${offset}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * Liefert das ISO-Datum (YYYY-MM-DD) des Bezugstags in Berlin-Zeit.
 * Wird fuer Yesterday-API-Response genutzt, damit der Frontend-
 * Counterpart einen lesbaren Datums-String bekommt.
 */
export function getBerlinDateIso(
  now: Date,
  daysOffset: number = 0,
): string {
  const reference = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
