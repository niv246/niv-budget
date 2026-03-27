import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Settings, Landmark } from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'דשבורד' },
  { to: '/expenses', icon: Receipt, label: 'הוצאות' },
  { to: '/loan', icon: Landmark, label: 'הלוואה' },
  { to: '/settings', icon: Settings, label: 'הגדרות' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <main className="max-w-lg mx-auto px-4 py-4">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 safe-area-pb">
        <div className="max-w-lg mx-auto flex justify-around">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center py-2 px-4 text-xs transition-colors',
                  isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200',
                )
              }
            >
              <item.icon size={20} />
              <span className="mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
