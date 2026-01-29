import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

interface Task {
  id: string
  title: string
  priority: string
  estimatedMinutes?: number
  dueDate?: string
  status: string
}

interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  allDay: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { tasks, calendarEvents, workingHours } = await request.json() as {
      tasks: Task[]
      calendarEvents: CalendarEvent[]
      workingHours: { start: string; end: string }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // 未完了タスクのみ
    const pendingTasks = tasks.filter(t => t.status !== 'completed')

    // 今日から1週間の日付を生成
    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }

    // カレンダーイベントの空き時間を計算するためのデータ
    const busySlots = calendarEvents.map(e => ({
      date: new Date(e.startTime).toISOString().split('T')[0],
      start: new Date(e.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      end: new Date(e.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      title: e.title
    }))

    const prompt = `あなたはタスクスケジューリングのエキスパートです。
以下のタスクとカレンダーの予定を見て、最適なスケジュールを提案してください。

## タスク一覧
${pendingTasks.map(t => `- ${t.title} (優先度: ${t.priority}, 予想時間: ${t.estimatedMinutes || 30}分, 期限: ${t.dueDate || 'なし'})`).join('\n')}

## カレンダーの予定（忙しい時間帯）
${busySlots.length > 0 ? busySlots.map(s => `- ${s.date} ${s.start}〜${s.end}: ${s.title}`).join('\n') : '予定なし'}

## 作業時間
${workingHours.start}〜${workingHours.end}

## スケジューリングのルール
1. 高優先度のタスクを先に配置
2. 期限が近いタスクを優先
3. カレンダーの予定と重ならないように配置
4. 集中力が高い午前中に重要なタスクを配置
5. 1タスクの作業時間は最大2時間とし、それ以上は分割

以下のJSON形式で回答してください：
{
  "schedule": [
    {
      "taskId": "タスクID",
      "taskTitle": "タスク名",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "reason": "この時間帯に配置した理由"
    }
  ],
  "suggestions": ["改善提案1", "改善提案2"],
  "warnings": ["注意点1"]
}`

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Gemini API error:', error)
      return NextResponse.json({ error: 'AI API failed' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // JSONを抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)

  } catch (error) {
    console.error('Schedule API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
