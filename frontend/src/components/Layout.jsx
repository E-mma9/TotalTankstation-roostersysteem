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
    try { await authApi.logout(); } catch {}
    clear();
    navigate('/login');
  }

  const employeeLinks = [
    { to: '/dashboard',          label: 'Mijn rooster' },
    { to: '/dashboard/collegas', label: "Collega's" },
    { to: '/beschikbaarheid',    label: 'Beschikbaarheid' },
    { to: '/vrije-dagen',        label: 'Vrije dagen' },
    { to: '/dienstruil',         label: 'Dienstruil' },
  ];
  const managerLinks = [
    { to: '/manager/rooster',         label: 'Rooster' },
    { to: '/manager/medewerkers',     label: 'Medewerkers' },
    { to: '/manager/verzoeken',       label: 'Verlof & Dienstruil' },
    { to: '/manager/beschikbaarheid', label: 'Beschikbaarheid medewerkers' },
  ];

  const navLinks = isManager ? managerLinks : employeeLinks;

  const linkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
      isActive
        ? 'bg-slate-900 text-white'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
      isActive
        ? 'bg-slate-900 text-white'
        : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm safe-top safe-x">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {menuOpen
                ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              }
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
                T
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold text-slate-900 leading-tight">Total Tankstation</div>
                <div className="text-xs text-slate-400 leading-tight">Roostersysteem</div>
              </div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 overflow-x-auto">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass} end={l.to === '/dashboard'}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-1.5">
            <NavLink
              to="/notificaties"
              aria-label="Notificaties"
              className={({ isActive }) =>
                `relative p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-brand-600 text-white text-[9px] font-bold rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            <div className="hidden md:flex items-center gap-2.5 pl-3 ml-1 border-l border-slate-200">
              <div className="avatar w-8 h-8 text-xs font-bold shrink-0">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div className="text-sm leading-tight">
                <div className="font-semibold text-slate-900">{user?.firstName} {user?.lastName}</div>
                <div className="text-xs text-slate-400">{isManager ? 'Manager' : 'Medewerker'}</div>
              </div>
            </div>

            <button onClick={handleLogout} className="btn-ghost text-sm ml-1" aria-label="Uitloggen">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Uitloggen</span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="lg:hidden px-3 pt-2 pb-3 space-y-1 border-t border-slate-200 bg-white">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={mobileLinkClass} end={l.to === '/dashboard'} onClick={() => setMenuOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            <div className="pt-2 mt-2 border-t border-slate-100 px-1 flex items-center gap-3">
              <div className="avatar w-9 h-9 text-sm font-bold shrink-0">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div className="text-sm leading-tight">
                <div className="font-semibold text-slate-900">{user?.firstName} {user?.lastName}</div>
                <div className="text-xs text-slate-400">{isManager ? 'Manager' : 'Medewerker'}</div>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 safe-bottom safe-x">
        <Outlet />
      </main>
    </div>
  );
}
