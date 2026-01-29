import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db, projects, tasks } from '../db';
import { eq } from 'drizzle-orm';

export const projectsRoutes = new Hono();

// プロジェクト一覧取得
projectsRoutes.get('/', async (c) => {
  const orgId = c.req.query('organizationId');
  try {
    let query = db.query.projects.findMany({
      with: {
        organization: true,
      },
    });

    if (orgId) {
      query = db.query.projects.findMany({
        where: eq(projects.organizationId, orgId),
        with: {
          organization: true,
        },
      });
    }

    const result = await query;
    return c.json(result);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return c.json({ error: 'Failed to fetch projects' }, 500);
  }
});

// プロジェクト詳細取得
projectsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        organization: true,
        tasks: true,
      },
    });

    if (!result) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json(result);
  } catch (error) {
    console.error('Error fetching project:', error);
    return c.json({ error: 'Failed to fetch project' }, 500);
  }
});

// プロジェクト作成
const createProjectSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['active', 'archived', 'completed']).optional().default('active'),
});

projectsRoutes.post('/', zValidator('json', createProjectSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const result = await db.insert(projects).values(data).returning();
    return c.json(result[0], 201);
  } catch (error) {
    console.error('Error creating project:', error);
    return c.json({ error: 'Failed to create project' }, 500);
  }
});

// プロジェクト更新
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
});

projectsRoutes.patch('/:id', zValidator('json', updateProjectSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  try {
    const result = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    return c.json({ error: 'Failed to update project' }, 500);
  }
});

// プロジェクト削除
projectsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return c.json({ error: 'Failed to delete project' }, 500);
  }
});

// プロジェクトのタスク一覧
projectsRoutes.get('/:id/tasks', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await db.query.tasks.findMany({
      where: eq(tasks.projectId, id),
      with: {
        subtasks: true,
        assignee: true,
      },
    });
    return c.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});
