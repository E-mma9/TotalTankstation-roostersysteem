import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { schedulesApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { currentYearMonth, ymd } from '../utils/date';

const SHIFT_INFO = {
  V: { label: 'Vroege dienst', color: 'border-sky-400 bg-sky-50',   pill: 'shift-V' },
  M: { label: 'Middagdienst',  color: 'border-amber-400 bg-amber-50', pill: 'shift-M' },
  A: { label: 'Avonddienst',   color: 'border-violet-400 bg-violet-50', pill: 'shift-A' },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

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

  const todayKey = ymd(new Date());
  const todayEntry = myEntries.find((e) => ymd(e.date) === todayKey);

  return (
    <div>
      {/* Begroeting */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          {greeting()}, {user.firstName}!
        </h1>
        {todayEntry ? (
          <div className={`mt-3 inline-flex items-center gap-3 rounded-2xl border-l-4 px-5 py-3 ${SHIFT_INFO[todayEntry.shift.name]?.color ?? 'border-slate-300 bg-white'}`}>
            <span className={`shift-pill ${SHIFT_INFO[todayEntry.shift.name]?.pill ?? ''} text-base px-3 py-1.5`}>
              {todayEntry.shift.name}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-600">Vandaag</p>
              <p className="text-lg font-bold text-slate-900">
                {SHIFT_INFO[todayEntry.shift.name]?.label} · {todayEntry.shift.startTime}–{todayEntry.shift.endTime}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-slate-500 text-base">Je hebt vandaag geen dienst gepland.</p>
        )}
      </div>

      {/* Maandkiezer */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-semibold text-slate-800">Mijn rooster</h2>
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
          {myEntries.map((e) => {
            const info = SHIFT_INFO[e.shift.name];
            const isToday = ymd(e.date) === todayKey;
            return (
              <div
                key={e.id}
                className={`card border-l-4 hover:shadow-md transition-shadow ${info?.color ?? 'border-slate-300'} ${isToday ? 'ring-2 ring-brand-400' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-slate-500 capitalize">
                      {new Date(e.date).toLocaleDateString('nl-NL', { weekday: 'long' })}
                      {isToday && <span className="ml-2 text-brand-600 font-semibold">· Vandaag</span>}
                    </p>
                    <p className="text-3xl font-bold tabular-nums leading-tight">
                      {new Date(e.date).getDate()}{' '}
                      <span className="text-base font-normal text-slate-500">
                        {new Date(e.date).toLocaleDateString('nl-NL', { month: 'long' })}
                      </span>
                    </p>
                  </div>
                  <span className={`shift-pill ${info?.pill ?? ''}`}>{e.shift.name}</span>
                </div>

                <p className="text-base font-semibold text-slate-700 mb-0.5">
                  {info?.label ?? e.shift.name}
                </p>
                <p className="text-xl font-bold tabular-nums text-slate-800 mb-3">
                  {e.shift.startTime} – {e.shift.endTime}
                </p>

                {e.status !== 'WERKEND' && (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 mb-3">
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
            );
          })}
        </div>
      )}

      <div className="mt-6 flex gap-4">
        <Link to="/dashboard/collegas" className="text-brand-600 hover:underline text-base font-medium">
          Bekijk wie er wanneer werkt →
        </Link>
      </div>
    </div>
  );
}
