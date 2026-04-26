import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { schedulesApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { currentYearMonth, ymd } from '../utils/date';

const SHIFT_INFO = {
  V: { label: 'Vroege dienst', pill: 'shift-V', border: '#0EA5E9', bg: '#F0F9FF' },
  M: { label: 'Middagdienst',  pill: 'shift-M', border: '#F59E0B', bg: '#FFFBEB' },
  A: { label: 'Avonddienst',   pill: 'shift-A', border: '#8B5CF6', bg: '#F5F3FF' },
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
        <h1 style={{ fontSize: '1.875rem', marginBottom: '0.25rem' }}>
          {greeting()}, {user.firstName}!
        </h1>

        {todayEntry && todayInfo ? (
          <div
            className="inline-flex items-center gap-4 rounded-2xl mt-3"
            style={{
              background: todayInfo.bg,
              borderLeft: `4px solid ${todayInfo.border}`,
              padding: '0.875rem 1.25rem',
              border: `1px solid ${todayInfo.border}30`,
              borderLeftColor: todayInfo.border,
              animation: 'fadeUp 0.35s 0.1s ease both',
              opacity: 0,
            }}
          >
            <span className={`shift-pill ${todayInfo.pill}`} style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
              {todayEntry.shift.name}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#A09890' }}>Vandaag</p>
              <p className="font-bold text-lg" style={{ color: '#1A1916', fontFamily: 'Syne, sans-serif' }}>
                {todayInfo.label} · {todayEntry.shift.startTime}–{todayEntry.shift.endTime}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-base" style={{ color: '#A09890' }}>Je hebt vandaag geen dienst gepland.</p>
        )}
      </div>

      {/* Header rij */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 style={{ fontSize: '1.125rem' }}>Mijn rooster</h2>
        <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="h-3 rounded-full mb-3" style={{ background: '#F0EDE8', width: '40%' }} />
              <div className="h-8 rounded-lg mb-2" style={{ background: '#F0EDE8', width: '30%' }} />
              <div className="h-3 rounded-full mb-4" style={{ background: '#F0EDE8', width: '60%' }} />
              <div className="h-9 rounded-xl" style={{ background: '#F0EDE8' }} />
            </div>
          ))}
        </div>
      ) : !schedule ? (
        <div className="card text-center py-10" style={{ color: '#A09890' }}>
          Voor deze maand is nog geen rooster aangemaakt.
        </div>
      ) : !schedule.publishedAt ? (
        <div className="card text-center py-10" style={{ color: '#A09890' }}>
          Het rooster voor deze maand is nog niet gepubliceerd door de manager.
        </div>
      ) : myEntries.length === 0 ? (
        <div className="card text-center py-10" style={{ color: '#A09890' }}>
          Je bent deze maand niet ingeroosterd.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {myEntries.map((e, idx) => {
            const inf = SHIFT_INFO[e.shift.name];
            const isToday = ymd(e.date) === todayKey;
            return (
              <div
                key={e.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${inf?.border ?? '#E8E3DA'}`,
                  background: isToday ? (inf?.bg ?? '#FFFFFF') : '#FFFFFF',
                  outline: isToday ? `2px solid ${inf?.border ?? '#E8E3DA'}` : 'none',
                  outlineOffset: '2px',
                  transition: 'box-shadow 0.18s ease, transform 0.18s ease',
                  animation: `fadeUp 0.3s ${idx * 40}ms ease both`,
                  opacity: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,25,22,0.10)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.transform = '';
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-0.5 capitalize" style={{ color: '#A09890' }}>
                      {new Date(e.date).toLocaleDateString('nl-NL', { weekday: 'long' })}
                      {isToday && <span className="ml-2 normal-case" style={{ color: '#EA580C' }}>· Vandaag</span>}
                    </p>
                    <p className="tabular-nums" style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, fontFamily: 'Syne, sans-serif', color: '#1A1916' }}>
                      {new Date(e.date).getDate()}
                      <span className="text-base font-normal ml-1.5" style={{ color: '#A09890' }}>
                        {new Date(e.date).toLocaleDateString('nl-NL', { month: 'long' })}
                      </span>
                    </p>
                  </div>
                  {inf && <span className={`shift-pill ${inf.pill}`}>{e.shift.name}</span>}
                </div>

                <p className="text-sm font-semibold mb-0.5" style={{ color: '#766F65' }}>{inf?.label ?? e.shift.name}</p>
                <p className="font-bold tabular-nums mb-3" style={{ fontSize: '1.25rem', color: '#1A1916' }}>
                  {e.shift.startTime} – {e.shift.endTime}
                </p>

                {e.status !== 'WERKEND' && (
                  <p className="text-xs rounded-lg px-3 py-1.5 mb-3 font-medium"
                     style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D40' }}>
                    Status: {e.status.toLowerCase()}
                  </p>
                )}

                <Link to={`/dienstruil?entry=${e.id}`} className="btn-secondary text-sm w-full text-center"
                      style={{ justifyContent: 'center' }}>
                  Dienst aanbieden
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Link to="/dashboard/collegas"
              className="text-sm font-semibold transition-colors"
              style={{ color: '#EA580C' }}
              onMouseOver={(e) => e.target.style.color = '#C2410C'}
              onMouseOut={(e) => e.target.style.color = '#EA580C'}>
          Bekijk wie er wanneer werkt →
        </Link>
      </div>
    </div>
  );
}
