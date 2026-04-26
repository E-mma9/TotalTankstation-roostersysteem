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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {myEntries.map((e) => (
            <div key={e.id} className="card-compact hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">
                    {new Date(e.date).toLocaleDateString('nl-NL', { weekday: 'long' })}
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {new Date(e.date).getDate()}{' '}
                    <span className="text-sm font-normal text-slate-500">
                      {new Date(e.date).toLocaleDateString('nl-NL', { month: 'long' })}
                    </span>
                  </p>
                </div>
                <span className={`shift-pill shift-${e.shift.name}`}>{e.shift.name}</span>
              </div>
              <p className="text-sm text-slate-600 tabular-nums mb-3">
                {e.shift.startTime} – {e.shift.endTime}
              </p>
              {e.status !== 'WERKEND' && (
                <p className="text-xs text-amber-700 mb-2">Status: {e.status.toLowerCase()}</p>
              )}
              <Link
                to={`/dienstruil?entry=${e.id}`}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Aanbieden aan collega →
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
