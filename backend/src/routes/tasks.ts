import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db, tasks, sharedLinks } from '../db';
import { eq, and, isNull, desc } from 'drizzle-orm';

export const tasksRoutes = new Hono();

// タスク一覧取得
tasksRoutes.get('/', async (c) => {
  const orgId = c.req.query('organizationId');
  const projectId = c.req.query('projectId');
  const status = c.req.query('status');
  const parentOnly = c.req.query('parentOnly') === 'true';

  try {
    // 親タスクのみ取得（小タスクは含めない）
    let conditions = [];

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

    const result = await db.query.tasks.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        subtasks: {
          orderBy: [tasks.sortOrder],
        },
        project: true,
        organization: true,
        assignee: true,
        meetings: true,
        sharedLinks: true,
      },
      orderBy: [desc(tasks.createdAt)],
    });

    return c.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});

// タスク詳細取得
tasksRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        subtasks: {
          orderBy: [tasks.sortOrder],
        },
        project: true,
        organization: true,
        assignee: true,
        meetings: {
          with: {
            participants: true,
            notes: true,
          },
        },
        sharedLinks: true,
      },
    });

    if (!result) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(result);
  } catch (error) {
    console.error('Error fetching task:', error);
    return c.json({ error: 'Failed to fetch task' }, 500);
  }
});

// タスク作成
const createTaskSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(), // 小タスクの場合
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  assignedTo: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().optional(),
  sortOrder: z.number().int().optional(),
});

tasksRoutes.post('/', zValidator('json', createTaskSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const result = await db.insert(tasks).values({
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    }).returning();
    return c.json(result[0], 201);
  } catch (error) {
    console.error('Error creating task:', error);
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

// タスク更新
const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedMinutes: z.number().int().nullable().optional(),
  actualMinutes: z.number().int().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

tasksRoutes.patch('/:id', zValidator('json', updateTaskSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');

  try {
    // 完了時は completedAt を設定
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    if (data.status === 'completed') {
      updateData.completedAt = new Date();
    } else if (data.status) {
      updateData.completedAt = null;
    }

    const result = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    return c.json({ error: 'Failed to update task' }, 500);
  }
});

// タスク削除
tasksRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return c.json({ error: 'Failed to delete task' }, 500);
  }
});

// サブタスク一覧取得
tasksRoutes.get('/:id/subtasks', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await db.query.tasks.findMany({
      where: eq(tasks.parentTaskId, id),
      orderBy: [tasks.sortOrder],
    });
    return c.json(result);
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return c.json({ error: 'Failed to fetch subtasks' }, 500);
  }
});

// 共有リンク追加
const addSharedLinkSchema = z.object({
  title: z.string().min(1).max(255),
  url: z.string().url(),
  linkType: z.enum(['google_drive', 'dropbox', 'notion', 'other']).optional(),
  fileType: z.enum(['folder', 'spreadsheet', 'document', 'presentation', 'pdf']).optional(),
  permission: z.enum(['view', 'edit']).optional().default('view'),
  createdBy: z.string().uuid().optional(),
});

tasksRoutes.post('/:id/shared-links', zValidator('json', addSharedLinkSchema), async (c) => {
  const taskId = c.req.param('id');
  const data = c.req.valid('json');

  try {
    const result = await db.insert(sharedLinks).values({
      taskId,
      ...data,
    }).returning();
    return c.json(result[0], 201);
  } catch (error) {
    console.error('Error adding shared link:', error);
    return c.json({ error: 'Failed to add shared link' }, 500);
  }
});

// 共有リンク一覧
tasksRoutes.get('/:id/shared-links', async (c) => {
  const taskId = c.req.param('id');
  try {
    const result = await db.query.sharedLinks.findMany({
      where: eq(sharedLinks.taskId, taskId),
    });
    return c.json(result);
  } catch (error) {
    console.error('Error fetching shared links:', error);
    return c.json({ error: 'Failed to fetch shared links' }, 500);
  }
});
