import { useEffect, useMemo, useState } from 'react';
import {
  schedulesApi,
  usersApi,
  availabilityApi,
  leaveRequestsApi,
} from '../../api/resources';
import MonthSelector from '../../components/MonthSelector';
import {
  daysInMonth,
  ymd,
  currentYearMonth,
  monthName,
  isWeekend,
} from '../../utils/date';

export default function ManagerSchedule() {
  const [{ year, month }, setYM] = useState(currentYearMonth());
  const [schedule, setSchedule] = useState(null);
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [availability, setAvailability] = useState({});
  const [leaves, setLeaves] = useState({});
  const [grid, setGrid] = useState({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const days = useMemo(() => {
    const total = daysInMonth(year, month);
    return Array.from({ length: total }, (_, i) => new Date(year, month - 1, i + 1));
  }, [year, month]);

  async function loadAll() {
    const [sched, ulist, slist, avail, lreq] = await Promise.all([
      schedulesApi.get(year, month),
      usersApi.list(),
      schedulesApi.shifts(),
      availabilityApi.list(year, month),
      leaveRequestsApi.list('APPROVED'),
    ]);

    setSchedule(sched);
    setUsers(ulist);
    setShifts(slist);

    const availMap = {};
    avail.forEach((a) => {
      availMap[`${a.userId}|${ymd(a.date)}`] = a.isAvailable;
    });
    setAvailability(availMap);

    const leaveMap = {};
    lreq.forEach((l) => {
      const key = `${l.userId}|${ymd(l.date)}`;
      leaveMap[key] = true;
    });
    setLeaves(leaveMap);

    const gridMap = {};
    (sched?.entries || []).forEach((e) => {
      gridMap[`${e.userId}|${ymd(e.date)}`] = {
        shiftId: e.shiftId,
        status: e.status || 'WERKEND',
      };
    });
    setGrid(gridMap);
  }

  useEffect(() => {
    loadAll();
  }, [year, month]);

  function setCell(userId, day, value) {
    const key = `${userId}|${ymd(day)}`;
    setGrid((prev) => {
      const next = { ...prev };
      if (!value) {
        delete next[key];
      } else {
        next[key] = { ...(prev[key] || { status: 'WERKEND' }), shiftId: value };
      }
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
    setFeedback('');
    try {
      const entries = Object.entries(grid).map(([key, val]) => {
        const [userId, date] = key.split('|');
        return { userId, date, shiftId: val.shiftId, status: val.status };
      });
      const updated = await schedulesApi.saveEntries(schedule.id, entries);
      setSchedule(updated);
      setFeedback('Opgeslagen');
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!schedule || schedule.publishedAt) return;
    if (!confirm(`Rooster ${monthName(month)} ${year} publiceren? Iedereen krijgt een melding.`)) return;
    await handleSave();
    await schedulesApi.publish(schedule.id);
    await loadAll();
  }

  const activeUsers = users.filter((u) => u.isActive);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Rooster bewerken</h1>
        <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
      </div>

      {!schedule ? (
        <div className="card flex items-center justify-between">
          <p>
            Voor {monthName(month)} {year} bestaat nog geen rooster.
          </p>
          <button onClick={handleCreate} className="btn-primary">
            Rooster aanmaken
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
            <button
              onClick={handlePublish}
              disabled={!!schedule.publishedAt}
              className="btn-secondary"
            >
              {schedule.publishedAt ? 'Gepubliceerd' : 'Publiceren'}
            </button>
            {feedback && <span className="text-sm text-slate-600">{feedback}</span>}
            <div className="ml-auto text-xs text-slate-500 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 bg-green-100 border border-green-300 inline-block" /> beschikbaar
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 bg-red-100 border border-red-300 inline-block" /> niet beschikbaar
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-100 border border-blue-300 inline-block" /> vrij
                goedgekeurd
              </span>
            </div>
          </div>

          <div className="overflow-x-auto card p-0">
            <table className="min-w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide z-10 border-b border-slate-200">
                    Medewerker
                  </th>
                  {days.map((d) => (
                    <th
                      key={ymd(d)}
                      className={`px-1 py-2 text-center border-b border-slate-200 ${
                        isWeekend(d) ? 'bg-slate-50' : 'bg-white'
                      }`}
                    >
                      <div className={`text-[10px] font-medium uppercase ${isWeekend(d) ? 'text-slate-400' : 'text-slate-500'}`}>
                        {d.toLocaleDateString('nl-NL', { weekday: 'short' })}
                      </div>
                      <div className={`text-sm font-semibold tabular-nums ${isWeekend(d) ? 'text-slate-500' : 'text-slate-800'}`}>
                        {d.getDate()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((u, idx) => (
                  <tr key={u.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className={`sticky left-0 px-4 py-2 font-medium z-10 whitespace-nowrap border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
                          {u.firstName.charAt(0)}
                        </span>
                        <span>
                          {u.firstName} {u.lastName.charAt(0)}.
                        </span>
                      </div>
                    </td>
                    {days.map((d) => {
                      const key = `${u.id}|${ymd(d)}`;
                      const cell = grid[key];
                      const isAvail = availability[key];
                      const onLeave = leaves[key];
                      const shift = cell ? shifts.find((s) => s.id === cell.shiftId) : null;
                      const bg = onLeave
                        ? 'bg-blue-50'
                        : isAvail === false
                          ? 'bg-red-50/70'
                          : isAvail === true
                            ? 'bg-green-50/40'
                            : '';
                      return (
                        <td key={key} className={`p-1 border-b border-slate-100 ${bg}`}>
                          <select
                            value={cell?.shiftId || ''}
                            onChange={(e) => setCell(u.id, d, e.target.value)}
                            className={`w-full text-xs font-semibold rounded px-1 py-1 border-0 focus:ring-1 focus:ring-brand-500 cursor-pointer ${
                              shift?.name === 'V'
                                ? 'bg-sky-100 text-sky-800'
                                : shift?.name === 'M'
                                  ? 'bg-amber-100 text-amber-800'
                                  : shift?.name === 'A'
                                    ? 'bg-violet-100 text-violet-800'
                                    : 'bg-transparent text-slate-400'
                            }`}
                            disabled={!!schedule.publishedAt}
                            title={shift ? `${shift.name} ${shift.startTime}–${shift.endTime}` : ''}
                          >
                            <option value="">—</option>
                            {shifts.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="shift-pill shift-V">V</span> 06:15–12:00
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="shift-pill shift-M">M</span> 09:00–17:00
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="shift-pill shift-A">A</span> 17:00–22:00
            </span>
          </div>

          {schedule.publishedAt && (
            <p className="text-sm text-slate-500 mt-3">
              Het rooster is gepubliceerd op{' '}
              {new Date(schedule.publishedAt).toLocaleDateString('nl-NL')}. Bewerken niet mogelijk.
            </p>
          )}
        </>
      )}
    </div>
  );
}
