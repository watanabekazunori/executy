// Google Calendar API 統合
// 注意: 本番環境ではOAuth2認証が必要

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  meetingUrl?: string;
  taskId?: string;
}

export interface CalendarConfig {
  accessToken: string;
  calendarId?: string;
}

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// カレンダーイベント一覧取得
export async function getCalendarEvents(
  config: CalendarConfig,
  options?: {
    timeMin?: Date;
    timeMax?: Date;
    maxResults?: number;
  }
): Promise<CalendarEvent[]> {
  const calendarId = config.calendarId || 'primary';
  const params = new URLSearchParams({
    timeMin: (options?.timeMin || new Date()).toISOString(),
    timeMax: (options?.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).toISOString(),
    maxResults: String(options?.maxResults || 50),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Calendar API error: ${response.status}`);
  }

  const data = await response.json();

  return data.items.map((item: any) => ({
    id: item.id,
    title: item.summary,
    description: item.description,
    start: new Date(item.start.dateTime || item.start.date),
    end: new Date(item.end.dateTime || item.end.date),
    location: item.location,
    attendees: item.attendees?.map((a: any) => a.email),
    meetingUrl: item.hangoutLink,
  }));
}

// カレンダーイベント作成
export async function createCalendarEvent(
  config: CalendarConfig,
  event: Omit<CalendarEvent, 'id'>
): Promise<CalendarEvent> {
  const calendarId = config.calendarId || 'primary';

  const body = {
    summary: event.title,
    description: event.description,
    start: {
      dateTime: event.start.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
    end: {
      dateTime: event.end.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
    location: event.location,
    attendees: event.attendees?.map(email => ({ email })),
    conferenceData: event.meetingUrl ? undefined : {
      createRequest: {
        requestId: `executy-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(`Calendar API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    title: data.summary,
    description: data.description,
    start: new Date(data.start.dateTime || data.start.date),
    end: new Date(data.end.dateTime || data.end.date),
    location: data.location,
    attendees: data.attendees?.map((a: any) => a.email),
    meetingUrl: data.hangoutLink,
  };
}

// カレンダーイベント更新
export async function updateCalendarEvent(
  config: CalendarConfig,
  eventId: string,
  updates: Partial<Omit<CalendarEvent, 'id'>>
): Promise<CalendarEvent> {
  const calendarId = config.calendarId || 'primary';

  const body: any = {};
  if (updates.title) body.summary = updates.title;
  if (updates.description) body.description = updates.description;
  if (updates.start) body.start = { dateTime: updates.start.toISOString(), timeZone: 'Asia/Tokyo' };
  if (updates.end) body.end = { dateTime: updates.end.toISOString(), timeZone: 'Asia/Tokyo' };
  if (updates.location) body.location = updates.location;
  if (updates.attendees) body.attendees = updates.attendees.map(email => ({ email }));

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(`Calendar API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    title: data.summary,
    description: data.description,
    start: new Date(data.start.dateTime || data.start.date),
    end: new Date(data.end.dateTime || data.end.date),
    location: data.location,
    attendees: data.attendees?.map((a: any) => a.email),
    meetingUrl: data.hangoutLink,
  };
}

// カレンダーイベント削除
export async function deleteCalendarEvent(
  config: CalendarConfig,
  eventId: string
): Promise<void> {
  const calendarId = config.calendarId || 'primary';

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 410) {
    throw new Error(`Calendar API error: ${response.status}`);
  }
}

// タスクからカレンダーイベントを作成
export async function createEventFromTask(
  config: CalendarConfig,
  task: {
    id: string;
    title: string;
    description?: string;
    dueDate?: Date;
    estimatedMinutes?: number;
  }
): Promise<CalendarEvent> {
  const startTime = task.dueDate || new Date();
  const duration = task.estimatedMinutes || 60;
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  return createCalendarEvent(config, {
    title: `[タスク] ${task.title}`,
    description: task.description,
    start: startTime,
    end: endTime,
    taskId: task.id,
  });
}

// 空き時間を検索
export async function findFreeSlots(
  config: CalendarConfig,
  options: {
    duration: number; // minutes
    startDate: Date;
    endDate: Date;
    workingHours?: { start: number; end: number }; // 9-18 など
  }
): Promise<{ start: Date; end: Date }[]> {
  const events = await getCalendarEvents(config, {
    timeMin: options.startDate,
    timeMax: options.endDate,
  });

  const workStart = options.workingHours?.start || 9;
  const workEnd = options.workingHours?.end || 18;
  const freeSlots: { start: Date; end: Date }[] = [];

  // 日付ごとに空き時間を計算
  const currentDate = new Date(options.startDate);
  while (currentDate <= options.endDate) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(workStart, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(workEnd, 0, 0, 0);

    // その日のイベントを取得
    const dayEvents = events.filter(e =>
      e.start >= dayStart && e.start < dayEnd
    ).sort((a, b) => a.start.getTime() - b.start.getTime());

    // 空き時間を計算
    let slotStart = dayStart;
    for (const event of dayEvents) {
      if (event.start > slotStart) {
        const slotDuration = (event.start.getTime() - slotStart.getTime()) / 60000;
        if (slotDuration >= options.duration) {
          freeSlots.push({
            start: new Date(slotStart),
            end: new Date(slotStart.getTime() + options.duration * 60000),
          });
        }
      }
      slotStart = event.end > slotStart ? event.end : slotStart;
    }

    // 最後のイベント後の空き時間
    if (slotStart < dayEnd) {
      const slotDuration = (dayEnd.getTime() - slotStart.getTime()) / 60000;
      if (slotDuration >= options.duration) {
        freeSlots.push({
          start: new Date(slotStart),
          end: new Date(slotStart.getTime() + options.duration * 60000),
        });
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return freeSlots;
}
