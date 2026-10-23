import { useCallback, useEffect, useRef, useState } from 'react';

import { useAppStore } from '@/store/app-store';

type Result<T> = {
  key: string;
  data: T | null;
  error: string | null;
};

/**
 * Screens read SQLite directly. A shared revision counter marks writes, so
 * every mounted query reloads after any mutation without a server cache.
 */
export function useDbQuery<T>(query: () => Promise<T>, deps: unknown[]) {
  const revision = useAppStore((state) => state.revision);
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const queryRef = useRef(query);
  const requestKey = JSON.stringify([revision, reloadToken, ...deps]);

  useEffect(() => {
    queryRef.current = query;
  });

  useEffect(() => {
    let active = true;

    queryRef
      .current()
      .then((data) => {
        if (active) setResult({ key: requestKey, data, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResult({
          key: requestKey,
          data: null,
          error: error instanceof Error ? error.message : 'Gagal memuat data.',
        });
      });

    return () => {
      active = false;
    };
  }, [requestKey]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);
  const fresh = result?.key === requestKey ? result : null;

  return {
    data: result?.data ?? null,
    loading: fresh === null,
    error: fresh?.error ?? null,
    retry,
  };
}
