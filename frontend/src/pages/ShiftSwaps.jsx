import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { shiftSwapsApi, schedulesApi, usersApi } from '../api/resources';
import { useAuthStore } from '../store/authStore';
import { currentYearMonth, formatDate } from '../utils/date';

const STATUS_CONFIG = {
  PENDING:         { label: 'Wacht op collega',  cls: 'bg-amber-100 text-amber-800' },
  MANAGER_PENDING: { label: 'Wacht op manager',  cls: 'bg-blue-100 text-blue-800' },
  ACCEPTED:        { label: 'Goedgekeurd',        cls: 'bg-green-100 text-green-800' },
  DECLINED:        { label: 'Afgewezen',          cls: 'bg-red-100 text-red-800' },
};

function StatusPill({ status }) {
  const c = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-sm px-3 py-1 rounded-full font-medium ${c.cls}`}>{c.label}</span>;
}

export default function ShiftSwaps() {
  const { user } = useAuthStore();
  const [params] = useSearchParams();
  const [swaps, setSwaps] = useState([]);
  const [users, setUsers] = useState([]);
  const [myEntries, setMyEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(params.get('entry') || '');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    shiftSwapsApi.list().then(setSwaps);
  }

  useEffect(() => {
    load();
    usersApi.list().then((items) => setUsers(items.filter((u) => u.id !== user.id && u.isActive !== false)));
    const { year, month } = currentYearMonth();
    schedulesApi
      .get(year, month)
      .then((s) => setMyEntries(s?.entries?.filter((e) => e.userId === user.id) || []));
  }, [user.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await shiftSwapsApi.create(selectedEntry, targetId, null);
      setSelectedEntry('');
      setTargetId('');
      setSuccess('Aanvraag verstuurd. Je collega wordt op de hoogte gesteld.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Aanvraag mislukt');
    }
  }

  async function handleRespond(id, status) {
    await shiftSwapsApi.respond(id, status);
    load();
  }

  const incoming = swaps.filter((s) => s.targetId === user.id && s.status === 'PENDING');
  const outgoing = swaps.filter((s) => s.requesterId === user.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dienstruil</h1>

      {/* ── Aanvragen ── */}
      <div className="card mb-6">
        <h2 className="font-semibold text-lg mb-1">Dienst aanbieden aan collega</h2>
        <p className="text-sm text-slate-500 mb-4">
          Selecteer welke dienst je wil aanbieden en aan wie. Je collega moet het eerst accepteren, daarna keurt de manager het goed.
        </p>
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="label">Mijn dienst</label>
            <select
              className="input"
              value={selectedEntry}
              onChange={(e) => setSelectedEntry(e.target.value)}
              required
            >
              <option value="">Kies dienst...</option>
              {myEntries.map((e) => (
                <option key={e.id} value={e.id}>
                  {formatDate(e.date)} — {e.shift.name} ({e.shift.startTime}–{e.shift.endTime})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Aan collega</label>
            <select
              className="input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              required
            >
              <option value="">Kies collega...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={!selectedEntry || !targetId}>
            Aanvragen
          </button>
        </form>
        {error && <p className="text-base text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-3">{error}</p>}
        {success && <p className="text-base text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mt-3">{success}</p>}
      </div>

      {/* ── Inkomend ── */}
      <h2 className="font-semibold text-lg mb-3">Inkomende verzoeken</h2>
      {incoming.length === 0 ? (
        <div className="card text-slate-500 mb-6">Geen verzoeken aan jou op dit moment.</div>
      ) : (
        <div className="space-y-3 mb-6">
          {incoming.map((s) => (
            <div key={s.id} className="card border-l-4 border-l-amber-400">
              <p className="font-semibold text-lg mb-1">
                {s.requester.firstName} {s.requester.lastName}
              </p>
              <p className="text-base text-slate-700 mb-0.5">
                Kan jij de dienst overnemen op <strong>{formatDate(s.scheduleEntry.date)}</strong>?
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Dienst {s.scheduleEntry.shift.name} · {s.scheduleEntry.shift.startTime}–{s.scheduleEntry.shift.endTime}
              </p>
              <div className="flex gap-3">
                <button onClick={() => handleRespond(s.id, 'ACCEPTED')} className="btn-primary">
                  Accepteren
                </button>
                <button onClick={() => handleRespond(s.id, 'DECLINED')} className="btn-secondary">
                  Afwijzen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Uitgaand ── */}
      <h2 className="font-semibold text-lg mb-3">Mijn aanvragen</h2>
      {outgoing.length === 0 ? (
        <div className="card text-slate-500">Je hebt nog geen aanvragen verstuurd.</div>
      ) : (
        <div className="space-y-2">
          {outgoing.map((s) => (
            <div key={s.id} className="card flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  Aan {s.target.firstName} {s.target.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {formatDate(s.scheduleEntry.date)} — dienst {s.scheduleEntry.shift.name}
                </p>
                {s.status === 'MANAGER_PENDING' && (
                  <p className="text-sm text-blue-700 mt-0.5">
                    Je collega heeft geaccepteerd — wacht op manager
                  </p>
                )}
              </div>
              <StatusPill status={s.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
