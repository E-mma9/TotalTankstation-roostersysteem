import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { schedulesApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { currentYearMonth, ymd } from '../utils/date';

const SHIFT_LABEL = { V: 'Vroege dienst', M: 'Middagdienst', A: 'Avonddienst' };

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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
            <div key={e.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm text-slate-500 capitalize">
                    {new Date(e.date).toLocaleDateString('nl-NL', { weekday: 'long' })}
                  </p>
                  <p className="text-3xl font-bold tabular-nums leading-tight">
                    {new Date(e.date).getDate()}{' '}
                    <span className="text-base font-normal text-slate-500">
                      {new Date(e.date).toLocaleDateString('nl-NL', { month: 'long' })}
                    </span>
                  </p>
                </div>
                <span className={`shift-pill shift-${e.shift.name} text-base px-3 py-1.5`}>
                  {e.shift.name}
                </span>
              </div>

              <p className="text-base font-semibold text-slate-700 mb-0.5">
                {SHIFT_LABEL[e.shift.name] ?? e.shift.name}
              </p>
              <p className="text-xl font-semibold tabular-nums text-slate-800 mb-3">
                {e.shift.startTime} – {e.shift.endTime}
              </p>

              {e.status !== 'WERKEND' && (
                <p className="text-sm text-amber-700 bg-amber-50 rounded px-2 py-1 mb-3">
                  Status: {e.status.toLowerCase()}
                </p>
              )}

              <Link
                to={`/dienstruil?entry=${e.id}`}
                className="btn-secondary text-sm w-full text-center"
              >
                Dienst aanbieden aan collega
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link to="/dashboard/collegas" className="text-brand-600 hover:underline text-base font-medium">
          Bekijk wie er wanneer werkt →
        </Link>
      </div>
    </div>
  );
}
