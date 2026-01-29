import { NextRequest, NextResponse } from 'next/server';
import { db, organizations } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET: 組織一覧取得（ユーザー別）
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ユーザーの組織のみ取得
    const orgs = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerEmail, session.user.email));
    return NextResponse.json(orgs);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

// POST: 組織作成（ユーザーのメールを保存）
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const result = await db.insert(organizations).values({
      ...data,
      ownerEmail: session.user.email,
    }).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
