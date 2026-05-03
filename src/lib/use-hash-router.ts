import { useState, useEffect, useCallback } from 'react';

export function useHashRouter<T extends string>(defaultView: T): {
  view: T;
  navigate: (next: T) => void;
} {
  const getHashView = (): T => {
    const hash = window.location.hash.slice(1);
    return (hash || defaultView) as T;
  };

  const [view, setView] = useState<T>(getHashView);

  const navigate = useCallback((next: T) => {
    window.location.hash = next;
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setView(getHashView());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = defaultView;
    }
  }, []);

  return { view, navigate };
}
