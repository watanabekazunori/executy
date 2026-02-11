import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { taskTitle, taskDescription, subtasks, estimatedMinutes } = await request.json()

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      // モックレスポンス
      return NextResponse.json({
        phases: [
          {
            name: '準備フェーズ',
            description: '要件定義と情報収集',
            startDay: 0,
            endDay: 2,
            milestones: [
              { name: '要件確定', day: 2, description: 'ゴールと成果物を明確化' }
            ],
            tasks: [
              { title: 'ゴール・成果物の定義', estimatedMinutes: 30, canAutomate: false, priority: 'high' },
              { title: '関連情報のリサーチ', estimatedMinutes: 60, canAutomate: true, priority: 'high' },
              { title: 'ステークホルダーへのヒアリング', estimatedMinutes: 45, canAutomate: false, priority: 'medium' },
            ]
          },
          {
            name: '実行フェーズ',
            description: 'メイン作業の実施',
            startDay: 3,
            endDay: 7,
            milestones: [
              { name: '初版完成', day: 5, description: 'ドラフト版の作成完了' },
              { name: 'レビュー完了', day: 7, description: 'フィードバック収集完了' }
            ],
            tasks: [
              { title: 'ドラフト作成', estimatedMinutes: 120, canAutomate: true, priority: 'high' },
              { title: '内部レビュー依頼', estimatedMinutes: 15, canAutomate: false, priority: 'medium' },
              { title: 'フィードバック収集', estimatedMinutes: 30, canAutomate: false, priority: 'medium' },
              { title: '修正・改善', estimatedMinutes: 60, canAutomate: false, priority: 'high' },
            ]
          },
          {
            name: '完了フェーズ',
            description: '最終確認と納品',
            startDay: 8,
            endDay: 10,
            milestones: [
              { name: 'タスク完了', day: 10, description: '全作業の完了と報告' }
            ],
            tasks: [
              { title: '最終チェック', estimatedMinutes: 30, canAutomate: false, priority: 'high' },
              { title: '成果物の整理・格納', estimatedMinutes: 20, canAutomate: true, priority: 'medium' },
              { title: '完了報告', estimatedMinutes: 15, canAutomate: false, priority: 'low' },
            ]
          }
        ],
        totalDays: 10,
        totalMinutes: 425,
        risks: [
          'ステークホルダーの承認に時間がかかる可能性',
          'レビューでの大幅な修正が発生する可能性'
        ],
        suggestions: [
          'AI自動化可能なタスクを先に実行して効率化',
          '並行作業できるタスクを特定して期間短縮'
        ]
      })
    }

    // Gemini API呼び出し
    const prompt = `あなたはプロジェクトマネジメントのエキスパートです。
以下のタスクについて、詳細な計画表を作成してください。

タスク名: ${taskTitle}
${taskDescription ? `説明: ${taskDescription}` : ''}
${subtasks?.length ? `既存のサブタスク: ${subtasks.map((s: any) => s.title).join(', ')}` : ''}
${estimatedMinutes ? `見積もり時間: ${estimatedMinutes}分` : ''}

以下のJSON形式で回答してください：
{
  "phases": [
    {
      "name": "フェーズ名",
      "description": "フェーズの説明",
      "startDay": 開始日（0起算）,
      "endDay": 終了日,
      "milestones": [
        { "name": "マイルストーン名", "day": 日, "description": "説明" }
      ],
      "tasks": [
        { "title": "タスク名", "estimatedMinutes": 分, "canAutomate": true/false, "priority": "high/medium/low" }
      ]
    }
  ],
  "totalDays": 合計日数,
  "totalMinutes": 合計時間（分）,
  "risks": ["リスク1", "リスク2"],
  "suggestions": ["提案1", "提案2"]
}

ルール:
- フェーズは2-4個で分割
- 各フェーズにマイルストーンを1-2個
- タスクは具体的で実行可能な粒度
- canAutomateはAIが実行可能なタスクにtrue
- 優先度は重要度と緊急度で判断
- risksはプロジェクト遂行上のリスク
- suggestionsは効率化の提案`

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 2048 }
      })
    })

    if (!response.ok) throw new Error('Gemini API error')

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]))
    }

    throw new Error('Invalid response format')
  } catch (error) {
    console.error('Plan task error:', error)
    return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 })
  }
}
