// P5 seed module (patch 0.63) — pure, typed formatters.
// Mirror of the legacy helpers in index.html (formatDurationParts / fmtDuration / fmtNum).
// First extraction target: pure + dependency-free = safe to move and type first.
// NOTE: not yet wired into index.html — that's a later migration step (see P5_MIGRATION.md).

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Break a millisecond span into day/hour/minute/second parts (negative clamped to 0). */
export function formatDurationParts(ms: number): DurationParts {
  if (typeof ms !== 'number' || Number.isNaN(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

/** "35d 9h 24m 12s" — days/hours unpadded, minutes/seconds 2-digit. */
export function fmtDuration(ms: number): string {
  const p = formatDurationParts(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  if (p.days > 0) return `${p.days}d ${p.hours}h ${pad(p.minutes)}m ${pad(p.seconds)}s`;
  if (p.hours > 0) return `${p.hours}h ${pad(p.minutes)}m ${pad(p.seconds)}s`;
  return `${p.minutes}m ${pad(p.seconds)}s`;
}

/** Round to 2 decimals and group thousands (matches the legacy fmtNum). */
export function fmtNum(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
}

/** Parse an ISO string (or falsy) to a Date, or null if missing/invalid. (legacy parseIso) */
export function parseIso(s: string | number | Date | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d; // isNaN(Date) coerces via getTime() — byte-identical
}

/** Escape the 5 HTML-sensitive chars for safe string concatenation. (legacy kwHelpEsc) */
export function kwHelpEsc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Thai relative-time label from an ISO/date (เมื่อครู่นี้ / N นาทีก่อน / N ชม.ก่อน / N วันก่อน). (legacy notifFmtAgo) */
export function notifFmtAgo(iso: string | number | Date): string {
  const d = new Date(iso); if (isNaN(d.getTime())) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'เมื่อครู่นี้';
  if (mins < 60) return mins + ' นาทีก่อน';
  const h = Math.floor(mins / 60);
  if (h < 24) return h + ' ชม.ก่อน';
  return Math.floor(h / 24) + ' วันก่อน';
}

/** Round to ≤2 decimals as a plain string. (legacy acNum — Augment Calc) */
export function acNum(v: number): string { return String(Math.round(v * 100) / 100); }
/** Round to ≤2 decimals as a signed percent, e.g. "+22%". (legacy acPct — Augment Calc) */
export function acPct(v: number): string { const r = Math.round(v * 100) / 100; return (r > 0 ? '+' : '') + r + '%'; }
