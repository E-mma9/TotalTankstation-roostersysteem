import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { schedulesApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { currentYearMonth, ymd } from '../utils/date';

const SHIFT_INFO = {
  V: { label: 'Vroege dienst', pill: 'shift-V', borderColor: '#0EA5E9', bg: '#F0F9FF' },
  M: { label: 'Middagdienst',  pill: 'shift-M', borderColor: '#F59E0B', bg: '#FFFBEB' },
  A: { label: 'Avonddienst',   pill: 'shift-A', borderColor: '#8B5CF6', bg: '#F5F3FF' },
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
  const todayInfo = todayEntry ? SHIFT_INFO[todayEntry.shift.name] : null;

  return (
    <div>
      {/* Begroeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting()}, {user.firstName}!
        </h1>

        {todayEntry && todayInfo ? (
          <div
            className="inline-flex items-center gap-4 rounded-2xl mt-3 px-5 py-4"
            style={{ background: todayInfo.bg, borderLeft: `4px solid ${todayInfo.borderColor}`, border: `1px solid ${todayInfo.borderColor}25`, borderLeftColor: todayInfo.borderColor }}
          >
            <span className={`shift-pill ${todayInfo.pill}`}>{todayEntry.shift.name}</span>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Vandaag werk je</p>
              <p className="text-lg font-bold text-slate-900">
                {todayInfo.label} · {todayEntry.shift.startTime}–{todayEntry.shift.endTime}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-slate-500">Je hebt vandaag geen dienst gepland.</p>
        )}
      </div>

      {/* Maandkiezer */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-semibold text-slate-800">Mijn rooster</h2>
        <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-3 rounded mb-3 bg-slate-100" style={{ width: '45%' }} />
              <div className="h-8 rounded mb-2 bg-slate-100" style={{ width: '30%' }} />
              <div className="h-3 rounded mb-4 bg-slate-100" style={{ width: '60%' }} />
              <div className="h-9 rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      ) : !schedule ? (
        <div className="card text-center py-10 text-slate-500">
          Voor deze maand is nog geen rooster aangemaakt.
        </div>
      ) : !schedule.publishedAt ? (
        <div className="card text-center py-10 text-slate-500">
          Het rooster voor deze maand is nog niet gepubliceerd door de manager.
        </div>
      ) : myEntries.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">
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
                className="card border-l-4 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
                style={{
                  borderLeftColor: inf?.borderColor ?? '#CBD5E1',
                  background: isToday ? (inf?.bg ?? '#fff') : '#fff',
                  outline: isToday ? `2px solid ${inf?.borderColor}40` : 'none',
                  outlineOffset: '2px',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide capitalize mb-0.5">
                      {new Date(e.date).toLocaleDateString('nl-NL', { weekday: 'long' })}
                      {isToday && <span className="ml-2 normal-case text-brand-600">· Vandaag</span>}
                    </p>
                    <p className="text-3xl font-bold tabular-nums leading-none text-slate-900">
                      {new Date(e.date).getDate()}
                      <span className="text-base font-normal text-slate-400 ml-1">
                        {new Date(e.date).toLocaleDateString('nl-NL', { month: 'short' })}
                      </span>
                    </p>
                  </div>
                  {inf && <span className={`shift-pill ${inf.pill}`}>{e.shift.name}</span>}
                </div>

                <p className="text-sm font-medium text-slate-600 mb-0.5">{inf?.label ?? e.shift.name}</p>
                <p className="text-xl font-bold tabular-nums text-slate-800 mb-3">
                  {e.shift.startTime} – {e.shift.endTime}
                </p>

                {e.status !== 'WERKEND' && (
                  <p className="text-xs rounded-lg px-3 py-1.5 mb-3 bg-amber-50 text-amber-700 border border-amber-100">
                    Status: {e.status.toLowerCase()}
                  </p>
                )}

                <Link to={`/dienstruil?entry=${e.id}`} className="btn-secondary text-sm w-full justify-center">
                  Dienst aanbieden
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Link to="/dashboard/collegas" className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
          Bekijk wie er wanneer werkt →
        </Link>
      </div>
    </div>
  );
}
