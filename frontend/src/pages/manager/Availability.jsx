import { useEffect, useMemo, useState } from 'react';
import { availabilityApi, leaveRequestsApi, usersApi } from '../../api/resources';
import MonthSelector from '../../components/MonthSelector';
import { daysInMonth, shiftMonth, ymd, isWeekend, currentYearMonth } from '../../utils/date';

const DAY_STATUS = {
  PENDING: { label: 'Openstaand', dot: 'bg-amber-400' },
  APPROVED: { label: 'Goedgekeurd', dot: 'bg-green-500' },
  DENIED: { label: 'Afgewezen', dot: 'bg-red-400' },
};

export default function ManagerAvailability() {
  const start = currentYearMonth();
  const [{ year, month }, setYM] = useState(shiftMonth(start.year, start.month, 1));
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [entries, setEntries] = useState([]);
  const [leaves, setLeaves] = useState({});   // { 'YYYY-MM-DD': true } – approved leave
  const [denyState, setDenyState] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    usersApi.list().then((users) => {
      const emp = users.filter((u) => u.role !== 'MANAGER' && u.isActive !== false);
      setEmployees(emp);
      if (emp.length > 0) setSelectedId(emp[0].id);
    });
  }, []);

  function loadEntries(uid, y, m) {
    Promise.all([
      availabilityApi.list(y, m, uid),
      leaveRequestsApi.list('APPROVED'),
    ]).then(([rows, approved]) => {
      setEntries(rows);
      const leaveMap = {};
      approved
        .filter((l) => l.userId === uid)
        .forEach((l) => { leaveMap[ymd(l.date)] = true; });
      setLeaves(leaveMap);
    });
  }

  useEffect(() => {
    if (selectedId) loadEntries(selectedId, year, month);
  }, [selectedId, year, month]);

  const days = useMemo(() => {
    const total = daysInMonth(year, month);
    return Array.from({ length: total }, (_, i) => new Date(year, month - 1, i + 1));
  }, [year, month]);

  const entryMap = useMemo(() => {
    const map = {};
    entries.forEach((e) => { map[ymd(e.date)] = e; });
    return map;
  }, [entries]);

  const pendingCount = entries.filter((e) => e.status === 'PENDING').length;

  async function approve(id) {
    setLoading(true);
    try {
      await availabilityApi.review(id, 'APPROVED');
      loadEntries(selectedId, year, month);
    } finally { setLoading(false); }
  }

  async function deny(id) {
    const reason = denyState[id]?.reason || '';
    setLoading(true);
    try {
      await availabilityApi.review(id, 'DENIED', reason || undefined);
      setDenyState((prev) => ({ ...prev, [id]: { open: false, reason: '' } }));
      loadEntries(selectedId, year, month);
    } finally { setLoading(false); }
  }

  function openDeny(id) {
    setDenyState((prev) => ({ ...prev, [id]: { open: true, reason: '' } }));
  }

  function cancelDeny(id) {
    setDenyState((prev) => ({ ...prev, [id]: { open: false, reason: '' } }));
  }

  function setReason(id, value) {
    setDenyState((prev) => ({ ...prev, [id]: { ...prev[id], reason: value } }));
  }

  async function approveAll() {
    const pending = entries.filter((e) => e.status === 'PENDING');
    setLoading(true);
    try {
      await Promise.all(pending.map((e) => availabilityApi.review(e.id, 'APPROVED')));
      loadEntries(selectedId, year, month);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Beschikbaarheid medewerkers</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input sm:max-w-xs"
          >
            {employees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
          <div className="sm:ml-auto">
            <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> beschikbaar
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> niet beschikbaar
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> openstaand
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> vrij goedgekeurd
          </span>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={approveAll}
            disabled={loading}
            className="btn-primary text-sm py-1 px-3"
          >
            Alles goedkeuren ({pendingCount})
          </button>
        )}
      </div>

      {employees.length === 0 ? (
        <div className="card text-slate-500">Geen medewerkers gevonden.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {days.map((d) => {
            const key = ymd(d);
            const isLeave = leaves[key];
            const entry = entryMap[key];

            const dayLabel = `${d.getDate()} ${d.toLocaleDateString('nl-NL', { weekday: 'short' })}`;
            const weekendRing = isWeekend(d) ? 'ring-1 ring-slate-200' : '';

            if (isLeave) {
              return (
                <div
                  key={key}
                  className={`rounded-md border p-3 text-sm bg-blue-50 border-blue-200 ${weekendRing}`}
                >
                  <div className="font-medium text-blue-800">{dayLabel}</div>
                  <div className="text-xs text-blue-600 mt-0.5">Vrij goedgekeurd</div>
                </div>
              );
            }

            if (!entry) {
              return (
                <div
                  key={key}
                  className={`rounded-md border p-3 text-sm bg-slate-50 border-slate-200 ${weekendRing}`}
                >
                  <div className="font-medium text-slate-400">{dayLabel}</div>
                  <div className="text-xs text-slate-300 mt-0.5">Niet ingevuld</div>
                </div>
              );
            }

            const ds = denyState[entry.id] || { open: false, reason: '' };
            const isPending = entry.status === 'PENDING';

            return (
              <div
                key={key}
                className={`rounded-md border p-3 text-sm ${
                  entry.isAvailable
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                } ${weekendRing}`}
              >
                <div className="font-medium">{dayLabel}</div>
                <div className="text-xs text-slate-600">
                  {entry.isAvailable ? 'beschikbaar' : 'niet beschikbaar'}
                </div>
                {entry.notes && (
                  <div className="text-xs text-slate-500 truncate mt-0.5" title={entry.notes}>
                    {entry.notes}
                  </div>
                )}

                {isPending ? (
                  ds.open ? (
                    <div className="mt-2 space-y-1">
                      <input
                        type="text"
                        placeholder="Reden (optioneel)"
                        value={ds.reason}
                        onChange={(e) => setReason(entry.id, e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => deny(entry.id)}
                          disabled={loading}
                          className="flex-1 text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700 disabled:opacity-50"
                        >
                          Bevestig
                        </button>
                        <button
                          onClick={() => cancelDeny(entry.id)}
                          className="text-xs text-slate-500 px-2 py-1 hover:bg-slate-100 rounded"
                        >
                          Annuleer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => approve(entry.id)}
                        disabled={loading}
                        className="flex-1 text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 disabled:opacity-50"
                      >
                        Goedkeuren
                      </button>
                      <button
                        onClick={() => openDeny(entry.id)}
                        disabled={loading}
                        className="flex-1 text-xs bg-slate-100 text-slate-700 rounded px-2 py-1 hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                      >
                        Afwijzen
                      </button>
                    </div>
                  )
                ) : (
                  <div
                    className={`mt-1 text-xs font-medium flex items-center gap-1 ${
                      entry.status === 'APPROVED' ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${DAY_STATUS[entry.status]?.dot}`} />
                    {DAY_STATUS[entry.status]?.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
