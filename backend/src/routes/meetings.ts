import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db, meetings, meetingParticipants, meetingNotes, meetingNoteItems } from '../db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const meetingsRoutes = new Hono();

// 打ち合わせ一覧取得
meetingsRoutes.get('/', async (c) => {
  const orgId = c.req.query('organizationId');
  const taskId = c.req.query('taskId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  try {
    let conditions = [];

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

    const result = await db.query.meetings.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        task: true,
        organization: true,
        participants: true,
        notes: true,
      },
      orderBy: [meetings.startTime],
    });

    return c.json(result);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return c.json({ error: 'Failed to fetch meetings' }, 500);
  }
});

// 打ち合わせ詳細取得
meetingsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await db.query.meetings.findFirst({
      where: eq(meetings.id, id),
      with: {
        task: true,
        organization: true,
        participants: true,
        notes: {
          with: {
            // items も取得
          },
        },
      },
    });

    if (!result) {
      return c.json({ error: 'Meeting not found' }, 404);
    }

    return c.json(result);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return c.json({ error: 'Failed to fetch meeting' }, 500);
  }
});

// 打ち合わせ作成
const createMeetingSchema = z.object({
  organizationId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  location: z.string().max(255).optional(),
  meetingUrl: z.string().url().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional().default('scheduled'),
  createdBy: z.string().uuid().optional(),
});

meetingsRoutes.post('/', zValidator('json', createMeetingSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const result = await db.insert(meetings).values({
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
    }).returning();
    return c.json(result[0], 201);
  } catch (error) {
    console.error('Error creating meeting:', error);
    return c.json({ error: 'Failed to create meeting' }, 500);
  }
});

// 打ち合わせ更新
const updateMeetingSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  location: z.string().max(255).optional(),
  meetingUrl: z.string().url().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  taskId: z.string().uuid().nullable().optional(),
});

meetingsRoutes.patch('/:id', zValidator('json', updateMeetingSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');

  try {
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.startTime) {
      updateData.startTime = new Date(data.startTime);
    }
    if (data.endTime) {
      updateData.endTime = new Date(data.endTime);
    }

    const result = await db
      .update(meetings)
      .set(updateData)
      .where(eq(meetings.id, id))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Meeting not found' }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error('Error updating meeting:', error);
    return c.json({ error: 'Failed to update meeting' }, 500);
  }
});

// 打ち合わせ削除
meetingsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await db
      .delete(meetings)
      .where(eq(meetings.id, id))
      .returning();

    if (result.length === 0) {
      return c.json({ error: 'Meeting not found' }, 404);
    }

    return c.json({ message: 'Meeting deleted' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return c.json({ error: 'Failed to delete meeting' }, 500);
  }
});

// 議事録作成
const createNoteSchema = z.object({
  content: z.string().optional(),
  status: z.enum(['draft', 'published']).optional().default('draft'),
  createdBy: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
});

meetingsRoutes.post('/:id/notes', zValidator('json', createNoteSchema), async (c) => {
  const meetingId = c.req.param('id');
  const data = c.req.valid('json');

  try {
    const result = await db.insert(meetingNotes).values({
      meetingId,
      ...data,
    }).returning();
    return c.json(result[0], 201);
  } catch (error) {
    console.error('Error creating meeting note:', error);
    return c.json({ error: 'Failed to create meeting note' }, 500);
  }
});

// 議事録一覧
meetingsRoutes.get('/:id/notes', async (c) => {
  const meetingId = c.req.param('id');
  try {
    const result = await db.query.meetingNotes.findMany({
      where: eq(meetingNotes.meetingId, meetingId),
      orderBy: [desc(meetingNotes.createdAt)],
    });
    return c.json(result);
  } catch (error) {
    console.error('Error fetching meeting notes:', error);
    return c.json({ error: 'Failed to fetch meeting notes' }, 500);
  }
});

// 議事録アイテム追加（決定事項・TODO）
const createNoteItemSchema = z.object({
  type: z.enum(['decision', 'todo', 'note']),
  content: z.string().min(1),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  sortOrder: z.number().int().optional(),
});

meetingsRoutes.post('/notes/:noteId/items', zValidator('json', createNoteItemSchema), async (c) => {
  const meetingNoteId = c.req.param('noteId');
  const data = c.req.valid('json');

  try {
    const result = await db.insert(meetingNoteItems).values({
      meetingNoteId,
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    }).returning();
    return c.json(result[0], 201);
  } catch (error) {
    console.error('Error creating note item:', error);
    return c.json({ error: 'Failed to create note item' }, 500);
  }
});

// 参加者追加
const addParticipantSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'declined']).optional().default('pending'),
});

meetingsRoutes.post('/:id/participants', zValidator('json', addParticipantSchema), async (c) => {
  const meetingId = c.req.param('id');
  const data = c.req.valid('json');

  try {
    const result = await db.insert(meetingParticipants).values({
      meetingId,
      ...data,
    }).returning();
    return c.json(result[0], 201);
  } catch (error) {
    console.error('Error adding participant:', error);
    return c.json({ error: 'Failed to add participant' }, 500);
  }
});
