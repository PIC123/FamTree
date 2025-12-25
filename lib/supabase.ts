import { createClient } from '@supabase/supabase-js';

// These should be in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  // Warn only once
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
     console.warn('Missing Supabase Environment Variables. The app will fallback to local demo mode (if implemented) or fail.');
  }
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

