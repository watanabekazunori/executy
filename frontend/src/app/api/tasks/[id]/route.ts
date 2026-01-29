import { NextRequest, NextResponse } from 'next/server';
import { db, tasks } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET: タスク詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, params.id))
      .then(r => r[0]);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// PATCH: タスク更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();

    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // 日付フィールドの変換
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }

    // 完了時刻の設定
    if (data.status === 'completed') {
      updateData.completedAt = new Date();
    } else if (data.status && data.status !== 'completed') {
      updateData.completedAt = null;
    }

    const result = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, params.id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE: タスク削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await db
      .delete(tasks)
      .where(eq(tasks.id, params.id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
