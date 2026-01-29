import { NextRequest, NextResponse } from 'next/server';
import { db, projects } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET: プロジェクト一覧取得（ユーザー別）
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('organizationId');

  try {
    // ユーザーのプロジェクトのみ取得
    const conditions = [eq(projects.ownerEmail, session.user.email)];
    if (orgId) {
      conditions.push(eq(projects.organizationId, orgId));
    }

    const projectList = await db
      .select()
      .from(projects)
      .where(and(...conditions));

    return NextResponse.json(projectList);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST: プロジェクト作成（ユーザーのメールを保存）
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const result = await db.insert(projects).values({
      ...data,
      ownerEmail: session.user.email,
    }).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
