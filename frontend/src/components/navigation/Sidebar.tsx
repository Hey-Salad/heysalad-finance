import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import logoUrl from '../../public/logo.svg?url';

const iconClass = 'h-5 w-5 text-primary';

const icons: Record<string, JSX.Element> = {
  Dashboard: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3 3 9v12h6v-7h6v7h6V9l-9-6z" />
    </svg>
  ),
  Transactions: (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 16h2" />
    </svg>
  ),
  'Financial Statements': (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 4h16v16H4z" />
      <path d="M8 16l3-3 2 2 3-4" />
    </svg>
  ),
  'Runway Calculator': (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12h18M3 6h18M3 18h18" />
      <path d="M7 3v18" />
    </svg>
  ),
  Settings: (
    <svg
      className={iconClass}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
  Admin: (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  )
};

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Transactions', path: '/transactions' },
  { label: 'Financial Statements', path: '/financial-statements' },
  { label: 'Runway Calculator', path: '/runway-calculator' },
  { label: 'Settings', path: '/settings' },
  { label: 'Admin', path: '/admin' }
];

const Sidebar = () => (
  <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
    <div className="px-6 py-12">
      <img src={logoUrl} alt="HeySalad logo" className="h-24 w-24" />
      <nav className="mt-12 space-y-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-2xl px-5 py-3 text-base font-medium transition-all',
                isActive
                  ? 'bg-light-peach text-primary shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              )
            }
          >
            <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-xl bg-light-peach/50 text-primary">
              {icons[item.label]}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
    <div className="mt-auto px-6 pb-6 text-xs text-slate-400">
      HeySalad OÜ (17327633) © 2025
    </div>
  </aside>
);

export default Sidebar;
