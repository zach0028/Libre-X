/**
 * Supabase Authentication Hook
 * Drop-in replacement for existing auth system
 * Compatible with existing AuthContext
 */

import { useState, useEffect, useCallback } from 'react';
import {
  supabase,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getSession,
  onAuthStateChange,
  type SignUpData,
  type SignInData,
} from '~/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface UseSupabaseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (data: SignInData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const session = await getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (err: any) {
        console.error('[useSupabaseAuth] Init error:', err);
        setError(err.message || 'Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const subscription = onAuthStateChange((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Store token for API calls
      if (session?.access_token) {
        localStorage.setItem('auth_token', session.access_token);
      } else {
        localStorage.removeItem('auth_token');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign up handler
  const handleSignUp = useCallback(async (data: SignUpData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await signUp(data);
      // Session will be set via onAuthStateChange
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign in handler
  const handleSignIn = useCallback(async (data: SignInData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await signIn(data);
      // Session will be set via onAuthStateChange
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await signOut();
      setUser(null);
      setSession(null);
      localStorage.removeItem('auth_token');
    } catch (err: any) {
      setError(err.message || 'Sign out failed');
      console.error('[useSupabaseAuth] Sign out error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh session handler
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.access_token) {
        localStorage.setItem('auth_token', data.session.access_token);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh session');
      console.error('[useSupabaseAuth] Refresh error:', err);
    }
  }, []);

  // Clear error handler
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated: !!user,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refreshSession,
    clearError,
  };
}
