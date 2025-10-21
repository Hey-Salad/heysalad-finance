import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import logoUrl from '../../public/logo.svg?url';

const iconClass = 'h-5 w-5';

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
  'Financial Modeling': (
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
      <path d="M4 19h16" />
      <path d="M6 16v-7l4 2 4-6 4 9" />
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
  Agents: (
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
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M2 20v-1a4 4 0 0 1 4-4h4" />
      <path d="M14 20v-1a4 4 0 0 1 4-4h4" />
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
  { label: 'Financial Modeling', path: '/financial-modeling' },
  { label: 'Settings', path: '/settings' },
  { label: 'Agents', path: '/agents' },
  { label: 'Admin', path: '/admin' }
];

const Sidebar = () => (
  <aside className="hidden h-screen w-72 shrink-0 flex-col bg-white px-8 pb-10 pt-2 shadow-sm lg:flex">
    <div className="flex items-center justify-center py-4">
      <img src={logoUrl} alt="HeySalad® logo" className="h-24 w-auto drop-shadow-sm" />
    </div>
    <div className="flex-1">
      <nav className="mt-10 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-slate-600 transition-colors',
                isActive
                  ? 'border-primary/30 bg-white text-slate-900 shadow-sm'
                  : 'hover:border-slate-200 hover:bg-white/80 hover:text-slate-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-slate-500 transition-colors',
                    isActive ? 'border-primary/40 text-primary' : 'border-slate-200 group-hover:border-slate-200'
                  )}
                >
                  {icons[item.label]}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
    <div className="mt-auto flex items-center justify-center rounded-lg bg-slate-50 py-4 text-xs text-slate-400">
      HeySalad® OÜ (17327633) · © 2025
    </div>
  </aside>
);

export default Sidebar;
