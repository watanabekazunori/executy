import { NextRequest, NextResponse } from 'next/server';
import { db, tasks } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET: サブタスク一覧取得（ユーザー別）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subtasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.parentTaskId, params.id), eq(tasks.createdByEmail, session.user.email)));

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return NextResponse.json({ error: 'Failed to fetch subtasks' }, { status: 500 });
  }
}

// POST: サブタスク作成（ユーザー別）
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();

    // 親タスクを取得（自分のタスクのみ）
    const parentTask = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, params.id), eq(tasks.createdByEmail, session.user.email)))
      .then(r => r[0]);

    if (!parentTask) {
      return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
    }

    const result = await db.insert(tasks).values({
      ...data,
      parentTaskId: params.id,
      organizationId: parentTask.organizationId,
      projectId: parentTask.projectId,
      status: 'pending',
      createdByEmail: session.user.email,
    }).returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating subtask:', error);
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 });
  }
}
