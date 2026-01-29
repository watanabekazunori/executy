import { NextRequest, NextResponse } from 'next/server';
import { db, tasks } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET: サブタスク一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const subtasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, params.id));

    return NextResponse.json(subtasks);
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return NextResponse.json({ error: 'Failed to fetch subtasks' }, { status: 500 });
  }
}

// POST: サブタスク作成
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // 親タスクを取得
    const parentTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, params.id))
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
    }).returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating subtask:', error);
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 });
  }
}
