import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
    | string
    | undefined;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.error(
        'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.',
    );
}

export const supabase = createClient<Database>(SUPABASE_URL ?? '', SUPABASE_PUBLISHABLE_KEY ?? '', {
    auth: {
        storage: typeof window === 'undefined' ? undefined : window.localStorage,
        persistSession: true,
        autoRefreshToken: true,
        // We own /auth/callback (when teams add auth) and exchange the code there.
        // Leaving this true would race the manual exchange and consume the PKCE verifier first.
        detectSessionInUrl: false,
        flowType: 'pkce',
    },
});
