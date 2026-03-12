import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Provider } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { UserProfile } from '../types';
import { getUserProfile, setUserProfile, updateUserProfile } from '../services/firestoreService';

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { displayName?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureProfile(user: User): Promise<UserProfile> {
  const existing = await getUserProfile(user.id);
  if (existing) {
    await updateUserProfile(user.id, { lastLoginAt: Date.now() });
    return { ...existing, lastLoginAt: Date.now() };
  }
  const meta = user.user_metadata;
  const profile: UserProfile = {
    uid: user.id,
    displayName: meta?.display_name || meta?.full_name || meta?.name || 'User',
    email: user.email || '',
    photoURL: meta?.avatar_url || null,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };
  await setUserProfile(user.id, profile);
  return profile;
}

async function signInWithOAuth(provider: Provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        ensureProfile(u).then(setUserProfileState).catch(console.error);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        ensureProfile(u).then(setUserProfileState).catch(console.error);
      } else {
        setUserProfileState(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithOAuth('google');
  }, []);

  const signInWithGitHub = useCallback(async () => {
    await signInWithOAuth('github');
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(async (data: { displayName?: string }) => {
    if (!user) return;
    if (data.displayName) {
      await supabase.auth.updateUser({ data: { display_name: data.displayName } });
    }
    await updateUserProfile(user.id, data);
    setUserProfileState(prev => prev ? { ...prev, ...data } : prev);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading,
      signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGitHub, signOut, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
