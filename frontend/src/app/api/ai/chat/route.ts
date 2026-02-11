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
    const { message, mode, conversationState, conversationHistory, optionId, context } = await request.json()

    const apiKey = process.env.GEMINI_API_KEY

    // タスク深掘りモード
    if (mode === 'task_refine') {
      return handleTaskRefine(message, conversationState, conversationHistory, context, apiKey)
    }

    // 通常チャットモード
    if (!apiKey) {
      const mockResponses: Record<string, string> = {
        'タスク': `タスク管理について承知しました。\n\n以下のサポートが可能です：\n• タスクの分解 - 大きなタスクを小さなステップに分割\n• 優先度の提案 - 緊急度と重要度に基づく優先順位付け\n• 時間見積もり - 各タスクの所要時間を予測\n\n何をお手伝いしましょうか？`,
        'default': `承知しました。「${message}」についてお手伝いします。\n\n詳しくお聞かせください。`
      }
      const key = Object.keys(mockResponses).find(k => message.includes(k)) || 'default'
      return NextResponse.json({ response: mockResponses[key], type: 'text' })
    }

    const systemPrompt = `あなたはAideというタスク管理アプリのAIアシスタントです。
ユーザーのタスク管理、時間管理、生産性向上をサポートします。
回答は簡潔に、日本語で丁寧に行ってください。`

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'はい、AideのAIアシスタントとしてお手伝いします。' }] },
      ...(conversationHistory || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ]

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
      })
    })

    if (!response.ok) throw new Error('Gemini API error')
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'すみません、応答を生成できませんでした。'
    return NextResponse.json({ response: text, type: 'text' })

  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json({ response: 'エラーが発生しました。もう一度お試しください。', type: 'text' })
  }
}

async function handleTaskRefine(
  message: string,
  conversationState: any,
  conversationHistory: any[],
  context: any,
  apiKey: string | undefined
) {
  const phase = conversationState?.phase || 'idle'

  // フェーズ1: 初回 - タスク名を受け取って質問を開始
  if (phase === 'idle') {
    // タスク作成意図の検出
    const isTaskCreation = message.includes('タスク') || message.includes('作成') || message.includes('やりたい') || message.includes('したい') || message.length < 50

    if (!apiKey) {
      // モック: 選択肢付き質問を返す
      return NextResponse.json({
        response: `「${message}」について詳しく教えてください。\n\nこのタスクの目的は何ですか？`,
        type: 'options',
        options: [
          { label: '業務効率化のため', description: '日常業務のプロセスを改善したい' },
          { label: 'クライアント対応のため', description: 'お客様向けの対応が必要' },
          { label: '新規プロジェクトのため', description: '新しい取り組みを始めたい' },
          { label: '期限付きの依頼', description: '締め切りのある作業' },
        ],
        conversationState: { phase: 'refining', taskTitle: message, refinedData: {} }
      })
    }

    // Gemini APIで質問を生成
    const prompt = `あなたはタスク管理のAIアシスタントです。ユーザーが以下のタスクについて相談しています。

ユーザーの入力: "${message}"

このタスクを正確に理解するために、最も重要な質問を1つしてください。
そして、その質問に対する選択肢を3-4個提供してください。

必ず以下のJSON形式で回答してください：
{
  "response": "質問テキスト",
  "options": [
    { "label": "選択肢1", "description": "簡単な説明" },
    { "label": "選択肢2", "description": "簡単な説明" },
    { "label": "選択肢3", "description": "簡単な説明" }
  ]
}`

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return NextResponse.json({
            ...parsed,
            type: 'options',
            conversationState: { phase: 'refining', taskTitle: message, refinedData: {} }
          })
        }
      }
    } catch (e) {
      console.error('Gemini error in task_refine:', e)
    }

    // フォールバック
    return NextResponse.json({
      response: `「${message}」ですね。もう少し詳しく教えてください。\n\nどのような種類のタスクですか？`,
      type: 'options',
      options: [
        { label: '資料作成・ドキュメント', description: '文書やプレゼンの作成' },
        { label: 'ミーティング・調整', description: '会議の準備や日程調整' },
        { label: '開発・技術作業', description: 'コーディングや技術的な作業' },
        { label: 'その他', description: 'それ以外の作業' },
      ],
      conversationState: { phase: 'refining', taskTitle: message, refinedData: {} }
    })
  }

  // フェーズ2: 深掘り質問（2回目以降）
  if (phase === 'refining') {
    const refinedData = { ...conversationState.refinedData, lastAnswer: message }
    const questionCount = Object.keys(refinedData).length

    // 2-3回質問したらサブタスク生成へ
    if (questionCount >= 2) {
      return generateSubtasks(conversationState.taskTitle, refinedData, conversationHistory, apiKey)
    }

    if (!apiKey) {
      // モック: 追加質問
      const followUpQuestions = [
        {
          response: 'なるほど。期限はありますか？',
          options: [
            { label: '今日中', description: '本日中に完了が必要' },
            { label: '今週中', description: '今週末までに完了' },
            { label: '来週以降', description: '急ぎではない' },
            { label: '特に決まっていない', description: '期限なし' },
          ]
        },
        {
          response: '了解しました。このタスクの規模感を教えてください。',
          options: [
            { label: '30分以内で完了', description: '簡単なタスク' },
            { label: '1-2時間程度', description: '中程度のタスク' },
            { label: '半日以上', description: '大きめのタスク' },
            { label: '数日かかる', description: '大型タスク' },
          ]
        }
      ]

      const q = followUpQuestions[Math.min(questionCount - 1, followUpQuestions.length - 1)]
      return NextResponse.json({
        ...q,
        type: 'options',
        conversationState: { ...conversationState, refinedData }
      })
    }

    // Gemini APIで追加質問生成
    const historyText = conversationHistory?.map((m: any) => `${m.role}: ${m.content}`).join('\n') || ''
    const prompt = `タスク管理AIアシスタントとして、タスクの深掘りをしています。

タスク名: "${conversationState.taskTitle}"
これまでの会話:
${historyText}
ユーザーの最新回答: "${message}"

あと1つ重要な質問をして、このタスクの全体像を把握してください。
3-4個の選択肢を提供してください。

JSON形式で回答:
{
  "response": "質問テキスト",
  "options": [
    { "label": "選択肢", "description": "説明" }
  ]
}`

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return NextResponse.json({
            ...parsed,
            type: 'options',
            conversationState: { ...conversationState, refinedData }
          })
        }
      }
    } catch (e) {
      console.error('Gemini follow-up error:', e)
    }

    // フォールバック: サブタスク生成へ進む
    return generateSubtasks(conversationState.taskTitle, refinedData, conversationHistory, apiKey)
  }

  // その他のフェーズ
  return NextResponse.json({
    response: message,
    type: 'text'
  })
}

