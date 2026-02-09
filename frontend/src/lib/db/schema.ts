// Aide Database Schema - Drizzle ORM
import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// ユーザー管理
// ============================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  avatarUrl: text('avatar_url'),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Tokyo'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// 組織管理
// ============================================

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  initial: varchar('initial', { length: 2 }).notNull(),
  color: varchar('color', { length: 20 }).default('blue').notNull(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }),
  ownerEmail: varchar('owner_email', { length: 255 }), // ユーザー識別用
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).default('member').notNull(), // owner, admin, member
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// プロジェクト管理
// ============================================

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 20 }),
  status: varchar('status', { length: 20 }).default('active'), // active, archived, completed
  ownerEmail: varchar('owner_email', { length: 255 }), // ユーザー識別用
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// タスク管理
// ============================================

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  parentTaskId: uuid('parent_task_id'), // Self-reference handled in relations

  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),

  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, in_progress, completed, cancelled
  priority: varchar('priority', { length: 20 }).default('medium'), // low, medium, high, urgent

  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdByEmail: varchar('created_by_email', { length: 255 }), // ユーザー識別用

  dueDate: timestamp('due_date', { withTimezone: true }),
  estimatedMinutes: integer('estimated_minutes'), // AI予測時間
  actualMinutes: integer('actual_minutes'), // 実際の時間

  sortOrder: integer('sort_order').default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  color: varchar('color', { length: 20 }).default('gray'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const taskTags = pgTable('task_tags', {
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.taskId, t.tagId] }),
}));

// ============================================
// 打ち合わせ管理
// ============================================

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),

  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),

  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),

  location: varchar('location', { length: 255 }),
  meetingUrl: text('meeting_url'),

  status: varchar('status', { length: 20 }).default('scheduled'), // scheduled, in_progress, completed, cancelled

  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const meetingParticipants = pgTable('meeting_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, accepted, declined
});

// ============================================
// 議事録管理
// ============================================

export const meetingNotes = pgTable('meeting_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }).notNull(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),

  content: text('content'), // Markdown

  status: varchar('status', { length: 20 }).default('draft'), // draft, published

  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const meetingNoteItems = pgTable('meeting_note_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingNoteId: uuid('meeting_note_id').references(() => meetingNotes.id, { onDelete: 'cascade' }).notNull(),

  type: varchar('type', { length: 20 }).notNull(), // decision, todo, note
  content: text('content').notNull(),

  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  dueDate: timestamp('due_date', { withTimezone: true }),

  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// ファイル/Google Drive共有管理
// ============================================

export const sharedLinks = pgTable('shared_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'set null' }),

  title: varchar('title', { length: 255 }).notNull(),
  url: text('url').notNull(),

  linkType: varchar('link_type', { length: 50 }), // google_drive, dropbox, notion, other
  fileType: varchar('file_type', { length: 50 }), // folder, spreadsheet, document, presentation, pdf

  permission: varchar('permission', { length: 20 }).default('view'), // view, edit

  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// 外部メッセージ連携（Slack/Google Chat）
// ============================================

export const externalMessages = pgTable('external_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),

  source: varchar('source', { length: 20 }).notNull(), // slack, google_chat
  sourceId: varchar('source_id', { length: 255 }),

  channelName: varchar('channel_name', { length: 100 }),
  senderName: varchar('sender_name', { length: 100 }),
  content: text('content'),

  messageType: varchar('message_type', { length: 20 }), // mention, dm, channel

  isRead: boolean('is_read').default(false),
  isConvertedToTask: boolean('is_converted_to_task').default(false),
  convertedTaskId: uuid('converted_task_id').references(() => tasks.id, { onDelete: 'set null' }),

  receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// AI関連
// ============================================

export const aiSuggestions = pgTable('ai_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),

  suggestionType: varchar('suggestion_type', { length: 50 }).notNull(), // time_estimate, priority, breakdown, schedule
  content: jsonb('content').notNull(),

  isAccepted: boolean('is_accepted').default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// Relations
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  organizations: many(organizationMembers),
  assignedTasks: many(tasks),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, { fields: [organizations.ownerId], references: [users.id] }),
  members: many(organizationMembers),
  projects: many(projects),
  tasks: many(tasks),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, { fields: [projects.organizationId], references: [organizations.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  organization: one(organizations, { fields: [tasks.organizationId], references: [organizations.id] }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  parentTask: one(tasks, { fields: [tasks.parentTaskId], references: [tasks.id], relationName: 'subtasks' }),
  subtasks: many(tasks, { relationName: 'subtasks' }),
  assignee: one(users, { fields: [tasks.assignedTo], references: [users.id] }),
  meetings: many(meetings),
  sharedLinks: many(sharedLinks),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  organization: one(organizations, { fields: [meetings.organizationId], references: [organizations.id] }),
  task: one(tasks, { fields: [meetings.taskId], references: [tasks.id] }),
  participants: many(meetingParticipants),
  notes: many(meetingNotes),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const meetingParticipantsRelations = relations(meetingParticipants, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingParticipants.meetingId], references: [meetings.id] }),
  user: one(users, { fields: [meetingParticipants.userId], references: [users.id] }),
}));

export const meetingNotesRelations = relations(meetingNotes, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingNotes.meetingId], references: [meetings.id] }),
  task: one(tasks, { fields: [meetingNotes.taskId], references: [tasks.id] }),
}));

export const sharedLinksRelations = relations(sharedLinks, ({ one }) => ({
  task: one(tasks, { fields: [sharedLinks.taskId], references: [tasks.id] }),
  meeting: one(meetings, { fields: [sharedLinks.meetingId], references: [meetings.id] }),
}));
