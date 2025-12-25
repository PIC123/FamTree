import { createClient } from '@supabase/supabase-js';

// These should be in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
     console.warn('Missing Supabase Environment Variables.');
  }
}

// Fallback to avoid build crashes if env vars are missing
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseKey || 'placeholder-key';

export const supabase = createClient(url, key);
