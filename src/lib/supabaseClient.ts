import { createClient } from '@supabase/supabase-js';

// Create a typed Supabase client that can be imported anywhere in the app.
// Values are read from the environment at build time. In Vercel, set
// NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the project
// settings. Locally, you can define them in an `.env.local` file.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
