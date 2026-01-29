import { NextRequest, NextResponse } from 'next/server';
import { db, organizations } from '@/lib/db';

// GET: 組織一覧取得（シンプル版）
export async function GET() {
  try {
    // シンプルなクエリのみ
    const orgs = await db.select().from(organizations);
    return NextResponse.json(orgs);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

// POST: 組織作成
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await db.insert(organizations).values(data).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
