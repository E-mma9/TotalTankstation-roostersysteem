import { useEffect, useMemo, useState } from 'react';
import { schedulesApi } from '../api/resources';
import MonthSelector from '../components/MonthSelector';
import { currentYearMonth, formatDay, ymd } from '../utils/date';
import { useAuthStore } from '../store/authStore';

export default function Colleagues() {
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

  const grouped = useMemo(() => {
    const map = {};
    (schedule?.entries || []).forEach((e) => {
      const key = ymd(e.date);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [schedule]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Wie werkt wanneer</h1>
        <MonthSelector year={year} month={month} onChange={(y, m) => setYM({ year: y, month: m })} />
      </div>

      {loading ? (
        <p className="text-slate-500">Laden...</p>
      ) : !schedule?.publishedAt ? (
        <div className="card text-slate-600">Het rooster is nog niet gepubliceerd.</div>
      ) : grouped.length === 0 ? (
        <div className="card text-slate-600">Geen diensten ingeroosterd.</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([date, entries]) => (
            <div key={date} className="card-compact">
              <p className="font-semibold mb-3 text-slate-800">{formatDay(date)}</p>
              <div className="space-y-2">
                {entries
                  .sort((a, b) => a.shift.startTime.localeCompare(b.shift.startTime))
                  .map((e) => {
                    const isMe = e.userId === user.id;
                    return (
                      <div
                        key={e.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                          isMe ? 'bg-brand-50 border border-brand-200' : 'bg-slate-50'
                        }`}
                      >
                        <span className={`shift-pill shift-${e.shift.name} w-8`}>{e.shift.name}</span>
                        <span className="text-xs text-slate-500 tabular-nums w-24">
                          {e.shift.startTime}–{e.shift.endTime}
                        </span>
                        <span className={`text-sm ${isMe ? 'font-semibold text-brand-700' : 'text-slate-700'}`}>
                          {isMe ? 'Jij' : `${e.user.firstName} ${e.user.lastName}`}
                          {e.status !== 'WERKEND' && (
                            <span className="ml-2 text-amber-700 text-xs">({e.status.toLowerCase()})</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
