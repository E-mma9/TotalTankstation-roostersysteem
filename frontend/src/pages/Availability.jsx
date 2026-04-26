import { useEffect, useMemo, useState } from 'react';
import { availabilityApi, leaveRequestsApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { daysInMonth, shiftMonth, ymd, currentYearMonth } from '../utils/date';

// Monday-based weekday index (0=Mon … 6=Sun)
function weekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export default function Availability() {
  const start   = currentYearMonth();
  const initial = shiftMonth(start.year, start.month, 1);
  const [{ year, month }, setYM] = useState(initial);
  const [entries,  setEntries]  = useState({});   // { 'YYYY-MM-DD': { isAvailable, notes, status } }
  const [leaves,   setLeaves]   = useState({});   // { 'YYYY-MM-DD': true } – approved leave
  const [saving,   setSaving]   = useState(false);
  const [feedback, setFeedback] = useState(null);

  const days = useMemo(() => {
    const total = daysInMonth(year, month);
    return Array.from({ length: total }, (_, i) => new Date(year, month - 1, i + 1));
  }, [year, month]);

  useEffect(() => {
    setFeedback(null);
    Promise.all([
      availabilityApi.list(year, month),
      leaveRequestsApi.list('APPROVED'),
    ]).then(([rows, approved]) => {
      const map = {};
      rows.forEach((r) => {
        map[ymd(r.date)] = { isAvailable: r.isAvailable, notes: r.notes || '', status: r.status };
      });
      setEntries(map);

      const leaveMap = {};
      approved.forEach((l) => { leaveMap[ymd(l.date)] = true; });
      setLeaves(leaveMap);
    });
  }, [year, month]);

  function toggle(day) {
    const key = ymd(day);
    if (leaves[key]) return; // vrij goedgekeurd – niet aanpasbaar
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
      const payload = days
        .filter((d) => !leaves[ymd(d)]) // sla goedgekeurde vrije dagen over
        .map((d) => {
          const key = ymd(d);
          const existing = entries[key];
          return { date: key, isAvailable: existing ? existing.isAvailable : true, notes: existing?.notes };
        });
      await availabilityApi.save(year, month, payload);
      const rows = await availabilityApi.list(year, month);
      const map = {};
      rows.forEach((r) => { map[ymd(r.date)] = { isAvailable: r.isAvailable, notes: r.notes || '', status: r.status }; });
      setEntries(map);
      setFeedback({ type: 'ok', text: 'Ingediend. De manager beoordeelt je beschikbaarheid.' });
    } catch (err) {
      setFeedback({ type: 'err', text: err.response?.data?.error || 'Opslaan mislukt' });
    } finally {
      setSaving(false);
    }
  }

  // Calendar grid: leading empty cells so week starts on Monday
  const firstDay    = new Date(year, month - 1, 1);
  const leadingBlanks = weekdayIndex(firstDay);
  const todayKey    = ymd(new Date());

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mijn beschikbaarheid</h1>
          <p className="text-sm text-slate-500 mt-0.5">Geef aan wanneer je beschikbaar bent voor de komende maand</p>
        </div>
        <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 mb-5">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 border border-green-400" /> Beschikbaar</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 border border-red-400" /> Niet beschikbaar</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-400" /> Vrij goedgekeurd</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-slate-300" /> Nog niet ingevuld</span>
      </div>

      {/* Kalender grid */}
      <div className="card p-4 mb-5">
        {/* Weekdag headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className={`text-center text-xs font-bold uppercase tracking-wide py-1.5 ${d === 'Za' || d === 'Zo' ? 'text-slate-400' : 'text-slate-500'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Dag-cellen */}
        <div className="grid grid-cols-7 gap-1">
          {/* Lege cellen voor eerste week */}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}

          {days.map((d) => {
            const key        = ymd(d);
            const isToday    = key === todayKey;
            const isLeave    = leaves[key];
            const entry      = entries[key];
            const isAvail    = entry?.isAvailable;
            const status     = entry?.status;
            const isWeekend  = weekdayIndex(d) >= 5;

            let bg = 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50';
            let textColor = isWeekend ? 'text-slate-400' : 'text-slate-700';

            if (isLeave) {
              bg = 'bg-blue-100 border-blue-300 cursor-not-allowed';
              textColor = 'text-blue-800';
            } else if (isAvail === true) {
              bg = 'bg-green-100 border-green-400 hover:bg-green-200';
              textColor = 'text-green-900';
            } else if (isAvail === false) {
              bg = 'bg-red-100 border-red-400 hover:bg-red-200';
              textColor = 'text-red-900';
            }

            return (
              <button
                key={key}
                onClick={() => toggle(d)}
                disabled={!!isLeave}
                className={`relative rounded-xl border-2 p-2 text-left transition-all duration-100 min-h-[4rem] ${bg} ${isToday ? 'ring-2 ring-brand-500 ring-offset-1' : ''}`}
              >
                <div className={`text-sm font-bold tabular-nums ${textColor}`}>
                  {d.getDate()}
                </div>
                <div className={`text-[10px] font-semibold mt-0.5 leading-tight ${textColor}`}>
                  {isLeave
                    ? 'Vrij'
                    : isAvail === true
                      ? 'Beschikbaar'
                      : isAvail === false
                        ? 'Niet'
                        : ''}
                </div>
                {status === 'PENDING' && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" title="Wacht op goedkeuring" />
                )}
                {status === 'APPROVED' && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" title="Goedgekeurd" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Indienen...' : 'Indienen bij manager'}
        </button>
        {feedback && (
          <div className={`rounded-xl px-4 py-2 text-sm font-medium ${
            feedback.type === 'ok'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {feedback.text}
          </div>
        )}
      </div>
    </div>
  );
}
