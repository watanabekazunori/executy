// Database connection for Neon
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// 環境変数からNeon接続文字列を取得
const sql = neon(process.env.DATABASE_URL!);

// @ts-ignore - Neon type compatibility issue
export const db = drizzle(sql, { schema });

export * from './schema';
