// ============================================================================
// Date/time formatting — single source of truth.
//
// Aura is an India-based product, so every date/time we DISPLAY is rendered in
// IST (Asia/Kolkata) with the en-IN locale, regardless of where the viewer's
// device clock is set. Before this, call sites used bare
// `new Date(x).toLocaleDateString()`, which silently followed the *viewer's*
// timezone — so an admin (or a server) outside India saw non-IST timestamps —
// and the Profile "Timezone" setting defaulted to UTC.
//
// Use these helpers instead of calling toLocaleString/toLocaleDateString
// directly, so the timezone lives in exactly one place.
// ============================================================================

export const APP_TIME_ZONE = "Asia/Kolkata";
export const APP_LOCALE = "en-IN";

type DateInput = string | number | Date | null | undefined;

const toDate = (v: DateInput): Date | null => {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Date only, in IST. Default e.g. "4 Aug 2026". Returns "—" for empty/invalid. */
export function formatDate(
  v: DateInput,
  opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  const d = toDate(v);
  return d
    ? d.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIME_ZONE, ...opts })
    : "—";
}

/** Date + time, in IST. Default e.g. "4 Aug 2026, 06:30 pm". "—" if invalid. */
export function formatDateTime(
  v: DateInput,
  opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  const d = toDate(v);
  return d
    ? d.toLocaleString(APP_LOCALE, { timeZone: APP_TIME_ZONE, ...opts })
    : "—";
}

/** Today's date key "YYYY-MM-DD" in IST — for day-bucketing so "today" always
 *  matches India even if the device clock is on another timezone. (en-CA is the
 *  locale whose short date format is ISO YYYY-MM-DD.) */
export function todayKeyIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE });
}
