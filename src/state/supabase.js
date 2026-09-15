import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables injected by Vite or Vercel
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || '';

export const isDevPro = import.meta.env.VITE_DEV_PRO === 'true' || import.meta.env.DEV;

// Initialize the real Supabase client
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

// Authentication Helpers
export const loginWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
    });
    return { data, error: error ? error.message : null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const getUserProfile = async (userId) => {
  // If local dev Pro override is active, grant 'pro' tier
  if (isDevPro) {
    const tier = localStorage.getItem('dev_subscription_tier') || 'pro';
    return { profile: { subscription_tier: tier }, error: null };
  }

  try {
    const { data, error } = await supabase
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
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { user: data.user, error: error ? error.message : null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const signupWithEmail = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signUp({
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
