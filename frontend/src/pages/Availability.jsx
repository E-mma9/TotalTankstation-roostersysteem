import { useEffect, useMemo, useState } from 'react';
import { availabilityApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { daysInMonth, shiftMonth, ymd, isWeekend, currentYearMonth } from '../utils/date';

const STATUS_ICON = {
  PENDING: { label: 'Wacht op goedkeuring', cls: 'text-amber-700' },
  APPROVED: { label: 'Goedgekeurd', cls: 'text-green-700' },
  DENIED: { label: 'Afgewezen', cls: 'text-red-600' },
};

export default function Availability() {
  const start = currentYearMonth();
  const initial = shiftMonth(start.year, start.month, 1);
  const [{ year, month }, setYM] = useState(initial);
  const [entries, setEntries] = useState({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', text }

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
    setFeedback(null);
  }, [year, month]);

  function toggle(day) {
    const key = ymd(day);
    setEntries((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        isAvailable: prev[key]?.isAvailable === true ? false : true,
        notes: prev[key]?.notes || '',
        status: null,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
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
      const rows = await availabilityApi.list(year, month);
      const map = {};
      rows.forEach((r) => {
        map[ymd(r.date)] = { isAvailable: r.isAvailable, notes: r.notes || '', status: r.status || null };
      });
      setEntries(map);
      setFeedback({ type: 'success', text: 'Ingediend! De manager beoordeelt je beschikbaarheid.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Opslaan mislukt' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Mijn beschikbaarheid</h1>
        <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
      </div>

      <div className="card mb-5 bg-blue-50 border-blue-200">
        <p className="text-base text-blue-900 font-medium mb-1">Hoe werkt het?</p>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Klik op een dag om aan te geven of je beschikbaar bent (groen) of niet (rood).</li>
          <li>Klik op <strong>Indienen bij manager</strong> als je klaar bent.</li>
          <li>De manager beoordeelt je opgave en je krijgt een berichtje.</li>
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-5 text-sm text-slate-600 mb-4">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-green-200 border border-green-400 inline-block" />
          Beschikbaar
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-200 border border-red-400 inline-block" />
          Niet beschikbaar
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-white border border-slate-300 inline-block" />
          Nog niet ingevuld
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        {days.map((d) => {
          const key = ymd(d);
          const value = entries[key];
          const available = value ? value.isAvailable : null;
          const status = value?.status ?? null;

          let borderCls = 'border-slate-300 hover:bg-slate-50';
          let bgCls = 'bg-white';
          if (available === true) { bgCls = 'bg-green-100'; borderCls = 'border-green-400'; }
          if (available === false) { bgCls = 'bg-red-100'; borderCls = 'border-red-400'; }

          const statusInfo = status ? STATUS_ICON[status] : null;

          return (
            <button
              key={key}
              onClick={() => toggle(d)}
              className={`rounded-md border-2 p-3 text-left transition-colors ${bgCls} ${borderCls} ${isWeekend(d) ? 'ring-1 ring-slate-300' : ''}`}
            >
              <div className="font-bold text-base">
                {d.getDate()}
              </div>
              <div className="text-xs text-slate-600 capitalize">
                {d.toLocaleDateString('nl-NL', { weekday: 'short' })}
              </div>
              <div className="text-xs mt-1 font-medium">
                {available === true
                  ? <span className="text-green-800">Beschikbaar</span>
                  : available === false
                    ? <span className="text-red-800">Niet</span>
                    : <span className="text-slate-400">—</span>}
              </div>
              {statusInfo && (
                <div className={`text-xs mt-0.5 ${statusInfo.cls}`}>
                  {statusInfo.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Indienen...' : 'Indienen bij manager'}
        </button>
        {feedback && (
          <div className={`rounded-lg px-4 py-2 text-base font-medium ${
            feedback.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {feedback.text}
          </div>
        )}
      </div>
    </div>
  );
}
