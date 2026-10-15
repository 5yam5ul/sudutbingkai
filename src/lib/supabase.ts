import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder')
);

// On server-side (Node.js runtime in API routes), prioritize SUPABASE_SERVICE_ROLE_KEY if set to bypass RLS.
// Browser runtime and fallback uses NEXT_PUBLIC_SUPABASE_ANON_KEY.
const activeSupabaseKey = (typeof window === 'undefined' && supabaseServiceRoleKey)
  ? supabaseServiceRoleKey
  : supabaseAnonKey;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, activeSupabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;
