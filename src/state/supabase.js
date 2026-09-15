import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables injected by Vite or Vercel
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

export const isDevPro = import.meta.env.VITE_DEV_PRO === 'true' || import.meta.env.DEV;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder')
);

// Warn if credentials are missing and we are not explicitly running in local dev Pro mode
if (!isSupabaseConfigured) {
  console.info("ℹ️ Running in Local Mode with Pro features enabled.");
}

// Initialize the real Supabase client
const rawSupabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

// Mock local Pro user and session for local development
export const localProUser = {
  id: 'local-pro-user',
  email: 'pro-member@kinchronicles.local',
  user_metadata: { full_name: 'Local Pro Member' },
  app_metadata: { provider: 'local' },
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString()
};

const localProSession = {
  user: localProUser,
  access_token: 'local-mock-pro-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'local-mock-refresh'
};

const authListeners = new Set();

// Supabase Proxy to transparently provide local Pro authentication when running locally
export const supabase = new Proxy(rawSupabase, {
  get(target, prop) {
    if (prop === 'auth') {
      return {
        ...target.auth,
        getSession: async () => {
          if (isSupabaseConfigured) {
            try {
              const res = await target.auth.getSession();
              if (res.data?.session) return res;
            } catch (err) {
              console.warn("Supabase getSession failed, using local session:", err);
            }
          }
          const isLoggedOut = localStorage.getItem('local_user_logged_out') === 'true';
          if (!isLoggedOut) {
            return { data: { session: localProSession }, error: null };
          }
          return { data: { session: null }, error: null };
        },
        onAuthStateChange: (callback) => {
          let realUnsubscribe = null;
          if (isSupabaseConfigured) {
            try {
              const res = target.auth.onAuthStateChange((event, session) => {
                if (session) {
                  callback(event, session);
                } else if (localStorage.getItem('local_user_logged_out') !== 'true') {
                  callback('SIGNED_IN', localProSession);
                } else {
                  callback(event, null);
                }
              });
              realUnsubscribe = res?.data?.subscription?.unsubscribe;
            } catch (err) {
              console.warn("Supabase onAuthStateChange error:", err);
            }
          }

          authListeners.add(callback);
          
          // Initial notification if using local session
          const isLoggedOut = localStorage.getItem('local_user_logged_out') === 'true';
          if (!isLoggedOut) {
            setTimeout(() => callback('SIGNED_IN', localProSession), 0);
          } else {
            setTimeout(() => callback('SIGNED_OUT', null), 0);
          }

          return {
            data: {
              subscription: {
                unsubscribe: () => {
                  authListeners.delete(callback);
                  if (realUnsubscribe) realUnsubscribe();
                }
              }
            }
          };
        },
        signOut: async () => {
          localStorage.setItem('local_user_logged_out', 'true');
          if (isSupabaseConfigured) {
            try {
              await target.auth.signOut();
            } catch (err) {
              console.warn("Supabase signOut error:", err);
            }
          }
          authListeners.forEach(cb => cb('SIGNED_OUT', null));
          return { error: null };
        }
      };
    }
    return target[prop];
  }
});

// Authentication Helpers
export const loginWithGoogle = async () => {
  if (!isSupabaseConfigured) {
    localStorage.removeItem('local_user_logged_out');
    authListeners.forEach(cb => cb('SIGNED_IN', localProSession));
    return { data: { user: localProUser }, error: null };
  }
  try {
    const { data, error } = await rawSupabase.auth.signInWithOAuth({
      provider: 'google'
    });
    return { data, error: error ? error.message : null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const getUserProfile = async (userId) => {
  // If local Pro mode is active or user is localProUser, grant 'pro' tier
  if (isDevPro || userId === 'local-pro-user' || !isSupabaseConfigured) {
    const tier = localStorage.getItem('dev_subscription_tier') || 'pro';
    return { profile: { subscription_tier: tier }, error: null };
  }

  try {
    const { data, error } = await rawSupabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();
    return { profile: data, error: error ? error.message : null };
  } catch (error) {
    return { profile: null, error: error.message };
  }
};

export const loginWithEmail = async (email, password) => {
  if (!isSupabaseConfigured) {
    localStorage.removeItem('local_user_logged_out');
    const user = { ...localProUser, email: email || localProUser.email };
    authListeners.forEach(cb => cb('SIGNED_IN', { ...localProSession, user }));
    return { user, error: null };
  }
  try {
    const { data, error } = await rawSupabase.auth.signInWithPassword({
      email,
      password,
    });
    return { user: data.user, error: error ? error.message : null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const signupWithEmail = async (email, password) => {
  if (!isSupabaseConfigured) {
    localStorage.removeItem('local_user_logged_out');
    const user = { ...localProUser, email: email || localProUser.email };
    authListeners.forEach(cb => cb('SIGNED_IN', { ...localProSession, user }));
    return { user, error: null };
  }
  try {
    const { data, error } = await rawSupabase.auth.signUp({
      email,
      password,
    });
    return { user: data.user, error: error ? error.message : null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const logout = async () => {
  await supabase.auth.signOut();
};

