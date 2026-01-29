import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json()

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      // モックレスポンス
      const mockResponses: Record<string, string> = {
        'タスク': `タスク管理について承知しました。

以下のサポートが可能です：
• **タスクの分解** - 大きなタスクを小さなステップに分割
• **優先度の提案** - 緊急度と重要度に基づく優先順位付け
• **時間見積もり** - 各タスクの所要時間を予測
• **メール下書き** - タスク関連のメール文面を作成
• **レポート作成** - 進捗レポートの自動生成

何をお手伝いしましょうか？`,
        '分解': `タスクを分解いたします。

タスク名を教えていただければ、以下のような形式で分解します：
1. 準備・リサーチフェーズ
2. 実行フェーズ
3. レビュー・確認フェーズ

それぞれのサブタスクに対して、AIが自動実行できる部分があればお知らせします。`,
        'メール': `メールの作成をお手伝いします。

以下の情報を教えてください：
• 宛先（相手の役職・関係性）
• 目的（依頼、報告、確認など）
• 主な内容

プロフェッショナルな文面を作成いたします。`,
        'default': `承知しました。「${message}」についてお手伝いします。

私ができることの例：
• タスクの分解と時間見積もり
• 優先度の提案
• メールやドキュメントの下書き作成
• 進捗レポートの作成
• リサーチや情報収集

詳しくお聞かせください。`
      }

      const key = Object.keys(mockResponses).find(k => message.includes(k)) || 'default'
      return NextResponse.json({ response: mockResponses[key] })
    }

    // Gemini API呼び出し
    const systemPrompt = `あなたはEXECUTYというタスク管理アプリのAIアシスタントです。
ユーザーのタスク管理、時間管理、生産性向上をサポートします。

できること：
- タスクの分解と見積もり
- 優先度の提案
- メールやドキュメントの下書き作成
- 進捗レポートの作成
- スケジュール最適化の提案

${context ? `現在のコンテキスト: ${JSON.stringify(context)}` : ''}

回答は簡潔に、日本語で丁寧に行ってください。マークダウン形式で読みやすく整形してください。`

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'はい、EXECUTYのAIアシスタントとしてお手伝いします。' }] },
          { role: 'user', parts: [{ text: message }] }
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048
        }
      })
    })

    if (!response.ok) {
      throw new Error('Gemini API error')
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'すみません、応答を生成できませんでした。'

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json({
      response: 'すみません、エラーが発生しました。もう一度お試しください。'
    })
  }
}
