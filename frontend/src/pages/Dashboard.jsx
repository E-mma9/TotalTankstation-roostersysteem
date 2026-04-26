import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { schedulesApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { currentYearMonth, ymd } from '../utils/date';

const SHIFT_INFO = {
  V: { label: 'Vroege dienst', border: 'border-sky-400',    bg: 'bg-sky-50',    pill: 'shift-V' },
  M: { label: 'Middagdienst',  border: 'border-amber-400',  bg: 'bg-amber-50',  pill: 'shift-M' },
  A: { label: 'Avonddienst',   border: 'border-violet-400', bg: 'bg-violet-50', pill: 'shift-A' },
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
  const info = todayEntry ? SHIFT_INFO[todayEntry.shift.name] : null;

  return (
    <div>
      {/* Begroeting + vandaag-banner */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          {greeting()}, {user.firstName}!
        </h1>

        {todayEntry && info ? (
          <div className={`mt-4 inline-flex items-center gap-4 rounded-2xl border-l-4 px-5 py-4 shadow-sm ${info.border} ${info.bg}`}>
            <span className={`shift-pill ${info.pill} text-base px-3 py-1.5`}>
              {todayEntry.shift.name}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-500">Vandaag werk je</p>
              <p className="text-lg font-bold text-slate-900">
                {info.label} &middot; {todayEntry.shift.startTime}–{todayEntry.shift.endTime}
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-24 mb-3" />
              <div className="h-8 bg-slate-100 rounded w-16 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : !schedule ? (
        <div className="card text-slate-500 text-center py-8">
          Voor deze maand is nog geen rooster aangemaakt.
        </div>
      ) : !schedule.publishedAt ? (
        <div className="card text-slate-500 text-center py-8">
          Het rooster voor deze maand is nog niet gepubliceerd door de manager.
        </div>
      ) : myEntries.length === 0 ? (
        <div className="card text-slate-500 text-center py-8">
          Je bent deze maand niet ingeroosterd.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {myEntries.map((e) => {
            const inf = SHIFT_INFO[e.shift.name];
            const isToday = ymd(e.date) === todayKey;
            return (
              <div
                key={e.id}
                className={`card border-l-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  inf ? `${inf.border} ${inf.bg}` : 'border-slate-300'
                } ${isToday ? 'ring-2 ring-brand-500 ring-offset-1' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-slate-500 capitalize">
                      {new Date(e.date).toLocaleDateString('nl-NL', { weekday: 'long' })}
                      {isToday && <span className="ml-2 text-brand-600 font-semibold">· Vandaag</span>}
                    </p>
                    <p className="text-3xl font-bold tabular-nums leading-tight text-slate-900">
                      {new Date(e.date).getDate()}{' '}
                      <span className="text-base font-normal text-slate-500">
                        {new Date(e.date).toLocaleDateString('nl-NL', { month: 'long' })}
                      </span>
                    </p>
                  </div>
                  <span className={`shift-pill ${inf?.pill ?? ''}`}>{e.shift.name}</span>
                </div>

                <p className="text-base font-semibold text-slate-700 mb-0.5">
                  {inf?.label ?? e.shift.name}
                </p>
                <p className="text-xl font-bold tabular-nums text-slate-800 mb-3">
                  {e.shift.startTime} – {e.shift.endTime}
                </p>

                {e.status !== 'WERKEND' && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-3">
                    Status: {e.status.toLowerCase()}
                  </p>
                )}

                <Link to={`/dienstruil?entry=${e.id}`} className="btn-secondary text-sm w-full text-center">
                  Dienst aanbieden aan collega
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Link to="/dashboard/collegas" className="text-brand-600 hover:text-brand-700 hover:underline text-base font-medium transition-colors">
          Bekijk wie er wanneer werkt →
        </Link>
      </div>
    </div>
  );
}
