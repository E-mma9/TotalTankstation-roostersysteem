import { useEffect, useMemo, useState } from 'react';
import { availabilityApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { daysInMonth, shiftMonth, ymd, isWeekend, currentYearMonth } from '../utils/date';

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
        map[ymd(r.date)] = { isAvailable: r.isAvailable, notes: r.notes || '' };
      });
      setEntries(map);
    });
  }, [year, month]);

  function toggle(day, value) {
    const key = ymd(day);
    setEntries((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), isAvailable: value, notes: prev[key]?.notes || '' },
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
      setFeedback('Opgeslagen');
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
        Geef per dag aan of je beschikbaar bent. Beschikbaarheid kan tot 2 maanden vooruit worden ingevuld.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        {days.map((d) => {
          const key = ymd(d);
          const value = entries[key];
          const available = value ? value.isAvailable : null;
          return (
            <button
              key={key}
              onClick={() => toggle(d, available === true ? false : true)}
              className={`rounded-md border p-3 text-left text-sm transition-colors ${
                available === true
                  ? 'bg-green-100 border-green-300'
                  : available === false
                    ? 'bg-red-100 border-red-300'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
              } ${isWeekend(d) ? 'ring-1 ring-slate-200' : ''}`}
            >
              <div className="font-medium">
                {d.getDate()} {d.toLocaleDateString('nl-NL', { weekday: 'short' })}
              </div>
              <div className="text-xs text-slate-500">
                {available === true ? 'beschikbaar' : available === false ? 'niet' : 'tap om te zetten'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
        {feedback && <span className="text-sm text-slate-600">{feedback}</span>}
      </div>
    </div>
  );
}
