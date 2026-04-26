import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { schedulesApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { currentYearMonth, formatDay, ymd } from '../utils/date';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [{ year, month }, setYM] = useState(currentYearMonth());
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    schedulesApi
      .get(year, month)
      .then(setSchedule)
      .catch(() => setSchedule(null))
      .finally(() => setLoading(false));
  }, [year, month]);

  const myEntries = (schedule?.entries || [])
    .filter((e) => e.userId === user.id)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Mijn rooster</h1>
        <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
      </div>

      {loading ? (
        <p className="text-slate-500">Laden...</p>
      ) : !schedule ? (
        <div className="card text-slate-600">Voor deze maand is nog geen rooster aangemaakt.</div>
      ) : !schedule.publishedAt ? (
        <div className="card text-slate-600">
          Het rooster voor deze maand is nog niet gepubliceerd door de manager.
        </div>
      ) : myEntries.length === 0 ? (
        <div className="card text-slate-600">Je bent deze maand niet ingeroosterd.</div>
      ) : (
        <div className="space-y-2">
          {myEntries.map((e) => (
            <div key={e.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium">{formatDay(e.date)}</p>
                <p className="text-sm text-slate-500">
                  Dienst {e.shift.name} • {e.shift.startTime}–{e.shift.endTime}
                  {e.status !== 'WERKEND' && (
                    <span className="ml-2 text-amber-700">({e.status.toLowerCase()})</span>
                  )}
                </p>
              </div>
              <Link
                to={`/dienstruil?entry=${e.id}`}
                className="text-sm text-brand-600 hover:underline"
              >
                Ruilen?
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link to="/dashboard/collegas" className="text-brand-600 hover:underline text-sm">
          Bekijk collega's per dag →
        </Link>
      </div>
    </div>
  );
}
