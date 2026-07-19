import { useStore } from '../../stores/appStore';

export function Sidebar() {
  const view = useStore(s => s.view);
  const setView = useStore(s => s.setView);
  const logout = useStore(s => s.logout);

  return (
    <aside className="w-56 bg-[#0D1B2A] text-white flex flex-col shrink-0 max-md:w-14">
      <div className="p-4 flex items-center gap-3 border-b border-white/10 max-md:justify-center max-md:p-3">
        <img src="/logo-immeit.webp" alt="" className="w-8 h-8 rounded" />
        <span className="font-semibold text-sm max-md:hidden">IMMEIT Hub</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {(['articles', 'dashboard'] as const).map(app => (
          <button
            key={app}
            onClick={() => setView(app)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              view === app ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
            } max-md:justify-center max-md:px-2`}
          >
            <span className="text-lg">{app === 'articles' ? '📄' : '📊'}</span>
            <span className="max-md:hidden capitalize">{app === 'articles' ? 'Articles' : 'Dashboard'}</span>
          </button>
        ))}
      </nav>
      <div className="p-2 border-t border-white/10">
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/40 hover:text-white transition-colors max-md:justify-center">
          <span>🚪</span>
          <span className="max-md:hidden">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
