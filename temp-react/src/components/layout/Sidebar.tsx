import { useStore } from '../../stores/appStore';
import { LayoutDashboard, FileText, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { key: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { key: 'articles' as const, label: 'Articles', icon: FileText },
];

export function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const view = useStore(s => s.view);
  const setView = useStore(s => s.setView);
  const logout = useStore(s => s.logout);

  return (
    <aside className={cn(
      'flex flex-col shrink-0 h-full border-r border-border bg-surface-elevated transition-all duration-200',
      open ? 'w-56' : 'w-14'
    )}>
      {/* Logo */}
      <div className={cn(
        'h-14 flex items-center gap-3 border-b border-border shrink-0',
        open ? 'px-4' : 'px-3 justify-center'
      )}>
        <img src="/logo-immeit.webp" alt="" className="w-7 h-7 rounded-md shrink-0" />
        {open && (
          <span className="font-semibold text-sm text-text-primary tracking-tight">IMMEIT Hub</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
                open ? 'px-3 py-2' : 'px-0 py-2 justify-center',
                active
                  ? 'bg-primary-50 text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              )}
              title={!open ? item.label : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              {open && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-border space-y-1">
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer',
            open ? 'px-3 py-2' : 'px-0 py-2 justify-center'
          )}
        >
          {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          {open && <span>Réduire</span>}
        </button>
        <button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-3 rounded-lg text-sm text-text-muted hover:text-danger hover:bg-danger-light/50 transition-colors cursor-pointer',
            open ? 'px-3 py-2' : 'px-0 py-2 justify-center'
          )}
          title={!open ? 'Déconnexion' : undefined}
        >
          <LogOut size={18} />
          {open && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
