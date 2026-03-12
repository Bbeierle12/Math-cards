import { supabase } from '../supabase';
import { UserProfile, UserProgress, UserSettings } from '../types';

// --- Mapping helpers (Supabase snake_case <-> app camelCase) ---

interface ProfileRow {
  uid: string;
  display_name: string;
  email: string;
  photo_url: string | null;
  created_at: number;
  last_login_at: number;
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    uid: row.uid,
    displayName: row.display_name,
    email: row.email,
    photoURL: row.photo_url,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

function profileToRow(p: UserProfile): ProfileRow {
  return {
    uid: p.uid,
    display_name: p.displayName,
    email: p.email,
    photo_url: p.photoURL,
    created_at: p.createdAt,
    last_login_at: p.lastLoginAt,
  };
}

// --- User Profile ---

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('uid', uid)
    .single();
  if (error || !data) return null;
  return rowToProfile(data as ProfileRow);
}

export async function setUserProfile(uid: string, profile: UserProfile): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(profileToRow(profile), { onConflict: 'uid' });
  if (error) throw error;
}

export async function updateUserProfile(uid: string, partial: Partial<UserProfile>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (partial.displayName !== undefined) row.display_name = partial.displayName;
  if (partial.email !== undefined) row.email = partial.email;
  if (partial.photoURL !== undefined) row.photo_url = partial.photoURL;
  if (partial.createdAt !== undefined) row.created_at = partial.createdAt;
  if (partial.lastLoginAt !== undefined) row.last_login_at = partial.lastLoginAt;

  const { error } = await supabase
    .from('profiles')
    .update(row)
    .eq('uid', uid);
  if (error) throw error;
}

// --- User Progress ---

export async function getUserProgress(uid: string): Promise<UserProgress | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('data')
    .eq('uid', uid)
    .single();
  if (error || !data) return null;
  return data.data as UserProgress;
}

export async function setUserProgress(uid: string, progress: UserProgress): Promise<void> {
  const { error } = await supabase
    .from('user_progress')
    .upsert({ uid, data: progress }, { onConflict: 'uid' });
  if (error) throw error;
}

// --- User Settings ---

export async function getUserSettings(uid: string): Promise<Partial<UserSettings> | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('data')
    .eq('uid', uid)
    .single();
  if (error || !data) return null;
  return data.data as Partial<UserSettings>;
}

export async function setUserSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({ uid, data: settings }, { onConflict: 'uid' });
  if (error) throw error;
}

// --- Sync ---

export async function syncLocalDataToFirestore(
  uid: string,
  localProgress: UserProgress,
  localSettings: Partial<UserSettings>
): Promise<{ progress: UserProgress; settings: Partial<UserSettings> }> {
  const cloudProgress = await getUserProgress(uid);
  const cloudSettings = await getUserSettings(uid);

  let finalProgress: UserProgress;
  let finalSettings: Partial<UserSettings>;

  if (cloudProgress && cloudProgress.totalProblemsAttempted > 0) {
    finalProgress = cloudProgress;
  } else {
    finalProgress = localProgress;
    await setUserProgress(uid, localProgress);
  }

  if (cloudSettings && Object.keys(cloudSettings).length > 0) {
    finalSettings = cloudSettings;
  } else {
    finalSettings = localSettings;
    await setUserSettings(uid, localSettings);
  }

  return { progress: finalProgress, settings: finalSettings };
}
