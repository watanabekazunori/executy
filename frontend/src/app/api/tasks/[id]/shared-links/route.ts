import { NextRequest, NextResponse } from 'next/server';
import { db, sharedLinks } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET: 共有リンク一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await db.query.sharedLinks.findMany({
      where: eq(sharedLinks.taskId, params.id),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching shared links:', error);
    return NextResponse.json({ error: 'Failed to fetch shared links' }, { status: 500 });
  }
}

// POST: 共有リンク追加
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const result = await db.insert(sharedLinks).values({
      taskId: params.id,
      ...data,
    }).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error adding shared link:', error);
    return NextResponse.json({ error: 'Failed to add shared link' }, { status: 500 });
  }
}
