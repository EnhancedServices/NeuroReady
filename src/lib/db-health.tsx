import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { checkDbHealth } from './supabase';

export type DbStatus = 'checking' | 'waking' | 'online' | 'offline';

interface DbHealthContextType {
  status: DbStatus;
  retryCount: number;
  lastChecked: Date | null;
  checkNow: () => void;
}

const DbHealthContext = createContext<DbHealthContextType>({
  status: 'checking',
  retryCount: 0,
  lastChecked: null,
  checkNow: () => {},
});

const PRE_WARM_MS = 4 * 60 * 1000;
const RETRY_MS = 6000;
export const MAX_RETRIES = 15;

export function DbHealthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DbStatus>('checking');
  const [retryCount, setRetryCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const mountedRef = useRef(true);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preWarmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const clearPreWarmTimer = () => {
    if (preWarmTimerRef.current) {
      clearInterval(preWarmTimerRef.current);
      preWarmTimerRef.current = null;
    }
  };

  const handleResultRef = useRef<(ok: boolean, fromRetry: boolean) => void>(() => {});

  handleResultRef.current = (ok: boolean, fromRetry: boolean) => {
    if (!mountedRef.current) return;
    setLastChecked(new Date());

    if (ok) {
      retriesRef.current = 0;
      setRetryCount(0);
      setStatus('online');
      clearRetryTimer();
      clearPreWarmTimer();
      preWarmTimerRef.current = setInterval(async () => {
        const healthy = await checkDbHealth();
        handleResultRef.current(healthy, false);
      }, PRE_WARM_MS);
    } else {
      clearPreWarmTimer();
      if (!fromRetry) {
        retriesRef.current = 0;
      }
      retriesRef.current += 1;
      setRetryCount(retriesRef.current);
      if (retriesRef.current >= MAX_RETRIES) {
        setStatus('offline');
      } else {
        setStatus('waking');
        clearRetryTimer();
        retryTimerRef.current = setTimeout(async () => {
          const healthy = await checkDbHealth();
          handleResultRef.current(healthy, true);
        }, RETRY_MS);
      }
    }
  };

  const checkNow = useCallback(async () => {
    clearRetryTimer();
    clearPreWarmTimer();
    retriesRef.current = 0;
    setRetryCount(0);
    setStatus('checking');
    const ok = await checkDbHealth();
    handleResultRef.current(ok, false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      const ok = await checkDbHealth();
      handleResultRef.current(ok, false);
    })();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkNow();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mountedRef.current = false;
      clearRetryTimer();
      clearPreWarmTimer();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkNow]);

  return (
    <DbHealthContext.Provider value={{ status, retryCount, lastChecked, checkNow }}>
      {children}
    </DbHealthContext.Provider>
  );
}

export function useDbHealth() {
  return useContext(DbHealthContext);
}
