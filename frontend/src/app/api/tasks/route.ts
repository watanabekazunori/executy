import { NextRequest, NextResponse } from 'next/server';
import { db, tasks } from '@/lib/db';
import { eq, and, isNull, desc } from 'drizzle-orm';

// GET: タスク一覧取得（シンプル版 - N+1問題を回避）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('organizationId');
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');
  const parentOnly = searchParams.get('parentOnly') === 'true';

  try {
    const conditions = [];

    if (parentOnly) {
      conditions.push(isNull(tasks.parentTaskId));
    }
    if (orgId) {
      conditions.push(eq(tasks.organizationId, orgId));
    }
    if (projectId) {
      conditions.push(eq(tasks.projectId, projectId));
    }
    if (status) {
      conditions.push(eq(tasks.status, status));
    }

    // シンプルなクエリ - 関連データは取得しない
    const taskList = await db
      .select()
      .from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tasks.createdAt));

    return NextResponse.json(taskList);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST: タスク作成
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await db.insert(tasks).values({
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    }).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
