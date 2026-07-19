const typeStyles: Record<string, string> = {
  success: 'border-l-green-500 bg-green-50 text-green-800',
  error: 'border-l-red-500 bg-red-50 text-red-800',
  warning: 'border-l-yellow-500 bg-yellow-50 text-yellow-800',
  info: 'border-l-blue-500 bg-blue-50 text-blue-800',
};

export function ToastContainer({ toasts, onRemove }: { toasts: { id: number; message: string; type: string }[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 sm:max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={`border-l-4 p-3 rounded shadow-lg text-sm animate-slide-up ${typeStyles[t.type] || typeStyles.info}`}>
          <div className="flex justify-between items-center gap-2">
            <span>{t.message}</span>
            <button onClick={() => onRemove(t.id)} className="text-current opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
          </div>
        </div>
      ))}
    </div>
  );
}
