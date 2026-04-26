import { useEffect, useState } from 'react';
import { leaveRequestsApi } from '../api/resources';
import { formatDate } from '../utils/date';

const STATUS = {
  PENDING:  { label: 'In behandeling', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  APPROVED: { label: 'Goedgekeurd',    cls: 'bg-green-50 text-green-700 border border-green-200' },
  DENIED:   { label: 'Afgewezen',      cls: 'bg-red-50 text-red-700 border border-red-200' },
};

export default function LeaveRequests() {
  const [requests, setRequests] = useState([]);
  const [date, setDate]         = useState('');
  const [reason, setReason]     = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  function load() { leaveRequestsApi.list().then(setRequests); }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await leaveRequestsApi.create(date, reason || undefined);
      setDate('');
      setReason('');
      setSuccess('Verzoek ingediend! De manager beoordeelt het zo snel mogelijk.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Indienen mislukt');
    }
  }

  async function handleCancel(id) {
    if (!confirm('Verzoek intrekken?')) return;
    await leaveRequestsApi.cancel(id);
    load();
  }

  const pending  = requests.filter((r) => r.status === 'PENDING');
  const reviewed = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Vrije dag aanvragen</h1>

      {/* Formulier */}
      <div className="card mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Nieuw verzoek indienen</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <label className="label">Reden (optioneel)</label>
              <input
                type="text"
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Bijv. doktersafspraak"
              />
            </div>
          </div>
          {error   && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}
          {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2">{success}</p>}
          <button type="submit" className="btn-primary">Indienen bij manager</button>
        </form>
      </div>

      {/* Openstaande verzoeken */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-slate-700 mb-3">Openstaande verzoeken</h2>
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="card-compact flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{formatDate(r.date)}</p>
                  {r.reason && <p className="text-sm text-slate-500 mt-0.5">{r.reason}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS.PENDING.cls}`}>
                    {STATUS.PENDING.label}
                  </span>
                  <button onClick={() => handleCancel(r.id)} className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
                    Intrekken
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Beoordeelde verzoeken */}
      {reviewed.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-700 mb-3">Eerder ingediend</h2>
          <div className="space-y-2">
            {reviewed.map((r) => {
              const s = STATUS[r.status] ?? STATUS.PENDING;
              return (
                <div key={r.id} className="card-compact flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-800">{formatDate(r.date)}</p>
                    {r.reason && <p className="text-sm text-slate-500 mt-0.5">{r.reason}</p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${s.cls}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div className="card text-center py-10 text-slate-500">
          Je hebt nog geen vrije-dagenverzoeken ingediend.
        </div>
      )}
    </div>
  );
}
