import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const typeConfig: Record<string, { icon: React.ReactNode; styles: string }> = {
  success: {
    icon: <CheckCircle size={16} className="text-success" />,
    styles: 'bg-white border border-success/20 text-emerald-800',
  },
  error: {
    icon: <XCircle size={16} className="text-danger" />,
    styles: 'bg-white border border-danger/20 text-red-800',
  },
  warning: {
    icon: <AlertTriangle size={16} className="text-warning" />,
    styles: 'bg-white border border-warning/20 text-amber-800',
  },
  info: {
    icon: <Info size={16} className="text-primary" />,
    styles: 'bg-white border border-primary/20 text-blue-800',
  },
};

export function ToastContainer({ toasts, onRemove }: { toasts: { id: number; message: string; type: string }[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 sm:max-w-sm">
      {toasts.map(t => {
        const config = typeConfig[t.type] || typeConfig.info;
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg shadow-lg text-sm animate-slide-up',
              config.styles
            )}
          >
            {config.icon}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              className="p-0.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
