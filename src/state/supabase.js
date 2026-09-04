import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables injected by Vite or Vercel
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

// Warn if they are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase credentials are missing! Make sure your .env file or Vercel Environment Variables are configured correctly with VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY.");
}

// Initialize the Supabase client
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
