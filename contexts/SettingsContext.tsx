import React, { createContext, useContext, useCallback } from 'react';
import { UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function deepMergeSettings(stored: Partial<UserSettings>, defaults: UserSettings): UserSettings {
  const merged = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof UserSettings)[]) {
    if (key in stored && stored[key] !== undefined && stored[key] !== null) {
      if (key === 'numberRange' && typeof stored[key] === 'object') {
        merged.numberRange = { ...defaults.numberRange, ...(stored[key] as UserSettings['numberRange']) };
      } else {
        (merged as any)[key] = stored[key];
      }
    }
  }
  return merged;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [rawSettings, setRawSettings] = useLocalStorage<Partial<UserSettings>>('userSettings', {});

  const settings = deepMergeSettings(rawSettings, DEFAULT_SETTINGS);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setRawSettings(prev => ({ ...prev, ...partial }));
  }, [setRawSettings]);

  const resetSettings = useCallback(() => {
    setRawSettings({});
  }, [setRawSettings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
