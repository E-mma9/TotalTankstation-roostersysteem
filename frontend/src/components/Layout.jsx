import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { notificationsApi } from '../api/resources';

export default function Layout() {
  const navigate = useNavigate();
  const { user, clear } = useAuthStore();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const isManager = user?.role === 'MANAGER';

  useEffect(() => {
    const load = () => {
      notificationsApi
        .list()
        .then((items) => setUnread(items.filter((n) => !n.isRead).length))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {}
    clear();
    navigate('/login');
  }

  const employeeLinks = [
    { to: '/dashboard', label: 'Mijn rooster' },
    { to: '/dashboard/collegas', label: "Collega's" },
    { to: '/beschikbaarheid', label: 'Beschikbaarheid' },
    { to: '/vrije-dagen', label: 'Vrije dagen' },
    { to: '/dienstruil', label: 'Dienstruil' },
  ];
  const managerLinks = [
    { to: '/manager/rooster', label: 'Rooster' },
    { to: '/manager/medewerkers', label: 'Medewerkers' },
    { to: '/manager/verzoeken', label: 'Verzoeken' },
  ];

  const linkClass = ({ isActive }) =>
    `block px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-slate-700"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              ☰
            </button>
            <span className="text-lg font-semibold text-brand-700">Total Tankstation</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {employeeLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass} end={l.to === '/dashboard'}>
                {l.label}
              </NavLink>
            ))}
            {isManager && (
              <>
                <span className="mx-2 h-6 w-px bg-slate-200" />
                {managerLinks.map((l) => (
                  <NavLink key={l.to} to={l.to} className={linkClass}>
                    {l.label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <NavLink to="/notificaties" className="relative p-2 text-slate-600 hover:text-slate-900">
              🔔
              {unread > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                  {unread}
                </span>
              )}
            </NavLink>
            <span className="hidden sm:inline text-sm text-slate-600">
              {user?.firstName} {user?.lastName}
            </span>
            <button onClick={handleLogout} className="btn-secondary">
              Uitloggen
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t border-slate-200 px-4 py-2 space-y-1">
            {employeeLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={linkClass}
                end={l.to === '/dashboard'}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            {isManager &&
              managerLinks.map((l) => (
                <NavLink key={l.to} to={l.to} className={linkClass} onClick={() => setMenuOpen(false)}>
                  Manager: {l.label}
                </NavLink>
              ))}
          </nav>
        )}
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
