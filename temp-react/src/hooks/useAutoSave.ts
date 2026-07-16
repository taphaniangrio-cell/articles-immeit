import { useEffect, useRef } from 'react';

export function useAutoSave(saveFn: () => Promise<void>, isDirty: boolean, editingId: number | null, delay = 3000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty || !editingId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveFn, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isDirty, editingId, saveFn, delay]);

  return timerRef;
}
