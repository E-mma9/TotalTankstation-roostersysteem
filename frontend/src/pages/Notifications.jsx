import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/resources';
import { useAuthStore } from '../store/authStore';

const TYPE_CONFIG = {
  SHIFT_REMINDER:         { icon: '⏰', color: 'bg-blue-50 text-blue-700 border border-blue-100',   label: 'Dienstherinnering' },
  LEAVE_REQUEST_NEW:      { icon: '📅', color: 'bg-amber-50 text-amber-700 border border-amber-100', label: 'Verlofverzoek' },
  LEAVE_APPROVED:         { icon: '✅', color: 'bg-green-50 text-green-700 border border-green-100', label: 'Verlof goedgekeurd' },
  LEAVE_DENIED:           { icon: '❌', color: 'bg-red-50 text-red-700 border border-red-100',       label: 'Verlof afgewezen' },
  AVAILABILITY_SUBMITTED: { icon: '📋', color: 'bg-amber-50 text-amber-700 border border-amber-100', label: 'Beschikbaarheid ingediend' },
  AVAILABILITY_APPROVED:  { icon: '✅', color: 'bg-green-50 text-green-700 border border-green-100', label: 'Beschikbaarheid goedgekeurd' },
  AVAILABILITY_DENIED:    { icon: '❌', color: 'bg-red-50 text-red-700 border border-red-100',       label: 'Beschikbaarheid afgewezen' },
  SWAP_REQUEST:           { icon: '🔄', color: 'bg-purple-50 text-purple-700 border border-purple-100', label: 'Dienstruilverzoek' },
  SWAP_ACCEPTED:          { icon: '✅', color: 'bg-green-50 text-green-700 border border-green-100', label: 'Dienstruil geaccepteerd' },
  SWAP_DECLINED:          { icon: '❌', color: 'bg-red-50 text-red-700 border border-red-100',       label: 'Dienstruil afgewezen' },
  SCHEDULE_NOT_PUBLISHED: { icon: '⚠️', color: 'bg-amber-50 text-amber-700 border border-amber-100', label: 'Rooster niet gepubliceerd' },
  SCHEDULE_PUBLISHED:     { icon: '📣', color: 'bg-green-50 text-green-700 border border-green-100',  label: 'Rooster gepubliceerd' },
};

function destinationFor(type, isManager) {
  switch (type) {
    case 'SHIFT_REMINDER':         return '/dashboard';
    case 'LEAVE_REQUEST_NEW':      return isManager ? '/manager/verzoeken' : null;
    case 'LEAVE_APPROVED':
    case 'LEAVE_DENIED':           return '/vrije-dagen';
    case 'AVAILABILITY_SUBMITTED': return isManager ? '/manager/beschikbaarheid' : null;
    case 'AVAILABILITY_APPROVED':
    case 'AVAILABILITY_DENIED':    return '/beschikbaarheid';
    case 'SWAP_REQUEST':
    case 'SWAP_ACCEPTED':
    case 'SWAP_DECLINED':          return '/dienstruil';
    case 'SCHEDULE_NOT_PUBLISHED': return isManager ? '/manager/rooster' : null;
    case 'SCHEDULE_PUBLISHED':     return '/dashboard';
    default:                       return null;
  }
}

function getConfig(type) {
  return TYPE_CONFIG[type] ?? { icon: '🔔', color: 'bg-slate-100 text-slate-600 border border-slate-200', label: 'Melding' };
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
  const { user, setUnreadCount } = useAuthStore();
  const navigate = useNavigate();
  const isManager = user?.role === 'MANAGER';

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

  async function handleClick(n) {
    if (!n.isRead) {
      await notificationsApi.markRead(n.id);
      load();
    }
    const dest = destinationFor(n.type, isManager);
    if (dest) navigate(dest);
  }

  const unreadCount = items.filter((n) => !n.isRead).length;

  const groups = [];
  const seen = new Set();
  items.forEach((n) => {
    const label = timeLabel(n.createdAt);
    if (!seen.has(label)) { seen.add(label); groups.push({ label, items: [] }); }
    groups[groups.length - 1].items.push(n);
  });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificaties</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">
              {unreadCount} ongelezen — klik om te bekijken
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll} className="btn-secondary text-sm">
            Alles als gelezen markeren
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">🔔</p>
          <p className="font-semibold text-slate-700">Geen notificaties</p>
          <p className="text-sm text-slate-500 mt-1">Je bent helemaal bij.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(({ label, items: groupItems }) => (
            <section key={label}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 px-1">
                {label}
              </h2>
              <div className="space-y-2">
                {groupItems.map((n) => {
                  const cfg = getConfig(n.type);
                  const dest = destinationFor(n.type, isManager);
                  const clickable = !n.isRead || !!dest;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`card flex items-start gap-4 transition-all duration-150 ${
                        n.isRead
                          ? 'opacity-50'
                          : 'border-l-4 border-l-brand-600'
                      } ${clickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'}`}
                    >
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base ${cfg.color}`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${n.isRead ? 'text-slate-400' : 'text-slate-500'}`}>
                          {cfg.label}
                        </p>
                        <p className={`text-sm leading-snug ${n.isRead ? 'text-slate-500' : 'text-slate-900 font-medium'}`}>
                          {n.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{formatTime(n.createdAt)}</p>
                      </div>
                      {!n.isRead && dest && (
                        <span className="shrink-0 text-xs text-brand-600 font-semibold mt-1 whitespace-nowrap">
                          Bekijken →
                        </span>
                      )}
                      {!n.isRead && !dest && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-brand-500 mt-2" />
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
