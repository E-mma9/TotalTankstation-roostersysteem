import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { shiftSwapsApi, schedulesApi, usersApi } from '../api/resources';
import { useAuthStore } from '../store/authStore';
import { currentYearMonth, formatDate } from '../utils/date';

const STATUS_LABELS = { PENDING: 'Open', ACCEPTED: 'Geaccepteerd', DECLINED: 'Afgewezen' };
const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
};

export default function ShiftSwaps() {
  const { user } = useAuthStore();
  const [params] = useSearchParams();
  const [swaps, setSwaps] = useState([]);
  const [users, setUsers] = useState([]);
  const [myEntries, setMyEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(params.get('entry') || '');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');

  function load() {
    shiftSwapsApi.list().then(setSwaps);
  }

  useEffect(() => {
    load();
    usersApi.list().then((items) => setUsers(items.filter((u) => u.id !== user.id)));
    const { year, month } = currentYearMonth();
    schedulesApi
      .get(year, month)
      .then((s) => setMyEntries(s?.entries?.filter((e) => e.userId === user.id) || []));
  }, [user.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await shiftSwapsApi.create(selectedEntry, targetId, null);
      setSelectedEntry('');
      setTargetId('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Aanvraag mislukt');
    }
  }

  async function handleRespond(id, status) {
    await shiftSwapsApi.respond(id, status);
    load();
  }

  const incoming = swaps.filter((s) => s.targetId === user.id);
  const outgoing = swaps.filter((s) => s.requesterId === user.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dienstruil</h1>

      <div className="card mb-6">
        <h2 className="font-medium mb-3">Dienst aanbieden</h2>
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
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <h2 className="font-medium mb-3">Inkomend</h2>
      {incoming.length === 0 ? (
        <div className="card text-slate-600 mb-6">Geen openstaande verzoeken aan jou.</div>
      ) : (
        <div className="space-y-2 mb-6">
          {incoming.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">
                  {s.requester.firstName} {s.requester.lastName}
                </p>
                <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[s.status]}`}>
                  {STATUS_LABELS[s.status]}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Vraagt of jij {formatDate(s.scheduleEntry.date)} dienst {s.scheduleEntry.shift.name} (
                {s.scheduleEntry.shift.startTime}–{s.scheduleEntry.shift.endTime}) wil overnemen
              </p>
              {s.status === 'PENDING' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleRespond(s.id, 'ACCEPTED')} className="btn-primary">
                    Accepteren
                  </button>
                  <button onClick={() => handleRespond(s.id, 'DECLINED')} className="btn-secondary">
                    Afwijzen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="font-medium mb-3">Uitgaand</h2>
      {outgoing.length === 0 ? (
        <div className="card text-slate-600">Geen verzoeken verzonden.</div>
      ) : (
        <div className="space-y-2">
          {outgoing.map((s) => (
            <div key={s.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Naar {s.target.firstName} {s.target.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {formatDate(s.scheduleEntry.date)} — dienst {s.scheduleEntry.shift.name}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[s.status]}`}>
                {STATUS_LABELS[s.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