async function generateSubtasks(
  taskTitle: string,
  refinedData: Record<string, string>,
  conversationHistory: any[],
  apiKey: string | undefined
) {
  if (!apiKey) {
    // モックサブタスク
    return NextResponse.json({
      response: `「${taskTitle}」のタスクを分析しました。\n以下のサブタスクを提案します。必要なものを選択してください。`,
      type: 'subtask_select',
      taskData: {
        title: taskTitle,
        subtasks: [
          { title: `${taskTitle}の要件整理・ゴール設定`, canAutomate: false },
          { title: `関連情報のリサーチ・収集`, canAutomate: true },
          { title: `ドラフト作成・初版`, canAutomate: true },
          { title: `関係者へのレビュー依頼`, canAutomate: false },
          { title: `フィードバック反映・修正`, canAutomate: false },
          { title: `最終確認・完了報告`, canAutomate: false },
        ],
        priority: 'medium',
        estimatedMinutes: 120
      },
      conversationState: { phase: 'subtasks', taskTitle, refinedData }
    })
  }

  // Gemini APIでサブタスク生成
  const historyText = conversationHistory?.map((m: any) => `${m.role}: ${m.content}`).join('\n') || ''
  const prompt = `タスク管理AIとして、以下の情報からタスクを分析し、具体的なサブタスクに分解してください。

タスク名: "${taskTitle}"
会話履歴:
${historyText}
追加情報: ${JSON.stringify(refinedData)}

以下のJSON形式で回答してください：
{
  "title": "最適化されたタスク名",
  "subtasks": [
    { "title": "サブタスク名", "canAutomate": true/false }
  ],
  "priority": "high/medium/low",
  "estimatedMinutes": 見積もり時間（分）
}

注意:
- サブタスクは4-8個で具体的に
- canAutomateはAI(リサーチ、文書作成等)が実行可能なタスクにtrueを設定
- 優先度は会話内容から適切に判断`

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1024 }
      })
    })

    if (response.ok) {
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const taskData = JSON.parse(jsonMatch[0])
        return NextResponse.json({
          response: `「${taskData.title}」のタスクを分析しました。\n以下のサブタスクを提案します。必要なものを選択してください。`,
          type: 'subtask_select',
          taskData,
          conversationState: { phase: 'subtasks', taskTitle, refinedData }
        })
      }
    }
  } catch (e) {
    console.error('Gemini subtask generation error:', e)
  }

  // フォールバック
  return NextResponse.json({
    response: `「${taskTitle}」のサブタスクを提案します。`,
    type: 'subtask_select',
    taskData: {
      title: taskTitle,
      subtasks: [
        { title: '要件の確認', canAutomate: false },
        { title: '情報収集・リサーチ', canAutomate: true },
        { title: '実行・作成', canAutomate: false },
        { title: '確認・レビュー', canAutomate: false }
      ],
      priority: 'medium',
      estimatedMinutes: 60
    },
    conversationState: { phase: 'subtasks', taskTitle, refinedData }
  })
}
