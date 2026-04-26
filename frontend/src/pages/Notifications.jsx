import { useEffect, useState } from 'react';
import { notificationsApi } from '../api/resources';
import { useAuthStore } from '../store/authStore';

const TYPE_CONFIG = {
  SHIFT_REMINDER:        { icon: '⏰', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  LEAVE_REQUEST_NEW:     { icon: '📅', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  LEAVE_APPROVED:        { icon: '✅', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  LEAVE_DENIED:          { icon: '❌', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  AVAILABILITY_SUBMITTED:{ icon: '📋', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  AVAILABILITY_APPROVED: { icon: '✅', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  AVAILABILITY_DENIED:   { icon: '❌', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  SWAP_REQUEST:          { icon: '🔄', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  SWAP_ACCEPTED:         { icon: '✅', color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  SWAP_DECLINED:         { icon: '❌', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  SCHEDULE_NOT_PUBLISHED:{ icon: '⚠️', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
};

function getConfig(type) {
  return TYPE_CONFIG[type] ?? { icon: '🔔', color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };
}

function timeLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (d >= todayStart) return 'Vandaag';
  if (d >= yesterdayStart) return 'Gisteren';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const { setUnreadCount } = useAuthStore();

  function load() {
    notificationsApi.list().then((data) => {
      setItems(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    });
  }

  useEffect(() => { load(); }, []);

  async function markAll() {
    await notificationsApi.markAllRead();
    load();
  }

  async function markOne(id) {
    await notificationsApi.markRead(id);
    load();
  }

  const unreadCount = items.filter((n) => !n.isRead).length;

  // Groepeer per dag
  const groups = [];
  const seen = new Set();
  items.forEach((n) => {
    const label = timeLabel(n.createdAt);
    if (!seen.has(label)) { seen.add(label); groups.push({ label, items: [] }); }
    groups[groups.length - 1].items.push(n);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Notificaties</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {unreadCount} ongelezen — klik op een bericht om het te markeren
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll} className="btn-secondary">
            Alles gelezen
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card text-slate-500 text-center py-10">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-medium">Geen notificaties</p>
          <p className="text-sm mt-1">Hier verschijnen berichten over je rooster, verzoeken en meer.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ label, items: groupItems }) => (
            <section key={label}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1">
                {label}
              </h2>
              <div className="space-y-2">
                {groupItems.map((n) => {
                  const cfg = getConfig(n.type);
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markOne(n.id)}
                      className={`card flex items-start gap-4 transition-opacity ${
                        n.isRead
                          ? 'opacity-55 cursor-default'
                          : 'border-l-4 border-l-brand-500 cursor-pointer hover:shadow-md'
                      }`}
                    >
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cfg.color}`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-base leading-snug ${n.isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100 font-medium'}`}>
                          {n.message}
                        </p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatTime(n.createdAt)}
                        </p>
                      </div>
                      {!n.isRead && (
                        <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-brand-500 mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
