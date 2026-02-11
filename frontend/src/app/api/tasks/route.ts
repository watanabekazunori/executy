import { NextRequest, NextResponse } from 'next/server';
import { db, tasks } from '@/lib/db';
import { eq, and, isNull, desc, or } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET: タスク一覧取得（ユーザー別）
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userEmail = session.user.email;
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('organizationId');
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');
  const parentOnly = searchParams.get('parentOnly') === 'true';

  try {
    const conditions = [];

    // ユーザーのメールアドレスでフィルター（createdByEmailフィールドを使用）
    conditions.push(eq(tasks.createdByEmail, userEmail));

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

// POST: タスク作成（ユーザーのメールを保存）
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();

    // フィールドホワイトリスト - 許可されたフィールドのみ使用
    const result = await db.insert(tasks).values({
      title: data.title,
      description: data.description || undefined,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      organizationId: data.organizationId,
      projectId: data.projectId || undefined,
      parentTaskId: data.parentTaskId || undefined,
      estimatedMinutes: data.estimatedMinutes ? Number(data.estimatedMinutes) : undefined,
      sortOrder: data.sortOrder ? Number(data.sortOrder) : 0,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      createdByEmail: session.user.email,
    }).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
