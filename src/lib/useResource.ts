import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './product';
export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T>(); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const id = ++sequence.current; setLoading(true); setError('');
    try { const value = await load(); if (id === sequence.current) setData(value); }
    catch (reason) { if (id === sequence.current) setError(errorMessage(reason)); }
    finally { if (id === sequence.current) setLoading(false); }
  }, [load]);
  useEffect(() => { setData(undefined); void reload(); return () => { sequence.current++; }; }, [reload]);
  return { data, error, loading, reload };
}
