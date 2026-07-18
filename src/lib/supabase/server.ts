import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { databaseConfig } from '@/config';

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(databaseConfig.supabaseUrl, databaseConfig.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          console.error('There is an issue with supabase server: ', error);
        }
      },
    },
  });
};
