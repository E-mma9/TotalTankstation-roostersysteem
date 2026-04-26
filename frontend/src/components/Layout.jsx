import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { notificationsApi } from '../api/resources';

export default function Layout() {
  const navigate = useNavigate();
  const { user, clear, unreadCount, setUnreadCount } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const isManager = user?.role === 'MANAGER';

  useEffect(() => {
    const load = () => {
      notificationsApi
        .list()
        .then((items) => setUnreadCount(items.filter((n) => !n.isRead).length))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
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
    { to: '/manager/beschikbaarheid', label: 'Beschikbaarheid' },
  ];

  const linkClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-[4.5rem]">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                T
              </div>
              <div className="hidden sm:block">
                <div className="text-base font-bold text-slate-900 leading-tight">Total Tankstation</div>
                <div className="text-xs text-slate-500 leading-tight">Roostersysteem</div>
              </div>
            </div>
          </div>
          <nav className="hidden lg:flex items-center gap-1">
            {employeeLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass} end={l.to === '/dashboard'}>
                {l.label}
              </NavLink>
            ))}
            {isManager && (
              <>
                <span className="mx-3 h-7 w-px bg-slate-200" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">Manager</span>
                {managerLinks.map((l) => (
                  <NavLink key={l.to} to={l.to} className={linkClass}>
                    {l.label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <NavLink
              to="/notificaties"
              className="relative p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Notificaties"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] rounded-full min-w-[1.2rem] h-[1.2rem] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </NavLink>
            <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div className="text-sm leading-tight">
                <div className="font-semibold text-slate-900">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-slate-500">
                  {isManager ? 'Manager' : 'Medewerker'}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-ghost text-sm" aria-label="Uitloggen">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Uitloggen</span>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="lg:hidden border-t border-slate-200 px-4 py-3 space-y-1 bg-white">
            <p className="text-xs uppercase tracking-wide text-slate-400 px-3 py-1">Medewerker</p>
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
            {isManager && (
              <>
                <p className="text-xs uppercase tracking-wide text-slate-400 px-3 py-1 mt-3">Manager</p>
                {managerLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={linkClass}
                    onClick={() => setMenuOpen(false)}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>
        )}
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
