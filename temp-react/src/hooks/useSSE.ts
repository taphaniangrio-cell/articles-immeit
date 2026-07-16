import { useEffect, useRef, useCallback } from 'react';

export function useSSE(onDashboardUpdate?: () => void) {
  const retryRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource('/api/events');
    esRef.current = es;

    es.addEventListener('dashboard-updated', () => {
      retryRef.current = 0;
      onDashboardUpdate?.();
    });

    es.onerror = () => {
      es.close();
      retryRef.current = Math.min(retryRef.current + 1, 5);
      const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30000);
      setTimeout(connect, delay);
    };
  }, [onDashboardUpdate]);

  const disconnect = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connect, disconnect };
}
