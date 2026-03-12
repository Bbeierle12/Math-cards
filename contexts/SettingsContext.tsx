import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';
import { useAuth } from './AuthContext';
import { getUserSettings, setUserSettings as cloudSetSettings } from '../services/firestoreService';

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
  const { user } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSyncedRef = useRef(false);

  // On login, load cloud settings
  useEffect(() => {
    if (!user) {
      hasSyncedRef.current = false;
      return;
    }
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    getUserSettings(user.id).then(cloudSettings => {
      if (cloudSettings && Object.keys(cloudSettings).length > 0) {
        setRawSettings(cloudSettings);
      } else {
        // Upload local settings to cloud
        cloudSetSettings(user.id, rawSettings).catch(console.error);
      }
    }).catch(console.error);
  }, [user]);

  const settings = deepMergeSettings(rawSettings, DEFAULT_SETTINGS);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setRawSettings(prev => {
      const next = { ...prev, ...partial };

      // Debounced Supabase write
      if (user) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          cloudSetSettings(user.id, next).catch(console.error);
        }, 1500);
      }

      return next;
    });
  }, [setRawSettings, user]);

  const resetSettings = useCallback(() => {
    setRawSettings({});
    if (user) {
      cloudSetSettings(user.id, {}).catch(console.error);
    }
  }, [setRawSettings, user]);

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
