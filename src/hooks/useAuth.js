import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { syncService, subscribeSyncStatus, getPendingCount } from '../services/syncService';

const DEMO_SESSION_KEY = 'finanzas_auth_session';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);
  const [syncStatus, setSyncStatus] = useState('guest');
  const [pendingCount, setPendingCount] = useState(() => getPendingCount());

  // Live sync status and queue count subscription
  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((status, count) => {
      setPendingCount(count);
      if (isGuest && !user) {
        setSyncStatus('guest');
      } else {
        setSyncStatus(status);
      }
    });
    return unsubscribe;
  }, [isGuest, user]);

  // Initial session recovery
  useEffect(() => {
    async function initAuth() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            setSession(data.session);
            setUser(data.session.user);
            setIsGuest(false);
          } else {
            setIsGuest(true);
          }

          // Listen to auth changes (token refresh, sign in, sign out)
          const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            if (currentSession?.user) {
              setSession(currentSession);
              setUser(currentSession.user);
              setIsGuest(false);
            } else {
              setSession(null);
              setUser(null);
              setIsGuest(true);
            }
          });

          setLoading(false);
          return () => {
            authListener?.subscription?.unsubscribe();
          };
        } else if (!import.meta.env.PROD) {
          // Demo / Mock Mode recovery (solo en desarrollo)
          const stored = localStorage.getItem(DEMO_SESSION_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setUser(parsed.user);
            setSession(parsed.session);
            setIsGuest(false);
          } else {
            setIsGuest(true);
          }
          setLoading(false);
        } else {
          // Producción sin Supabase configurado: modo local / invitado forzado
          localStorage.removeItem(DEMO_SESSION_KEY);
          setUser(null);
          setSession(null);
          setIsGuest(true);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setIsGuest(true);
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  // Sign In
  const signIn = useCallback(async (email, password, { syncLocalData = false, localState = {} } = {}) => {
    setLoading(true);
    try {
      const hasLocalData = Boolean(
        localState?.assets?.length > 0 ||
        localState?.transactions?.length > 0 ||
        localState?.obligations?.length > 0
      );

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.user) {
          setUser(data.user);
          setSession(data.session);
          setIsGuest(false);

          if (syncLocalData && hasLocalData) {
            await syncService.uploadLocalData(data.user.id, localState);
          }
          return { success: true, user: data.user };
        }
      } else if (!import.meta.env.PROD) {
        // Demo sign in (solo en desarrollo)
        const demoId = 'usr_' + btoa(email.toLowerCase()).replace(/=/g, '');
        const demoUser = { id: demoId, email, user_metadata: { name: email.split('@')[0] } };
        const demoSession = { access_token: 'demo-token-' + Date.now(), user: demoUser };

        localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ user: demoUser, session: demoSession }));
        setUser(demoUser);
        setSession(demoSession);
        setIsGuest(false);

        if (syncLocalData && hasLocalData) {
          await syncService.uploadLocalData(demoId, localState);
        }
        return { success: true, user: demoUser };
      } else {
        return {
          success: false,
          error: 'El servicio de sincronización en la nube no está configurado en esta versión. Tus datos se mantienen solo en este teléfono.'
        };
      }
    } catch (err) {
      console.error('Error during sign in:', err);
      return { success: false, error: err.message || 'Error al iniciar sesión' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign Up
  const signUp = useCallback(async (email, password, { syncLocalData = false, localState = {} } = {}) => {
    setLoading(true);
    try {
      const hasLocalData = Boolean(
        localState?.assets?.length > 0 ||
        localState?.transactions?.length > 0 ||
        localState?.obligations?.length > 0
      );

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data?.user) {
          setUser(data.user);
          setSession(data.session);
          setIsGuest(false);

          if (syncLocalData && hasLocalData) {
            await syncService.uploadLocalData(data.user.id, localState);
          }
          return {
            success: true,
            user: data.user,
            needsEmailConfirmation: !data.session
          };
        }
      } else if (!import.meta.env.PROD) {
        // Demo sign up (solo en desarrollo)
        const demoId = 'usr_' + btoa(email.toLowerCase()).replace(/=/g, '');
        const demoUser = { id: demoId, email, user_metadata: { name: email.split('@')[0] } };
        const demoSession = { access_token: 'demo-token-' + Date.now(), user: demoUser };

        localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ user: demoUser, session: demoSession }));
        setUser(demoUser);
        setSession(demoSession);
        setIsGuest(false);

        if (syncLocalData && hasLocalData) {
          await syncService.uploadLocalData(demoId, localState);
        }
        return { success: true, user: demoUser, needsEmailConfirmation: false };
      } else {
        return {
          success: false,
          error: 'El servicio de sincronización en la nube no está configurado en esta versión. Tus datos se mantienen solo en este teléfono.'
        };
      }
    } catch (err) {
      console.error('Error during sign up:', err);
      return { success: false, error: err.message || 'Error al registrar usuario' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign Out
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      setSession(null);
      setIsGuest(true);
      setSyncStatus('guest');
      return { success: true };
    } catch (err) {
      console.error('Error during sign out:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Continue as Guest
  const continueAsGuest = useCallback(() => {
    setUser(null);
    setSession(null);
    setIsGuest(true);
    setSyncStatus('guest');
  }, []);

  return {
    user,
    session,
    loading,
    isGuest,
    syncStatus,
    pendingCount,
    isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    continueAsGuest
  };
}
