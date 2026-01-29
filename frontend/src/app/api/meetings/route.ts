import { NextRequest, NextResponse } from 'next/server';
import { db, meetings } from '@/lib/db';
import { eq, and, gte, lte, asc } from 'drizzle-orm';

// GET: 打ち合わせ一覧取得
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('organizationId');
  const taskId = searchParams.get('taskId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    // シンプルなクエリ（relationsを使わない）
    const conditions = [];

    if (orgId) {
      conditions.push(eq(meetings.organizationId, orgId));
    }
    if (taskId) {
      conditions.push(eq(meetings.taskId, taskId));
    }
    if (startDate) {
      conditions.push(gte(meetings.startTime, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(meetings.endTime, new Date(endDate)));
    }

    // シンプルなクエリのみ - 関連データは取得しない
    const meetingList = await db
      .select()
      .from(meetings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(meetings.startTime));

    return NextResponse.json(meetingList);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

// POST: 打ち合わせ作成
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await db.insert(meetings).values({
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    }).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
