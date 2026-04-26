export const MAANDEN = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
];

export const WEEKDAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function ymd(date) {
  // For API date strings (UTC midnight) use toISOString; for locally-created Date objects
  // use local date parts to avoid UTC-offset shifting the date back by one day.
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    return new Date(date).toISOString().slice(0, 10);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDate(dateLike, opts = { day: '2-digit', month: 'long', year: 'numeric' }) {
  const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  return d.toLocaleDateString('nl-NL', opts);
}

export function formatDay(dateLike) {
  const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: '2-digit', month: 'long' });
}

export function monthName(month) {
  return MAANDEN[month - 1];
}

export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function shiftMonth(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function isWeekend(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6;
}
