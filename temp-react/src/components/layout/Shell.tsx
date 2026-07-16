import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Shell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {title !== undefined && <Topbar title={title} />}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
