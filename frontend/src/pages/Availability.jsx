import { useEffect, useMemo, useState } from 'react';
import { availabilityApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { daysInMonth, shiftMonth, ymd, isWeekend, currentYearMonth } from '../utils/date';

const STATUS_ICON = {
  PENDING: { label: 'wacht op goedkeuring', cls: 'text-amber-600' },
  APPROVED: { label: 'goedgekeurd', cls: 'text-green-700' },
  DENIED: { label: 'afgewezen', cls: 'text-red-600' },
};

export default function Availability() {
  const start = currentYearMonth();
  const initial = shiftMonth(start.year, start.month, 1);
  const [{ year, month }, setYM] = useState(initial);
  const [entries, setEntries] = useState({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const days = useMemo(() => {
    const total = daysInMonth(year, month);
    return Array.from({ length: total }, (_, i) => new Date(year, month - 1, i + 1));
  }, [year, month]);

  useEffect(() => {
    availabilityApi.list(year, month).then((rows) => {
      const map = {};
      rows.forEach((r) => {
        map[ymd(r.date)] = {
          isAvailable: r.isAvailable,
          notes: r.notes || '',
          status: r.status || null,
        };
      });
      setEntries(map);
    });
  }, [year, month]);

  function toggle(day, currentAvailable) {
    const key = ymd(day);
    setEntries((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        isAvailable: currentAvailable === true ? false : true,
        notes: prev[key]?.notes || '',
        status: null,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setFeedback('');
    try {
      const payload = days.map((d) => {
        const key = ymd(d);
        const existing = entries[key];
        return {
          date: key,
          isAvailable: existing ? existing.isAvailable : true,
          notes: existing?.notes || undefined,
        };
      });
      await availabilityApi.save(year, month, payload);
      setFeedback('Ingediend — wacht op goedkeuring van de manager');
      // reload to get status
      const rows = await availabilityApi.list(year, month);
      const map = {};
      rows.forEach((r) => {
        map[ymd(r.date)] = { isAvailable: r.isAvailable, notes: r.notes || '', status: r.status || null };
      });
      setEntries(map);
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Beschikbaarheid</h1>
        <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Geef per dag aan of je beschikbaar bent. Na opslaan beoordeelt de manager je opgave.
      </p>

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> wacht op goedkeuring</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> goedgekeurd</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> afgewezen</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        {days.map((d) => {
          const key = ymd(d);
          const value = entries[key];
          const available = value ? value.isAvailable : null;
          const status = value?.status ?? null;

          let borderCls = 'border-slate-200 hover:bg-slate-50';
          let bgCls = 'bg-white';
          if (available === true) { bgCls = 'bg-green-50'; borderCls = 'border-green-300'; }
          if (available === false) { bgCls = 'bg-red-50'; borderCls = 'border-red-300'; }

          const statusInfo = status ? STATUS_ICON[status] : null;

          return (
            <button
              key={key}
              onClick={() => toggle(d, available)}
              className={`rounded-md border p-3 text-left text-sm transition-colors ${bgCls} ${borderCls} ${isWeekend(d) ? 'ring-1 ring-slate-200' : ''}`}
            >
              <div className="font-medium">
                {d.getDate()} {d.toLocaleDateString('nl-NL', { weekday: 'short' })}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {available === true ? 'beschikbaar' : available === false ? 'niet' : 'klik om te zetten'}
              </div>
              {statusInfo && (
                <div className={`text-xs mt-1 truncate ${statusInfo.cls}`}>
                  {statusInfo.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Indienen...' : 'Indienen bij manager'}
        </button>
        {feedback && <span className="text-sm text-slate-600">{feedback}</span>}
      </div>
    </div>
  );
}
