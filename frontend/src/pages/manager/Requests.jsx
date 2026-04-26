import { useEffect, useState } from 'react';
import { leaveRequestsApi, shiftSwapsApi } from '../../api/resources';
import { formatDate } from '../../utils/date';

const STATUS_LABEL = {
  PENDING: { label: 'Openstaand', cls: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Goedgekeurd', cls: 'bg-green-100 text-green-800' },
  DENIED: { label: 'Afgewezen', cls: 'bg-red-100 text-red-800' },
  ACCEPTED: { label: 'Geaccepteerd', cls: 'bg-green-100 text-green-800' },
  DECLINED: { label: 'Afgewezen', cls: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] ?? { label: status, cls: 'bg-slate-100 text-slate-700' };
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.cls}`}>{s.label}</span>;
}

function ActionButtons({ onApprove, onDeny, loading }) {
  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={onApprove}
        disabled={loading}
        className="btn-primary text-sm py-1 px-3"
      >
        Goedkeuren
      </button>
      <button
        onClick={onDeny}
        disabled={loading}
        className="btn-secondary text-sm py-1 px-3"
      >
        Afwijzen
      </button>
    </div>
  );
}

export default function ManagerRequests() {
  const [tab, setTab] = useState('leave');
  const [leaves, setLeaves] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(false);

  function load() {
    leaveRequestsApi.list().then(setLeaves);
    shiftSwapsApi.list().then(setSwaps);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(fn) {
    setLoading(true);
    try { await fn(); load(); } finally { setLoading(false); }
  }

  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING');
  const reviewedLeaves = leaves.filter((l) => l.status !== 'PENDING');
  const pendingSwaps = swaps.filter((s) => s.status === 'PENDING');
  const reviewedSwaps = swaps.filter((s) => s.status !== 'PENDING');

  function tabClass(t) {
    return `px-4 py-2 text-sm font-medium ${
      tab === t
        ? 'border-b-2 border-brand-600 text-brand-700'
        : 'text-slate-500 hover:text-slate-700'
    }`;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Verzoeken</h1>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button onClick={() => setTab('leave')} className={tabClass('leave')}>
          Vrije dagen {pendingLeaves.length > 0 && (
            <span className="ml-1 bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {pendingLeaves.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('swaps')} className={tabClass('swaps')}>
          Dienstruil {pendingSwaps.length > 0 && (
            <span className="ml-1 bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {pendingSwaps.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Vrije dagen ── */}
      {tab === 'leave' && (
        <div className="space-y-6">
          <section>
            <h2 className="font-medium text-slate-700 mb-3">Openstaand</h2>
            {pendingLeaves.length === 0 ? (
              <div className="card text-slate-500">Geen openstaande verzoeken.</div>
            ) : (
              <div className="space-y-2">
                {pendingLeaves.map((l) => (
                  <div key={l.id} className="card flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">{l.user.firstName} {l.user.lastName}</p>
                      <p className="text-sm text-slate-500">
                        {formatDate(l.date)}{l.reason && ` — ${l.reason}`}
                      </p>
                    </div>
                    <ActionButtons
                      loading={loading}
                      onApprove={() => act(() => leaveRequestsApi.review(l.id, 'APPROVED'))}
                      onDeny={() => act(() => leaveRequestsApi.review(l.id, 'DENIED'))}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-medium text-slate-700 mb-3">Beoordeeld</h2>
            {reviewedLeaves.length === 0 ? (
              <div className="card text-slate-500">Nog geen beoordeelde verzoeken.</div>
            ) : (
              <div className="space-y-2">
                {reviewedLeaves.slice(0, 20).map((l) => (
                  <div key={l.id} className="card flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium">{l.user.firstName} {l.user.lastName}</p>
                      <p className="text-slate-500">{formatDate(l.date)}{l.reason && ` — ${l.reason}`}</p>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Dienstruil ── */}
      {tab === 'swaps' && (
        <div className="space-y-6">
          <section>
            <h2 className="font-medium text-slate-700 mb-3">Openstaand</h2>
            {pendingSwaps.length === 0 ? (
              <div className="card text-slate-500">Geen openstaande dienstruil-verzoeken.</div>
            ) : (
              <div className="space-y-2">
                {pendingSwaps.map((s) => (
                  <div key={s.id} className="card flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        <span>{s.requester.firstName} {s.requester.lastName}</span>
                        <span className="text-slate-400 mx-2">→</span>
                        <span>{s.target.firstName} {s.target.lastName}</span>
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatDate(s.scheduleEntry.date)} · dienst {s.scheduleEntry.shift.name}
                        {s.proposedEntry && ` ↔ dienst ${s.proposedEntry.shift.name}`}
                      </p>
                    </div>
                    <ActionButtons
                      loading={loading}
                      onApprove={() => act(() => shiftSwapsApi.respond(s.id, 'ACCEPTED'))}
                      onDeny={() => act(() => shiftSwapsApi.respond(s.id, 'DECLINED'))}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-medium text-slate-700 mb-3">Beoordeeld</h2>
            {reviewedSwaps.length === 0 ? (
              <div className="card text-slate-500">Nog geen beoordeelde dienstruil-verzoeken.</div>
            ) : (
              <div className="space-y-2">
                {reviewedSwaps.slice(0, 20).map((s) => (
                  <div key={s.id} className="card flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium">
                        {s.requester.firstName} {s.requester.lastName}
                        <span className="text-slate-400 mx-2">→</span>
                        {s.target.firstName} {s.target.lastName}
                      </p>
                      <p className="text-slate-500">
                        {formatDate(s.scheduleEntry.date)} · dienst {s.scheduleEntry.shift.name}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

    </div>
  );
}
