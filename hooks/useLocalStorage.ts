import { useState, useEffect, useCallback, useRef, SetStateAction } from 'react';

/**
 * Persisted state. `sanitize` (optional) turns whatever JSON was stored into
 * a well-formed T — valid JSON of the wrong shape must never reach render.
 */
function useLocalStorage<T,>(
  key: string,
  initialValue: T,
  sanitize?: (raw: unknown) => T,
): [T, (value: SetStateAction<T>) => void] {
  const sanitizeRef = useRef(sanitize);
  sanitizeRef.current = sanitize;

  const read = useCallback((serialized: string | null): T => {
    if (serialized === null || serialized === '') return initialValue;
    try {
      const parsed: unknown = JSON.parse(serialized);
      return sanitizeRef.current ? sanitizeRef.current(parsed) : (parsed as T);
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  }, [initialValue]);

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      return read(window.localStorage.getItem(key));
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: SetStateAction<T>) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        setStoredValue(read(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, read]);

  return [storedValue, setValue];
}

export default useLocalStorage;
