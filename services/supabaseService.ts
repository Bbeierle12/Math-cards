import { supabase } from '../supabase';
import { UserProgress, UserProfile } from '../types';

// --- Profiles ---

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  if (error || !data) return null;
  return {
    uid: data.id,
    displayName: data.display_name,
    email: data.email,
    photoURL: data.photo_url,
    createdAt: data.created_at,
    lastLoginAt: data.updated_at,
  };
}

export async function setUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  await supabase.from('profiles').upsert({
    id: uid,
    display_name: profile.displayName ?? null,
    email: profile.email ?? null,
    photo_url: profile.photoURL ?? null,
    updated_at: new Date().toISOString(),
  });
}

export async function updateUserProfile(uid: string, partial: Partial<UserProfile>): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (partial.displayName !== undefined) update.display_name = partial.displayName;
  if (partial.email !== undefined) update.email = partial.email;
  if (partial.photoURL !== undefined) update.photo_url = partial.photoURL;
  await supabase.from('profiles').update(update).eq('id', uid);
}

// --- Progress ---

export async function getUserProgress(uid: string): Promise<UserProgress | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('progress')
    .eq('id', uid)
    .single();
  if (error || !data) return null;
  return data.progress as UserProgress;
}

export async function setUserProgress(uid: string, progress: UserProgress): Promise<void> {
  await supabase.from('user_progress').upsert({
    id: uid,
    progress,
    updated_at: new Date().toISOString(),
  });
}

// --- Settings ---

export async function getUserSettings(uid: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('id', uid)
    .single();
  if (error || !data) return null;
  return data.settings as Record<string, unknown>;
}

export async function setUserSettings(uid: string, settings: Record<string, unknown>): Promise<void> {
  await supabase.from('user_settings').upsert({
    id: uid,
    settings,
    updated_at: new Date().toISOString(),
  });
}
