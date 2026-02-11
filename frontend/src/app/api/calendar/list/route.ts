import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

// ユーザーのカレンダー一覧を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Calendar list error:', error)
      return NextResponse.json({ error: 'Failed to fetch calendars', details: error }, { status: response.status })
    }

    const data = await response.json()
    const calendars = (data.items || []).map((cal: any) => ({
      id: cal.id,
      name: cal.summary,
      description: cal.description || '',
      primary: cal.primary || false,
      backgroundColor: cal.backgroundColor,
      accessRole: cal.accessRole,
    }))

    return NextResponse.json({ calendars })
  } catch (error) {
    console.error('Calendar list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
