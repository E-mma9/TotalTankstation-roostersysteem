import { useEffect, useState } from 'react';
import { leaveRequestsApi } from '../api/resources';
import { formatDate } from '../utils/date';

const STATUS_LABELS = { PENDING: 'In behandeling', APPROVED: 'Goedgekeurd', DENIED: 'Afgewezen' };
const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  DENIED: 'bg-red-100 text-red-800',
};

export default function LeaveRequests() {
  const [requests, setRequests] = useState([]);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function load() {
    leaveRequestsApi.list().then(setRequests);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await leaveRequestsApi.create(date, reason || undefined);
      setDate('');
      setReason('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Opslaan mislukt');
    }
  }

  async function handleCancel(id) {
    if (!confirm('Verzoek intrekken?')) return;
    await leaveRequestsApi.cancel(id);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Vrije dagen</h1>

      <div className="card mb-6">
        <h2 className="font-medium mb-3">Nieuw verzoek</h2>
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-3 gap-3 items-end">
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
          <div className="sm:col-span-1">
            <label className="label">Reden (optioneel)</label>
            <input
              type="text"
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            Indienen
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <h2 className="font-medium mb-3">Mijn verzoeken</h2>
      {requests.length === 0 ? (
        <div className="card text-slate-600">Geen verzoeken.</div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium">{formatDate(r.date)}</p>
                {r.reason && <p className="text-sm text-slate-500">{r.reason}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
                {r.status === 'PENDING' && (
                  <button onClick={() => handleCancel(r.id)} className="text-sm text-red-600 hover:underline">
                    Intrekken
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
