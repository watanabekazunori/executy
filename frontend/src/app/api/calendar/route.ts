import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

// Google Calendar APIからイベントを取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any

    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Google Calendar API呼び出し
    const now = new Date()
    const timeMin = now.toISOString()
    const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1週間先まで

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`,
      {
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      }
    )

    if (!calendarResponse.ok) {
      const error = await calendarResponse.text()
      console.error('Google Calendar API error:', error)
      return NextResponse.json({ error: 'Failed to fetch calendar', details: error }, { status: calendarResponse.status })
    }

    const data = await calendarResponse.json()

    // イベントを整形
    const events = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary || '(タイトルなし)',
      description: item.description || '',
      startTime: item.start?.dateTime || item.start?.date,
      endTime: item.end?.dateTime || item.end?.date,
      allDay: !item.start?.dateTime,
      location: item.location || '',
      htmlLink: item.htmlLink,
      status: item.status,
      organizer: item.organizer?.email,
    }))

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
