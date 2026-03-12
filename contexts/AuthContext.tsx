import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Provider } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { UserProfile } from '../types';
import { getUserProfile, setUserProfile, updateUserProfile } from '../services/supabaseService';

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (partial: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function signInWithOAuth(provider: Provider) {
  const { error } = await supabase.auth.signInWithOAuth({ provider });
  if (error) throw error;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);

      if (u) {
        const profile = await getUserProfile(u.id);
        if (profile) {
          setProfile(profile);
        } else {
          const newProfile: Partial<UserProfile> = {
            displayName: u.user_metadata?.display_name || u.user_metadata?.full_name || '',
            email: u.email || '',
            photoURL: u.user_metadata?.avatar_url || '',
          };
          await setUserProfile(u.id, newProfile).catch(console.error);
          setProfile({ uid: u.id, ...newProfile } as UserProfile);
        }
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const handleUpdateProfile = async (partial: Partial<UserProfile>) => {
    if (!user) return;
    await updateUserProfile(user.id, partial);
    if (partial.displayName) {
      await supabase.auth.updateUser({ data: { display_name: partial.displayName } });
    }
    setProfile(prev => prev ? { ...prev, ...partial } : prev);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle: () => signInWithOAuth('google'),
        signInWithGitHub: () => signInWithOAuth('github'),
        signOut,
        updateProfile: handleUpdateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
