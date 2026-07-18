import { databaseConfig } from '@/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = databaseConfig.supabaseUrl;
const supabaseAnonKey = databaseConfig.supabaseAnonKey;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL is not set');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY is not set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || databaseConfig.supabaseAnonKey
);
