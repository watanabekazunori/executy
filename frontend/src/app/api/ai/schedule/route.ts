import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

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
  // 認証チェック
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

    // 今日から1週間の平日のみを生成
    const dates: string[] = []
    const weekdayNames: string[] = []
    for (let i = 0; i < 14; i++) { // 2週間分チェックして平日を7日分取得
      const d = new Date()
      d.setDate(d.getDate() + i)
      const dayOfWeek = d.getDay()
      // 土曜(6)と日曜(0)を除外
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(d.toISOString().split('T')[0])
        weekdayNames.push(['日', '月', '火', '水', '木', '金', '土'][dayOfWeek])
        if (dates.length >= 7) break
      }
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

## 作業可能な日程（平日のみ）
${dates.map((d, i) => `- ${d} (${weekdayNames[i]}曜日)`).join('\n')}

## 作業時間
平日 10:00〜18:00（土日祝は作業不可）

## スケジューリングのルール（厳守）
1. 【絶対厳守】startTimeは必ず10:00以降、endTimeは必ず18:00以下にすること
2. 【絶対厳守】土曜日・日曜日にはタスクを絶対に配置しないこと
3. 【絶対厳守】12:00〜13:00の昼休憩時間にはタスクを配置しないこと
4. 高優先度のタスクを先に配置
5. 期限が近いタスクを優先
6. カレンダーの予定と重ならないように配置
7. 集中力が高い午前中（10:00〜12:00）に重要なタスクを配置
8. 1タスクの作業時間は最大2時間とし、それ以上は分割
9. 使える時間帯: 10:00-12:00（午前）、13:00-18:00（午後）のみ

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

    // === バリデーション: 平日10:00〜18:00に強制修正 ===
    if (result.schedule && Array.isArray(result.schedule)) {
      result.schedule = result.schedule
        .map((item: any) => {
          // 日付の曜日チェック（土日を除外）
          const date = new Date(item.date + 'T00:00:00')
          const dayOfWeek = date.getDay()
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            // 土日の場合、次の月曜に移動
            const daysToAdd = dayOfWeek === 0 ? 1 : 2
            date.setDate(date.getDate() + daysToAdd)
            item.date = date.toISOString().split('T')[0]
          }

          // 時刻のバリデーション
          const [startH, startM] = (item.startTime || '10:00').split(':').map(Number)
          const [endH, endM] = (item.endTime || '11:00').split(':').map(Number)

          // 開始時刻: 10:00より前なら10:00に修正
          let fixedStartH = startH
          let fixedStartM = startM
          if (fixedStartH < 10) { fixedStartH = 10; fixedStartM = 0 }

          // 昼休憩（12:00〜13:00）を避ける
          if (fixedStartH === 12) { fixedStartH = 13; fixedStartM = 0 }

          // 終了時刻: 18:00を超えたら18:00に修正
          let fixedEndH = endH
          let fixedEndM = endM
          if (fixedEndH > 18 || (fixedEndH === 18 && fixedEndM > 0)) {
            fixedEndH = 18; fixedEndM = 0
          }
          if (fixedEndH < fixedStartH || (fixedEndH === fixedStartH && fixedEndM <= fixedStartM)) {
            fixedEndH = Math.min(fixedStartH + 1, 18)
            fixedEndM = fixedStartM
          }

          // 終了が昼休憩にかかる場合の修正
          if (fixedStartH < 12 && fixedEndH === 12 && fixedEndM > 0) {
            fixedEndH = 12; fixedEndM = 0
          }
          if (fixedEndH > 12 && fixedStartH < 12) {
            // 12:00〜13:00をまたぐ場合は午前で切る、または午後にずらす
            const durationMinutes = (endH - startH) * 60 + (endM - startM)
            if (durationMinutes <= 120) {
              // 短いタスクは13:00開始に移動
              fixedStartH = 13; fixedStartM = 0
              fixedEndH = Math.min(13 + Math.ceil(durationMinutes / 60), 18)
              fixedEndM = fixedStartM
            } else {
              // 長いタスクは12:00まで
              fixedEndH = 12; fixedEndM = 0
            }
          }

          item.startTime = `${String(fixedStartH).padStart(2, '0')}:${String(fixedStartM).padStart(2, '0')}`
          item.endTime = `${String(fixedEndH).padStart(2, '0')}:${String(fixedEndM).padStart(2, '0')}`

          return item
        })
        .filter((item: any) => {
          // 最終チェック: まだ不正なものを除外
          const [sh] = item.startTime.split(':').map(Number)
          const [eh] = item.endTime.split(':').map(Number)
          return sh >= 10 && eh <= 18 && sh < eh
        })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Schedule API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
