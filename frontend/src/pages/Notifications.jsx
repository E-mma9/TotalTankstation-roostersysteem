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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Notificaties</h1>
        {items.some((n) => !n.isRead) && (
          <button onClick={markAll} className="btn-secondary">
            Alles als gelezen
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card text-slate-600">Geen notificaties.</div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && markOne(n.id)}
              className={`card w-full text-left ${n.isRead ? '' : 'border-brand-300 bg-brand-50'}`}
            >
              <p className="text-sm">{n.message}</p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(n.createdAt).toLocaleString('nl-NL')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
