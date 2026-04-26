import { monthName, shiftMonth } from '../utils/date';

export default function MonthSelector({ year, month, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        className="btn-secondary px-3 py-1.5 text-sm"
        onClick={() => { const n = shiftMonth(year, month, -1); onChange(n.year, n.month); }}
        aria-label="Vorige maand"
      >
        ←
      </button>
      <span className="text-sm font-semibold text-slate-700 min-w-[8rem] text-center">
        {monthName(month)} {year}
      </span>
      <button
        className="btn-secondary px-3 py-1.5 text-sm"
        onClick={() => { const n = shiftMonth(year, month, 1); onChange(n.year, n.month); }}
        aria-label="Volgende maand"
      >
        →
      </button>
    </div>
  );
}
