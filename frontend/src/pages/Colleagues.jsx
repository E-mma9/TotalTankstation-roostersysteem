import { useEffect, useMemo, useState } from 'react';
import { schedulesApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { currentYearMonth, formatDay, ymd } from '../utils/date';
import { useAuthStore } from '../store/authStore';

const SHIFT_COLORS = {
  V: 'bg-sky-50 border-sky-200',
  M: 'bg-amber-50 border-amber-200',
  A: 'bg-violet-50 border-violet-200',
};

export default function Colleagues() {
  const { user } = useAuthStore();
  const [{ year, month }, setYM] = useState(currentYearMonth());
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    schedulesApi
      .get(year, month)
      .then(setSchedule)
      .catch(() => setSchedule(null))
      .finally(() => setLoading(false));
  }, [year, month]);

  const grouped = useMemo(() => {
    const map = {};
    (schedule?.entries || []).forEach((e) => {
      const key = ymd(e.date);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [schedule]);

  const todayKey = ymd(new Date());

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Wie werkt wanneer</h1>
        <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-32 mb-3" />
              <div className="space-y-2">
                <div className="h-9 bg-slate-100 rounded-lg" />
                <div className="h-9 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : !schedule?.publishedAt ? (
        <div className="card text-center py-10 text-slate-500">
          Het rooster is nog niet gepubliceerd door de manager.
        </div>
      ) : grouped.length === 0 ? (
        <div className="card text-center py-10 text-slate-500">
          Geen diensten ingeroosterd deze maand.
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([date, entries]) => {
            const isToday = date === todayKey;
            return (
              <div
                key={date}
                className={`card-compact ${isToday ? 'border-brand-200 ring-2 ring-brand-100' : ''}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <p className="font-semibold text-slate-800">{formatDay(date)}</p>
                  {isToday && (
                    <span className="text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                      Vandaag
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {entries
                    .sort((a, b) => a.shift.startTime.localeCompare(b.shift.startTime))
                    .map((e) => {
                      const isMe = e.userId === user.id;
                      return (
                        <div
                          key={e.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                            isMe
                              ? 'bg-brand-50 border-brand-200'
                              : (SHIFT_COLORS[e.shift.name] ?? 'bg-slate-50 border-slate-100')
                          }`}
                        >
                          <span className={`shift-pill shift-${e.shift.name} shrink-0`}>{e.shift.name}</span>
                          <span className="text-xs text-slate-500 tabular-nums w-24 shrink-0">
                            {e.shift.startTime}–{e.shift.endTime}
                          </span>
                          <span className={`text-sm font-medium ${isMe ? 'text-brand-700 font-semibold' : 'text-slate-700'}`}>
                            {isMe ? '🙋 Jij' : `${e.user.firstName} ${e.user.lastName}`}
                            {e.status !== 'WERKEND' && (
                              <span className="ml-2 text-xs text-amber-600">({e.status.toLowerCase()})</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
