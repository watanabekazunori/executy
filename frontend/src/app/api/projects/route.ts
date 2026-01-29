import { NextRequest, NextResponse } from 'next/server';
import { db, projects } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET: プロジェクト一覧取得（シンプル版）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('organizationId');

  try {
    // シンプルなクエリのみ - 関連データは取得しない
    const projectList = orgId
      ? await db.select().from(projects).where(eq(projects.organizationId, orgId))
      : await db.select().from(projects);

    return NextResponse.json(projectList);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST: プロジェクト作成
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await db.insert(projects).values(data).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
