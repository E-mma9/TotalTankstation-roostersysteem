import { useEffect, useMemo, useState } from 'react';
import {
  schedulesApi, usersApi, availabilityApi, leaveRequestsApi,
} from '../../api/resources';
import MonthSelector from '../../components/MonthSelector';
import { daysInMonth, ymd, currentYearMonth, monthName, isWeekend } from '../../utils/date';

const SHIFT_COLORS = {
  V: { bg: 'bg-sky-100 text-sky-800',    border: 'border-sky-200' },
  M: { bg: 'bg-amber-100 text-amber-800', border: 'border-amber-200' },
  A: { bg: 'bg-violet-100 text-violet-800', border: 'border-violet-200' },
};

export default function ManagerSchedule() {
  const [{ year, month }, setYM] = useState(currentYearMonth());
  const [schedule, setSchedule]   = useState(null);
  const [users, setUsers]         = useState([]);
  const [shifts, setShifts]       = useState([]);
  const [availability, setAvail]  = useState({});
  const [leaves, setLeaves]       = useState({});
  const [grid, setGrid]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [feedback, setFeedback]   = useState(null); // { type: 'ok'|'err', text }
  const [publishing, setPublishing] = useState(false);

  const days = useMemo(() => {
    const total = daysInMonth(year, month);
    return Array.from({ length: total }, (_, i) => new Date(year, month - 1, i + 1));
  }, [year, month]);

  async function loadAll() {
    const [sched, ulist, slist, avail, lreq] = await Promise.all([
      schedulesApi.get(year, month),
      usersApi.list(),
      schedulesApi.shifts(),
      availabilityApi.list(year, month).catch(() => []),
      leaveRequestsApi.list('APPROVED').catch(() => []),
    ]);

    setSchedule(sched);
    setUsers(ulist);
    setShifts(slist);

    const availMap = {};
    avail.forEach((a) => { availMap[`${a.userId}|${ymd(a.date)}`] = a.isAvailable; });
    setAvail(availMap);

    const leaveMap = {};
    lreq.forEach((l) => { leaveMap[`${l.userId}|${ymd(l.date)}`] = true; });
    setLeaves(leaveMap);

    const gridMap = {};
    (sched?.entries || []).forEach((e) => {
      gridMap[`${e.userId}|${ymd(e.date)}`] = { shiftId: e.shiftId, status: e.status || 'WERKEND' };
    });
    setGrid(gridMap);
  }

  useEffect(() => { loadAll(); }, [year, month]);

  function setCell(userId, day, shiftId) {
    const key = `${userId}|${ymd(day)}`;
    setGrid((prev) => {
      const next = { ...prev };
      if (!shiftId) delete next[key];
      else next[key] = { ...(prev[key] || { status: 'WERKEND' }), shiftId };
      return next;
    });
  }

  function clearRow(userId) {
    setGrid((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (k.startsWith(userId)) delete next[k]; });
      return next;
    });
  }

  async function handleCreate() {
    const created = await schedulesApi.create(year, month);
    setSchedule(created);
  }

  async function handleSave() {
    if (!schedule) return;
    setSaving(true);
    setFeedback(null);
    try {
      const entries = Object.entries(grid).map(([key, val]) => {
        const [userId, date] = key.split('|');
        return { userId, date, shiftId: val.shiftId, status: val.status };
      });
      const updated = await schedulesApi.saveEntries(schedule.id, entries);
      setSchedule(updated);
      setFeedback({ type: 'ok', text: 'Rooster opgeslagen' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: 'err', text: err.response?.data?.error || 'Opslaan mislukt' });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!schedule || schedule.publishedAt) return;
    const shiftCount = Object.keys(grid).length;
    if (!confirm(`Rooster publiceren voor ${monthName(month)} ${year}?\n\n${shiftCount} diensten worden zichtbaar voor alle medewerkers. Ze ontvangen een melding.`)) return;
    setPublishing(true);
    try {
      await handleSave();
      await schedulesApi.publish(schedule.id);
      await loadAll();
      setFeedback({ type: 'ok', text: 'Rooster is gepubliceerd! Medewerkers ontvangen een melding.' });
    } finally {
      setPublishing(false);
    }
  }

  const activeUsers = users.filter((u) => u.isActive && u.role !== 'MANAGER');
  const isPublished = !!schedule?.publishedAt;

  // Row stats: # diensten per medewerker
  function shiftCount(userId) {
    return Object.keys(grid).filter((k) => k.startsWith(userId) && grid[k]?.shiftId).length;
  }

  // Column stats: # diensten per dag
  function dayCount(day) {
    const key = ymd(day);
    return activeUsers.filter((u) => grid[`${u.id}|${key}`]?.shiftId).length;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rooster maken</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {monthName(month)} {year}
            {isPublished && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                ✓ Gepubliceerd op {new Date(schedule.publishedAt).toLocaleDateString('nl-NL')}
              </span>
            )}
            {schedule && !isPublished && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                ✏ Concept — nog niet zichtbaar voor medewerkers
              </span>
            )}
          </p>
        </div>
        <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
      </div>

      {/* Geen rooster aangemaakt */}
      {!schedule ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📅</p>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Nog geen rooster voor {monthName(month)} {year}</h2>
          <p className="text-slate-500 text-sm mb-6">
            Maak een nieuw rooster aan om diensten toe te wijzen aan medewerkers.
          </p>
          <button onClick={handleCreate} className="btn-primary mx-auto">
            Rooster aanmaken voor {monthName(month)}
          </button>
        </div>
      ) : (
        <>
          {/* Actiebalk */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {!isPublished && (
              <>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
                <button onClick={handlePublish} disabled={publishing || saving} className="btn-secondary">
                  {publishing ? 'Publiceren...' : 'Publiceren voor medewerkers'}
                </button>
              </>
            )}
            {feedback && (
              <span className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
                feedback.type === 'ok'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {feedback.text}
              </span>
            )}
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
                Beschikbaar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-100 border border-red-300" />
                Niet beschikbaar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
                Vrij goedgekeurd
              </span>
            </div>
          </div>

          {/* Mobiele scroll-hint */}
          <p className="sm:hidden text-xs text-slate-400 italic mb-2 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            Scroll horizontaal voor meer dagen
          </p>

          {/* Rooster tabel */}
          <div className="card p-0 overflow-x-auto">
            <table className="min-w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                    Medewerker
                  </th>
                  {days.map((d) => {
                    const count = dayCount(d);
                    return (
                      <th
                        key={ymd(d)}
                        className={`px-1 py-2 text-center border-b border-slate-200 min-w-[3rem] ${
                          isWeekend(d) ? 'bg-slate-50' : 'bg-white'
                        }`}
                      >
                        <div className={`text-[10px] font-semibold uppercase ${isWeekend(d) ? 'text-slate-400' : 'text-slate-400'}`}>
                          {d.toLocaleDateString('nl-NL', { weekday: 'short' })}
                        </div>
                        <div className={`text-sm font-bold tabular-nums ${isWeekend(d) ? 'text-slate-400' : 'text-slate-700'}`}>
                          {d.getDate()}
                        </div>
                        {count > 0 && (
                          <div className="text-[9px] text-slate-400 tabular-nums">{count}×</div>
                        )}
                      </th>
                    );
                  })}
                  <th className="border-b border-l border-slate-200 px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 whitespace-nowrap">
                    Totaal
                  </th>
                  {!isPublished && (
                    <th className="border-b border-slate-200 px-2 py-3 bg-slate-50" />
                  )}
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((u, idx) => {
                  const count = shiftCount(u.id);
                  const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                  return (
                    <tr key={u.id} className={rowBg}>
                      {/* Naam */}
                      <td className={`sticky left-0 z-10 px-3 py-2 border-b border-r border-slate-100 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] ${rowBg}`}>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold shrink-0">
                            {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                          </span>
                          <span className="font-medium text-slate-800 text-sm">
                            {u.firstName} <span className="text-slate-400">{u.lastName.charAt(0)}.</span>
                          </span>
                        </div>
                      </td>

                      {/* Dienst-cellen */}
                      {days.map((d) => {
                        const key = `${u.id}|${ymd(d)}`;
                        const cell = grid[key];
                        const isAvail = availability[key];
                        const onLeave = leaves[key];
                        const shift = cell ? shifts.find((s) => s.id === cell.shiftId) : null;
                        const sc = shift ? SHIFT_COLORS[shift.name] : null;

                        const cellBg = onLeave
                          ? 'bg-blue-50'
                          : isAvail === false
                            ? 'bg-red-50'
                            : isAvail === true
                              ? 'bg-green-50/60'
                              : '';

                        return (
                          <td key={key} className={`p-0.5 border-b border-slate-100 ${cellBg}`}>
                            <select
                              value={cell?.shiftId || ''}
                              onChange={(e) => setCell(u.id, d, e.target.value)}
                              disabled={isPublished}
                              title={shift ? `${shift.name}: ${shift.startTime}–${shift.endTime}` : 'Geen dienst'}
                              className={`w-full text-xs font-bold rounded px-1 py-1.5 border-0 cursor-pointer focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors ${
                                sc ? `${sc.bg}` : 'bg-transparent text-slate-400'
                              } ${isPublished ? 'opacity-70 cursor-default' : ''}`}
                            >
                              <option value="">—</option>
                              {shifts.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })}

                      {/* Totaal */}
                      <td className="border-b border-l border-slate-100 px-3 py-2 text-center bg-slate-50/50">
                        <span className={`text-sm font-bold tabular-nums ${count > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                          {count}
                        </span>
                      </td>

                      {/* Rij wissen */}
                      {!isPublished && (
                        <td className="border-b border-slate-100 px-1 py-2">
                          {count > 0 && (
                            <button
                              onClick={() => clearRow(u.id)}
                              title="Rij wissen"
                              className="text-slate-300 hover:text-red-400 transition-colors p-1 rounded"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legenda diensten */}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {shifts.map((s) => {
              const sc = SHIFT_COLORS[s.name];
              return (
                <span key={s.id} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc?.bg ?? 'bg-slate-100 text-slate-600'}`}>
                  <span className="font-bold">{s.name}</span>
                  {s.startTime}–{s.endTime}
                </span>
              );
            })}
            {isPublished && (
              <span className="ml-auto text-xs text-slate-400">
                Gepubliceerd — bewerken niet mogelijk
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
