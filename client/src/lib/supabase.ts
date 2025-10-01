/**
 * Supabase Client for Frontend
 * Provides authentication and database access from the browser
 *
 * Uses VITE_SUPABASE_ANON_KEY (public key with RLS protection)
 */

import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';

// Environment variables (Vite automatically loads from .env.local)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key'
  );
}

/**
 * Supabase client instance
 * Uses anon key which respects Row Level Security policies
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Store session in localStorage by default
    storage: localStorage,
    // Auto-refresh tokens
    autoRefreshToken: true,
    // Persist session across page reloads
    persistSession: true,
    // Detect session from URL hash (OAuth callbacks)
    detectSessionInUrl: true,
  },
});

/**
 * Authentication helpers
 */

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
  username?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Sign up new user
 */
export async function signUp({ email, password, name, username }: SignUpData) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || username,
        username,
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign in existing user
 */
export async function signIn({ email, password }: SignInData) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Request password reset email
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) throw error;
}

/**
 * Update password (when logged in)
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

/**
 * OAuth sign in
 */
export async function signInWithProvider(provider: 'google' | 'github' | 'discord') {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return subscription;
}

/**
 * Database helpers (for comparison sessions)
 */

export interface ComparisonSession {
  id?: string;
  title: string;
  prompt: Record<string, any>;
  models: string[];
  responses: any[];
  winner?: any;
  metadata?: Record<string, any>;
}

/**
 * Create new comparison session
 */
export async function createComparisonSession(session: Omit<ComparisonSession, 'id'>) {
  const { data, error } = await supabase
    .from('comparison_sessions')
    .insert([session])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user's comparison sessions
 */
export async function getUserSessions(limit = 25, cursor?: string) {
  let query = supabase
    .from('comparison_sessions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('updated_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Get single session by ID
 */
export async function getSession(sessionId: string) {
  const { data, error } = await supabase
    .from('comparison_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update comparison session
 */
export async function updateSession(sessionId: string, updates: Partial<ComparisonSession>) {
  const { data, error } = await supabase
    .from('comparison_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete comparison session
 */
export async function deleteSession(sessionId: string) {
  const { error } = await supabase
    .from('comparison_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
}

/**
 * Subscribe to realtime updates for user's sessions
 */
export function subscribeToSessions(
  userId: string,
  callback: (payload: any) => void
) {
  const subscription = supabase
    .channel('comparison_sessions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comparison_sessions',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return subscription;
}

/**
 * Get user profile
 */
export async function getUserProfile(userId?: string) {
  const targetId = userId || (await getCurrentUser())?.id;

  if (!targetId) throw new Error('No user ID provided');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates: {
  name?: string;
  username?: string;
  avatar?: string;
  preferences?: Record<string, any>;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export default supabase;
