import { monthName, shiftMonth } from '../utils/date';

export default function MonthSelector({ year, month, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        className="btn-secondary"
        onClick={() => {
          const next = shiftMonth(year, month, -1);
          onChange(next.year, next.month);
        }}
        aria-label="Vorige maand"
      >
        ← Vorige
      </button>
      <span className="text-lg font-semibold min-w-[11rem] text-center">
        {monthName(month)} {year}
      </span>
      <button
        className="btn-secondary"
        onClick={() => {
          const next = shiftMonth(year, month, 1);
          onChange(next.year, next.month);
        }}
        aria-label="Volgende maand"
      >
        Volgende →
      </button>
    </div>
  );
}
