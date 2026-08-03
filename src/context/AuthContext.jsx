import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAudit } from '../lib/audit';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!supabase);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !user) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) setProfile(data);
  }, [user]);

  useEffect(() => {
    if (supabase && user) refreshProfile();
    else setProfile(null);
  }, [user, refreshProfile]);

  // Live role updates (e.g. an admin promotes you, or you were demoted).
  useEffect(() => {
    if (!supabase || !user) return;
    const channel = supabase
      .channel('profile-role')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => refreshProfile(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [user, refreshProfile]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener?.data?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      await logAudit({ email }, 'auth.login_failed', 'profile', null, { error: error.message, email });
      return error;
    }
    const u = data.user;
    // Report the login in the trail + record last_login_at.
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
    if (prof && prof.disabled) {
      await supabase.auth.signOut();
      await logAudit(prof, 'auth.login_blocked', 'profile', u.id, { email: u.email });
      return { message: 'This account has been disabled. Contact an administrator.' };
    }
    await logAudit(prof, 'auth.login', 'profile', u.id, { email: u.email });
    supabase.rpc('record_login').then(() => {}).catch(() => {});
    return null;
  }, [user]);

  const signUp = useCallback(async (email, password, customFields = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: customFields },
    });
    if (error) {
      await logAudit({ email }, 'auth.signup_failed', 'profile', null, { email, error: error.message });
      return { error, needsConfirmation: false };
    }
    const u = data.user;
    if (u) {
      await logAudit(u, 'auth.signup', 'profile', u.id, { email: u.email });
      supabase
        .rpc('update_own_custom_fields', { p_fields: customFields && typeof customFields === 'object' ? customFields : {} })
        .catch(() => {});
    }
    return { error: error ?? null, needsConfirmation: !!u && !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await logAudit(user, 'auth.logout', 'profile', user?.id);
    await supabase.auth.signOut();
  }, [user]);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return error ?? null;
  }, []);

  const role = profile?.role || 'user';
  const isAdmin = role === 'admin';
  const blocked = !!profile?.disabled;

  const saveOwnCustomFields = useCallback(async (fields) => {
    if (!supabase) return null;
    const { error } = await supabase.rpc('update_own_custom_fields', { p_fields: fields });
    if (!error) setProfile((p) => (p ? { ...p, custom_fields: fields } : p));
    return error ?? null;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        isAdmin,
        blocked,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
        saveOwnCustomFields,
        backend: !!supabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
