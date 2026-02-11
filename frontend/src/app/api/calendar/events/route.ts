import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

// Google Calendarにイベントを作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { summary, description, startTime, endTime, calendarId } = await request.json()

    if (!summary || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const targetCalendar = calendarId || 'primary'

    const event = {
      summary,
      description: description || '',
      start: {
        dateTime: startTime,
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endTime,
        timeZone: 'Asia/Tokyo',
      },
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Calendar create event error:', error)
      return NextResponse.json({ error: 'Failed to create event', details: error }, { status: response.status })
    }

    const created = await response.json()
    return NextResponse.json({
      id: created.id,
      title: created.summary,
      startTime: created.start?.dateTime || created.start?.date,
      endTime: created.end?.dateTime || created.end?.date,
      htmlLink: created.htmlLink,
    })
  } catch (error) {
    console.error('Calendar event creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Google Calendarのイベントを更新（時間変更用）
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { eventId, startTime, endTime, calendarId } = await request.json()

    if (!eventId || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const targetCalendar = calendarId || 'primary'

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendar)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: { dateTime: startTime, timeZone: 'Asia/Tokyo' },
          end: { dateTime: endTime, timeZone: 'Asia/Tokyo' },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Calendar update event error:', error)
      return NextResponse.json({ error: 'Failed to update event', details: error }, { status: response.status })
    }

    const updated = await response.json()
    return NextResponse.json({
      id: updated.id,
      title: updated.summary,
      startTime: updated.start?.dateTime || updated.start?.date,
      endTime: updated.end?.dateTime || updated.end?.date,
      htmlLink: updated.htmlLink,
    })
  } catch (error) {
    console.error('Calendar event update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
