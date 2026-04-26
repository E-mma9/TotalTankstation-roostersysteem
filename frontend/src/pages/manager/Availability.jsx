import { useEffect, useMemo, useState } from 'react';
import { availabilityApi, usersApi } from '../../api/resources';
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
    availabilityApi.list(y, m, uid).then(setEntries);
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
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Beschikbaarheid</h1>
        <div className="flex-1" />
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="input max-w-xs"
        >
          {employees.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
        <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> beschikbaar
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> niet beschikbaar
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> openstaand
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
            const entry = entryMap[key];

            if (!entry) {
              return (
                <div
                  key={key}
                  className={`rounded-md border p-3 text-sm bg-slate-50 border-slate-200 ${
                    isWeekend(d) ? 'ring-1 ring-slate-100' : ''
                  }`}
                >
                  <div className="font-medium text-slate-400">
                    {d.getDate()} {d.toLocaleDateString('nl-NL', { weekday: 'short' })}
                  </div>
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
                } ${isWeekend(d) ? 'ring-1 ring-slate-200' : ''}`}
              >
                <div className="font-medium">
                  {d.getDate()} {d.toLocaleDateString('nl-NL', { weekday: 'short' })}
                </div>
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
