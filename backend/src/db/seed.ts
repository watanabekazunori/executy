// Seed data for EXECUTY
import { db } from './index';
import { users, organizations, organizationMembers, projects, tasks, meetings, sharedLinks } from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  // ユーザー作成
  const [user] = await db.insert(users).values({
    email: 'watanabe@fanvest.co.jp',
    name: '渡邊和則',
    timezone: 'Asia/Tokyo',
  }).returning();

  console.log('✅ Created user:', user.name);

  // 組織作成
  const orgsData = [
    { name: 'ファンベスト', initial: 'F', color: 'blue', ownerId: user.id },
    { name: 'パスゲート', initial: 'P', color: 'purple', ownerId: user.id },
    { name: 'Evego', initial: 'E', color: 'green', ownerId: user.id },
    { name: '個人', initial: '個', color: 'orange', ownerId: user.id },
  ];

  const orgs = await db.insert(organizations).values(orgsData).returning();
  console.log('✅ Created organizations:', orgs.map(o => o.name).join(', '));

  // 組織メンバー追加
  for (const org of orgs) {
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: user.id,
      role: 'owner',
    });
  }

  // プロジェクト作成
  const projectsData = [
    { organizationId: orgs[0].id, name: 'ファンド運営', color: 'blue' },
    { organizationId: orgs[0].id, name: '投資顧問', color: 'blue' },
    { organizationId: orgs[1].id, name: 'AEGシステム', color: 'purple' },
    { organizationId: orgs[1].id, name: '開発プロジェクト', color: 'purple' },
    { organizationId: orgs[2].id, name: '新規事業', color: 'green' },
    { organizationId: orgs[3].id, name: '個人タスク', color: 'orange' },
  ];

  const projs = await db.insert(projects).values(projectsData).returning();
  console.log('✅ Created projects:', projs.map(p => p.name).join(', '));

  // タスク作成（大タスク）
  const tasksData = [
    {
      organizationId: orgs[0].id,
      projectId: projs[0].id,
      title: 'Q1投資案件レビュー資料作成',
      description: '第1四半期の投資案件をレビューし、委員会向け資料を作成',
      status: 'in_progress',
      priority: 'urgent',
      assignedTo: user.id,
      createdBy: user.id,
      dueDate: new Date('2026-01-25T14:00:00+09:00'),
      estimatedMinutes: 180,
    },
    {
      organizationId: orgs[1].id,
      projectId: projs[2].id,
      title: 'システム開発進捗MTG準備',
      description: 'AEGシステム開発の進捗確認MTGの準備',
      status: 'pending',
      priority: 'high',
      assignedTo: user.id,
      createdBy: user.id,
      dueDate: new Date('2026-01-26T10:00:00+09:00'),
      estimatedMinutes: 60,
    },
    {
      organizationId: orgs[2].id,
      projectId: projs[4].id,
      title: '新規事業計画書ドラフト',
      description: '新規事業の計画書初稿を作成',
      status: 'pending',
      priority: 'medium',
      assignedTo: user.id,
      createdBy: user.id,
      dueDate: new Date('2026-01-28T18:00:00+09:00'),
      estimatedMinutes: 240,
    },
    {
      organizationId: orgs[3].id,
      projectId: projs[5].id,
      title: '確定申告準備',
      description: '2025年分の確定申告書類準備',
      status: 'pending',
      priority: 'medium',
      assignedTo: user.id,
      createdBy: user.id,
      dueDate: new Date('2026-02-15T18:00:00+09:00'),
      estimatedMinutes: 300,
    },
    {
      organizationId: orgs[0].id,
      projectId: projs[1].id,
      title: '投資先モニタリングレポート',
      description: '投資先企業の月次モニタリングレポート作成',
      status: 'in_progress',
      priority: 'medium',
      assignedTo: user.id,
      createdBy: user.id,
      dueDate: new Date('2026-01-31T18:00:00+09:00'),
      estimatedMinutes: 120,
    },
  ];

  const mainTasks = await db.insert(tasks).values(tasksData).returning();
  console.log('✅ Created main tasks:', mainTasks.length);

  // サブタスク作成
  const subtasksData = [
    // Q1投資案件レビューのサブタスク
    { organizationId: orgs[0].id, parentTaskId: mainTasks[0].id, title: '過去データ収集・整理', status: 'completed', sortOrder: 1 },
    { organizationId: orgs[0].id, parentTaskId: mainTasks[0].id, title: '市場分析レポート作成', status: 'completed', sortOrder: 2 },
    { organizationId: orgs[0].id, parentTaskId: mainTasks[0].id, title: '投資先企業評価シート', status: 'completed', sortOrder: 3 },
    { organizationId: orgs[0].id, parentTaskId: mainTasks[0].id, title: 'リスク分析・提言まとめ', status: 'in_progress', sortOrder: 4 },
    { organizationId: orgs[0].id, parentTaskId: mainTasks[0].id, title: 'プレゼン資料最終チェック', status: 'pending', sortOrder: 5 },
    // システム開発MTGのサブタスク
    { organizationId: orgs[1].id, parentTaskId: mainTasks[1].id, title: '進捗サマリー作成', status: 'pending', sortOrder: 1 },
    { organizationId: orgs[1].id, parentTaskId: mainTasks[1].id, title: '課題リスト更新', status: 'pending', sortOrder: 2 },
    { organizationId: orgs[1].id, parentTaskId: mainTasks[1].id, title: 'アジェンダ作成', status: 'pending', sortOrder: 3 },
  ];

  await db.insert(tasks).values(subtasksData);
  console.log('✅ Created subtasks');

  // 打ち合わせ作成
  const meetingsData = [
    {
      organizationId: orgs[0].id,
      taskId: mainTasks[0].id,
      title: '投資案件事前すり合わせ',
      startTime: new Date('2026-01-20T10:00:00+09:00'),
      endTime: new Date('2026-01-20T11:00:00+09:00'),
      location: '会議室A',
      status: 'completed',
      createdBy: user.id,
    },
    {
      organizationId: orgs[0].id,
      taskId: mainTasks[0].id,
      title: 'Q1投資委員会（レビュー発表）',
      startTime: new Date('2026-01-25T14:00:00+09:00'),
      endTime: new Date('2026-01-25T15:00:00+09:00'),
      meetingUrl: 'https://zoom.us/j/xxx',
      status: 'scheduled',
      createdBy: user.id,
    },
  ];

  const mtgs = await db.insert(meetings).values(meetingsData).returning();
  console.log('✅ Created meetings:', mtgs.length);

  // Google Drive共有リンク
  const linksData = [
    {
      taskId: mainTasks[0].id,
      title: 'Q1投資案件レビュー資料',
      url: 'https://drive.google.com/drive/folders/xxx',
      linkType: 'google_drive',
      fileType: 'folder',
      permission: 'edit',
      createdBy: user.id,
    },
    {
      taskId: mainTasks[0].id,
      title: 'Q1投資実績.xlsx',
      url: 'https://docs.google.com/spreadsheets/d/xxx',
      linkType: 'google_drive',
      fileType: 'spreadsheet',
      permission: 'view',
      createdBy: user.id,
    },
    {
      taskId: mainTasks[0].id,
      title: 'リスク評価レポート（ドラフト）',
      url: 'https://docs.google.com/document/d/xxx',
      linkType: 'google_drive',
      fileType: 'document',
      permission: 'edit',
      createdBy: user.id,
    },
  ];

  await db.insert(sharedLinks).values(linksData);
  console.log('✅ Created shared links');

  console.log('🎉 Seeding completed!');
}

seed()
  .catch(console.error)
  .finally(() => process.exit());
