import { NextRequest, NextResponse } from 'next/server';
import { db, meetings, organizations } from '@/lib/db';
import { eq, and, gte, lte, asc, inArray } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET: 打ち合わせ一覧取得（ユーザーの組織に紐付くもののみ）
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('organizationId');
  const taskId = searchParams.get('taskId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    // ユーザーの組織IDを取得
    const userOrgs = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.ownerEmail, session.user.email));
    const orgIds = userOrgs.map(o => o.id);
    if (orgIds.length === 0) return NextResponse.json([]);

    const conditions = [inArray(meetings.organizationId, orgIds)];
    if (orgId) conditions.push(eq(meetings.organizationId, orgId));
    if (taskId) conditions.push(eq(meetings.taskId, taskId));
    if (startDate) conditions.push(gte(meetings.startTime, new Date(startDate)));
    if (endDate) conditions.push(lte(meetings.endTime, new Date(endDate)));

    const meetingList = await db
      .select()
      .from(meetings)
      .where(and(...conditions))
      .orderBy(asc(meetings.startTime));

    return NextResponse.json(meetingList);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

// POST: 打ち合わせ作成
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();

    // フィールドホワイトリスト
    const result = await db.insert(meetings).values({
      title: data.title,
      description: data.description || undefined,
      organizationId: data.organizationId,
      taskId: data.taskId || undefined,
      location: data.location || undefined,
      meetingUrl: data.meetingUrl || undefined,
      status: data.status || 'scheduled',
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    }).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
