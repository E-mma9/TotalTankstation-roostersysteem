import { useEffect, useState } from 'react';
import { notificationsApi } from '../api/resources';

export default function Notifications() {
  const [items, setItems] = useState([]);

  function load() {
    notificationsApi.list().then(setItems);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAll() {
    await notificationsApi.markAllRead();
    load();
  }

  async function markOne(id) {
    await notificationsApi.markRead(id);
    load();
  }

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Notificaties</h1>
        {unreadCount > 0 && (
          <button onClick={markAll} className="btn-secondary">
            Alles als gelezen markeren
          </button>
        )}
      </div>

      {unreadCount > 0 && (
        <p className="text-sm text-slate-500 mb-4">
          Je hebt {unreadCount} ongelezen {unreadCount === 1 ? 'bericht' : 'berichten'}. Klik op een bericht om het als gelezen te markeren.
        </p>
      )}

      {items.length === 0 ? (
        <div className="card text-slate-600">Geen notificaties.</div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markOne(n.id)}
              className={`card ${
                n.isRead
                  ? 'opacity-60'
                  : 'border-l-4 border-l-brand-500 cursor-pointer hover:bg-brand-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className={`text-base ${n.isRead ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                  {n.message}
                </p>
                {!n.isRead && (
                  <span className="shrink-0 text-xs bg-brand-600 text-white px-2 py-0.5 rounded-full font-medium">
                    Nieuw
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {new Date(n.createdAt).toLocaleString('nl-NL')}
              </p>
              {!n.isRead && (
                <p className="text-xs text-brand-600 mt-1">Klik om als gelezen te markeren</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
