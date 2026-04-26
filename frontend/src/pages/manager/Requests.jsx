import { useEffect, useState } from 'react';
import { leaveRequestsApi, shiftSwapsApi } from '../../api/resources';
import { formatDate } from '../../utils/date';

function StatusBadge({ status }) {
  const map = {
    APPROVED: { label: 'Goedgekeurd', cls: 'bg-green-50 text-green-700 border border-green-200' },
    ACCEPTED: { label: 'Goedgekeurd', cls: 'bg-green-50 text-green-700 border border-green-200' },
    DENIED:   { label: 'Afgewezen',   cls: 'bg-red-50 text-red-700 border border-red-200' },
    DECLINED: { label: 'Afgewezen',   cls: 'bg-red-50 text-red-700 border border-red-200' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.cls}`}>{s.label}</span>;
}

export default function ManagerRequests() {
  const [leaves, setLeaves]     = useState([]);
  const [swaps, setSwaps]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  function load() {
    leaveRequestsApi.list().then(setLeaves);
    shiftSwapsApi.list().then(setSwaps);
  }
  useEffect(() => { load(); }, []);

  async function act(fn) {
    setLoading(true);
    try { await fn(); load(); } finally { setLoading(false); }
  }

  const pendingLeaves  = leaves.filter((l) => l.status === 'PENDING');
  const pendingSwaps   = swaps.filter((s) => s.status === 'MANAGER_PENDING');
  const reviewedLeaves = leaves.filter((l) => l.status !== 'PENDING');
  const reviewedSwaps  = swaps.filter((s) => !['PENDING', 'MANAGER_PENDING'].includes(s.status));
  const totalPending   = pendingLeaves.length + pendingSwaps.length;
  const totalReviewed  = reviewedLeaves.length + reviewedSwaps.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Verlof & Dienstruil</h1>
        <p className="text-sm text-slate-500 mt-1">Verzoeken van medewerkers beoordelen</p>
      </div>

      {totalPending === 0 ? (
        <div className="card text-center py-10">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-semibold text-slate-700">Niets te beoordelen</p>
          <p className="text-sm text-slate-500 mt-1">Alle verzoeken zijn afgehandeld.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          <p className="text-sm font-medium text-slate-500">
            {totalPending} verzoek{totalPending !== 1 ? 'en' : ''} wacht{totalPending === 1 ? '' : 'en'} op jouw beoordeling
          </p>

          {pendingLeaves.map((l) => (
            <div key={l.id} className="card border-l-4 border-l-blue-500">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-block text-xs font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5 mb-2">
                    Verlof
                  </span>
                  <p className="text-lg font-bold text-slate-900">{l.user.firstName} {l.user.lastName}</p>
                  <p className="text-base text-slate-600 mt-0.5">{formatDate(l.date)}</p>
                  {l.reason && <p className="text-sm text-slate-400 mt-0.5">"{l.reason}"</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(() => leaveRequestsApi.review(l.id, 'APPROVED'))} disabled={loading} className="btn-primary">
                    Goedkeuren
                  </button>
                  <button onClick={() => act(() => leaveRequestsApi.review(l.id, 'DENIED'))} disabled={loading} className="btn-secondary">
                    Afwijzen
                  </button>
                </div>
              </div>
            </div>
          ))}

          {pendingSwaps.map((s) => (
            <div key={s.id} className="card border-l-4 border-l-purple-500">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-block text-xs font-bold uppercase tracking-wide text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-2.5 py-0.5 mb-2">
                    Dienstruil
                  </span>
                  <p className="text-lg font-bold text-slate-900">
                    {s.requester.firstName} {s.requester.lastName}
                    <span className="text-slate-400 font-normal text-base"> → </span>
                    {s.target.firstName} {s.target.lastName}
                  </p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {formatDate(s.scheduleEntry.date)} · Dienst {s.scheduleEntry.shift.name} ({s.scheduleEntry.shift.startTime}–{s.scheduleEntry.shift.endTime})
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Beide partijen akkoord — jij geeft finale goedkeuring</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(() => shiftSwapsApi.respond(s.id, 'ACCEPTED'))} disabled={loading} className="btn-primary">
                    Goedkeuren
                  </button>
                  <button onClick={() => act(() => shiftSwapsApi.respond(s.id, 'DECLINED'))} disabled={loading} className="btn-secondary">
                    Afwijzen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalReviewed > 0 && (
        <div>
          <button onClick={() => setShowHistory((v) => !v)} className="btn-secondary text-sm mb-4">
            {showHistory ? 'Verberg' : 'Toon'} afgehandelde verzoeken ({totalReviewed})
          </button>
          {showHistory && (
            <div className="space-y-2">
              {reviewedLeaves.slice(0, 20).map((l) => (
                <div key={l.id} className="card-compact flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Verlof</span>
                    <p className="font-medium text-slate-800 mt-0.5">{l.user.firstName} {l.user.lastName}</p>
                    <p className="text-sm text-slate-500">{formatDate(l.date)}{l.reason && ` — ${l.reason}`}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
              {reviewedSwaps.slice(0, 20).map((s) => (
                <div key={s.id} className="card-compact flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Dienstruil</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {s.requester.firstName} → {s.target.firstName}
                    </p>
                    <p className="text-sm text-slate-500">{formatDate(s.scheduleEntry.date)} · Dienst {s.scheduleEntry.shift.name}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
