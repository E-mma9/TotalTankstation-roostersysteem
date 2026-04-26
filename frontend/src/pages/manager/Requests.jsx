import { useEffect, useState } from 'react';
import { leaveRequestsApi, shiftSwapsApi } from '../../api/resources';
import { formatDate } from '../../utils/date';

const STATUS_LABEL = {
  APPROVED: { label: 'Goedgekeurd', cls: 'bg-green-100 text-green-800' },
  ACCEPTED: { label: 'Goedgekeurd', cls: 'bg-green-100 text-green-800' },
  DENIED:   { label: 'Afgewezen',   cls: 'bg-red-100 text-red-800' },
  DECLINED: { label: 'Afgewezen',   cls: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] ?? { label: status, cls: 'bg-slate-100 text-slate-700' };
  return <span className={`text-sm px-3 py-1 rounded-full font-medium ${s.cls}`}>{s.label}</span>;
}

export default function ManagerRequests() {
  const [leaves, setLeaves] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const totalPending  = pendingLeaves.length + pendingSwaps.length;
  const totalReviewed = reviewedLeaves.length + reviewedSwaps.length;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Verzoeken</h1>

      {/* ── Openstaand ── */}
      {totalPending === 0 ? (
        <div className="card text-slate-600 mb-6">
          Geen openstaande verzoeken — alles is beoordeeld.
        </div>
      ) : (
        <>
          <p className="text-slate-500 mb-4">
            {totalPending} verzoek{totalPending !== 1 ? 'en' : ''} wacht{totalPending === 1 ? '' : 'en'} op jouw beoordeling
          </p>

          <div className="space-y-4 mb-8">
            {pendingLeaves.map((l) => (
              <div key={l.id} className="card border-l-4 border-l-blue-500">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-block text-xs font-bold uppercase tracking-wide text-blue-700 bg-blue-100 rounded px-2 py-0.5 mb-2">
                      Vrije dag
                    </span>
                    <p className="text-xl font-semibold">{l.user.firstName} {l.user.lastName}</p>
                    <p className="text-lg text-slate-700 mt-1">{formatDate(l.date)}</p>
                    {l.reason && (
                      <p className="text-base text-slate-500 mt-1">Reden: {l.reason}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => act(() => leaveRequestsApi.review(l.id, 'APPROVED'))}
                      disabled={loading}
                      className="btn-primary"
                    >
                      Goedkeuren
                    </button>
                    <button
                      onClick={() => act(() => leaveRequestsApi.review(l.id, 'DENIED'))}
                      disabled={loading}
                      className="btn-secondary"
                    >
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
                    <span className="inline-block text-xs font-bold uppercase tracking-wide text-purple-700 bg-purple-100 rounded px-2 py-0.5 mb-2">
                      Dienstruil
                    </span>
                    <p className="text-xl font-semibold">
                      {s.requester.firstName} {s.requester.lastName}
                    </p>
                    <p className="text-base text-slate-700 mt-1">
                      vraagt aan <strong>{s.target.firstName} {s.target.lastName}</strong> om de dienst over te nemen
                    </p>
                    <p className="text-base text-slate-500 mt-1">
                      {formatDate(s.scheduleEntry.date)} &middot; Dienst {s.scheduleEntry.shift.name} ({s.scheduleEntry.shift.startTime}–{s.scheduleEntry.shift.endTime})
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => act(() => shiftSwapsApi.respond(s.id, 'ACCEPTED'))}
                      disabled={loading}
                      className="btn-primary"
                    >
                      Goedkeuren
                    </button>
                    <button
                      onClick={() => act(() => shiftSwapsApi.respond(s.id, 'DECLINED'))}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      Afwijzen
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Geschiedenis ── */}
      {totalReviewed > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="btn-secondary mb-4"
          >
            {showHistory ? 'Verberg' : 'Bekijk'} beoordeelde verzoeken ({totalReviewed})
          </button>

          {showHistory && (
            <div className="space-y-2">
              {reviewedLeaves.slice(0, 20).map((l) => (
                <div key={l.id} className="card flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-blue-700">Vrije dag</span>
                    <p className="font-medium">{l.user.firstName} {l.user.lastName}</p>
                    <p className="text-sm text-slate-500">{formatDate(l.date)}{l.reason && ` — ${l.reason}`}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
              {reviewedSwaps.slice(0, 20).map((s) => (
                <div key={s.id} className="card flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-purple-700">Dienstruil</span>
                    <p className="font-medium">
                      {s.requester.firstName} {s.requester.lastName} → {s.target.firstName} {s.target.lastName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDate(s.scheduleEntry.date)} &middot; Dienst {s.scheduleEntry.shift.name}
                    </p>
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
