import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { databaseConfig } from '@/config';

const client = postgres(databaseConfig.databaseUrl);
export const db = drizzle(client, { schema });
