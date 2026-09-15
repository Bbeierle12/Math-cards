import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';
import { sanitizeSettings } from '../services/storageValidation';

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const sanitize = (raw: unknown): UserSettings => sanitizeSettings(raw, DEFAULT_SETTINGS);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Stored value is always a complete, shape-validated UserSettings.
  const [settings, setSettings] = useLocalStorage<UserSettings>('userSettings', DEFAULT_SETTINGS, sanitize);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings(prev => sanitize({ ...prev, ...partial }));
  }, [setSettings]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, [setSettings]);

  const value = useMemo(() => ({ settings, updateSettings, resetSettings }), [settings, updateSettings, resetSettings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
