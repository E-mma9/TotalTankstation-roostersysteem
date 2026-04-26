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
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
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
