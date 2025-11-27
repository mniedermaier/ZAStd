import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Support both Vite build-time env and runtime env injection (for Docker/Koyeb)
const w = window as any;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || w.__ENV__?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || w.__ENV__?.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
