import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db, organizations, organizationMembers, projects } from '../db';
import { eq } from 'drizzle-orm';

export const organizationsRoutes = new Hono();

// 組織一覧取得
organizationsRoutes.get('/', async (c) => {
  try {
    const result = await db.query.organizations.findMany({
      with: {
        projects: true,
        members: true,
      },
    });
    return c.json(result);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return c.json({ error: 'Failed to fetch organizations' }, 500);
  }
});

// 組織詳細取得
organizationsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
      with: {
        projects: true,
        members: {
          with: {
            // user情報も取得
          },
        },
        tasks: {
          where: eq(organizations.id, id),
        },
      },
    });

    if (!result) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    return c.json(result);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return c.json({ error: 'Failed to fetch organization' }, 500);
  }
});

// 組織作成
const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  initial: z.string().min(1).max(2),
  color: z.string().optional().default('blue'),
  ownerId: z.string().uuid().optional(),
});

organizationsRoutes.post('/', zValidator('json', createOrgSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const result = await db.insert(organizations).values(data).returning();
    return c.json(result[0], 201);
  } catch (error) {
    console.error('Error creating organization:', error);
    return c.json({ error: 'Failed to create organization' }, 500);
  }
});

// 組織更新
const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  initial: z.string().min(1).max(2).optional(),
  color: z.string().optional(),
});

organizationsRoutes.patch('/:id', zValidator('json', updateOrgSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  try {
    const result = await db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error('Error updating organization:', error);
    return c.json({ error: 'Failed to update organization' }, 500);
  }
});

// 組織削除
organizationsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await db
      .delete(organizations)
      .where(eq(organizations.id, id))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    return c.json({ message: 'Organization deleted' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return c.json({ error: 'Failed to delete organization' }, 500);
  }
});

// 組織のプロジェクト一覧
organizationsRoutes.get('/:id/projects', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await db.query.projects.findMany({
      where: eq(projects.organizationId, id),
    });
    return c.json(result);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return c.json({ error: 'Failed to fetch projects' }, 500);
  }
});
