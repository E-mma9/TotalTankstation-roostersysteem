import { useEffect, useState } from 'react';
import { leaveRequestsApi, shiftSwapsApi } from '../../api/resources';
import { formatDate } from '../../utils/date';

const TABS = ['leave', 'swaps'];

export default function ManagerRequests() {
  const [tab, setTab] = useState('leave');
  const [leaves, setLeaves] = useState([]);
  const [swaps, setSwaps] = useState([]);

  function load() {
    leaveRequestsApi.list().then(setLeaves);
    shiftSwapsApi.list().then(setSwaps);
  }

  useEffect(() => {
    load();
  }, []);

  async function review(id, status) {
    await leaveRequestsApi.review(id, status);
    load();
  }

  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING');
  const reviewedLeaves = leaves.filter((l) => l.status !== 'PENDING');

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Verzoeken</h1>

      <div className="flex gap-2 mb-4 border-b border-slate-200">
        <button
          onClick={() => setTab('leave')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'leave'
              ? 'border-b-2 border-brand-600 text-brand-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Vrije dagen ({pendingLeaves.length})
        </button>
        <button
          onClick={() => setTab('swaps')}
          className={`px-4 py-2 text-sm font-medium ${
            tab === 'swaps'
              ? 'border-b-2 border-brand-600 text-brand-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Dienstruil ({swaps.length})
        </button>
      </div>

      {tab === 'leave' && (
        <>
          <h2 className="font-medium mb-3">Openstaand</h2>
          {pendingLeaves.length === 0 ? (
            <div className="card text-slate-600 mb-6">Geen openstaande verzoeken.</div>
          ) : (
            <div className="space-y-2 mb-6">
              {pendingLeaves.map((l) => (
                <div key={l.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {l.user.firstName} {l.user.lastName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDate(l.date)}
                      {l.reason && ` — ${l.reason}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => review(l.id, 'APPROVED')} className="btn-primary">
                      Goedkeuren
                    </button>
                    <button onClick={() => review(l.id, 'DENIED')} className="btn-secondary">
                      Afwijzen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="font-medium mb-3">Beoordeeld</h2>
          {reviewedLeaves.length === 0 ? (
            <div className="card text-slate-600">Nog geen beoordeelde verzoeken.</div>
          ) : (
            <div className="space-y-2">
              {reviewedLeaves.slice(0, 20).map((l) => (
                <div key={l.id} className="card flex items-center justify-between text-sm">
                  <div>
                    <p>
                      {l.user.firstName} {l.user.lastName} — {formatDate(l.date)}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      l.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {l.status === 'APPROVED' ? 'Goedgekeurd' : 'Afgewezen'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'swaps' && (
        <>
          {swaps.length === 0 ? (
            <div className="card text-slate-600">Geen dienstruil-verzoeken.</div>
          ) : (
            <div className="space-y-2">
              {swaps.map((s) => (
                <div key={s.id} className="card">
                  <p className="text-sm">
                    <span className="font-medium">
                      {s.requester.firstName} {s.requester.lastName}
                    </span>{' '}
                    →{' '}
                    <span className="font-medium">
                      {s.target.firstName} {s.target.lastName}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(s.scheduleEntry.date)} dienst {s.scheduleEntry.shift.name} —{' '}
                    <span
                      className={`ml-1 text-xs px-2 py-0.5 rounded ${
                        s.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : s.status === 'ACCEPTED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
