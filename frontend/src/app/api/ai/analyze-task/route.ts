import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

// Gemini API endpoint
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(request: NextRequest) {
  // 認証チェック
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { taskTitle, taskDescription } = await request.json()

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      // モックレスポンス（APIキーがない場合）
      return NextResponse.json({
        estimatedMinutes: Math.floor(Math.random() * 120) + 30,
        subtasks: [
          { title: `${taskTitle}の要件を整理する`, canAutomate: false },
          { title: `${taskTitle}の調査・リサーチ`, canAutomate: true },
          { title: `${taskTitle}のドラフト作成`, canAutomate: true },
          { title: `${taskTitle}のレビュー・修正`, canAutomate: false },
          { title: `${taskTitle}の最終確認`, canAutomate: false }
        ],
        priority: 'medium',
        suggestions: [
          '関連ドキュメントを先に確認することをお勧めします',
          'この作業は午前中に集中して行うと効率的です'
        ]
      })
    }

    // Gemini APIを呼び出す
    const prompt = `あなたはタスク管理アシスタントです。以下のタスクを分析してください。

タスク名: ${taskTitle}
${taskDescription ? `説明: ${taskDescription}` : ''}

以下の形式でJSONを返してください（他のテキストは不要）:
{
  "estimatedMinutes": 予想所要時間（分）,
  "subtasks": [
    { "title": "サブタスク名", "canAutomate": AIが自動実行可能かどうか（true/false） }
  ],
  "priority": "high" または "medium" または "low",
  "suggestions": ["アドバイス1", "アドバイス2"]
}

サブタスクは3-7個程度で、canAutomateはリサーチ、メール作成、ドキュメント作成などAIができるタスクにtrueを設定してください。`

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    })

    if (!response.ok) {
      throw new Error('Gemini API error')
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // JSONを抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return NextResponse.json(parsed)
    }

    throw new Error('Invalid response format')
  } catch (error) {
    console.error('AI analyze error:', error)
    // フォールバック
    return NextResponse.json({
      estimatedMinutes: 60,
      subtasks: [
        { title: '要件の確認', canAutomate: false },
        { title: '必要な情報の収集', canAutomate: true },
        { title: '実行・作成', canAutomate: false },
        { title: '確認・レビュー', canAutomate: false }
      ],
      priority: 'medium',
      suggestions: ['タスクを細分化して取り組むことをお勧めします']
    })
  }
}
