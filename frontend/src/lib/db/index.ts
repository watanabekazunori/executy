// Database connection for Supabase (PostgreSQL)
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// 環境変数からSupabase接続文字列を取得
const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { prepare: false });

export const db = drizzle(sql, { schema });

export * from './schema';
