// Gemini API クライアント (gemini-1.5-flash - 安価なモデル)
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

// Gemini クライアント初期化
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// AI応答の型定義
export interface AIResponse {
  text: string;
  success: boolean;
  error?: string;
}

// タスク分解
export async function breakdownTaskWithAI(taskTitle: string, context?: string): Promise<AIResponse> {
  try {
    const prompt = `
あなたは経営者・マネージャー向けのタスク管理AIアシスタントです。
以下のタスクを実行可能な具体的なサブタスクに分解してください。

タスク: ${taskTitle}
${context ? `コンテキスト: ${context}` : ''}

以下の形式で回答してください：
1. [サブタスク名] (所要時間目安: X分)
2. [サブタスク名] (所要時間目安: X分)
...

注意:
- 各サブタスクは30分以内で完了できる粒度にする
- 優先順位が高い順に並べる
- 最大8個までのサブタスクに分解
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return {
      text: response.text(),
      success: true,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'AI処理に失敗しました',
    };
  }
}

// 時間見積もり
export async function estimateTimeWithAI(taskTitle: string, subtasks?: string[]): Promise<AIResponse> {
  try {
    const prompt = `
あなたは経営者・マネージャー向けのタスク管理AIアシスタントです。
以下のタスクの所要時間を見積もってください。

タスク: ${taskTitle}
${subtasks?.length ? `サブタスク:\n${subtasks.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}

以下の形式で回答してください：
予測時間: X時間Y分
信頼度: 高/中/低
根拠: （簡潔に）
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return {
      text: response.text(),
      success: true,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'AI処理に失敗しました',
    };
  }
}

// 優先順位提案
export async function suggestPriorityWithAI(tasks: { title: string; dueDate?: string; status: string }[]): Promise<AIResponse> {
  try {
    const taskList = tasks.map((t, i) =>
      `${i + 1}. ${t.title} (期限: ${t.dueDate || '未設定'}, 状態: ${t.status})`
    ).join('\n');

    const prompt = `
あなたは経営者・マネージャー向けのタスク管理AIアシスタントです。
以下のタスク一覧から、今日優先的に取り組むべきタスクを提案してください。

タスク一覧:
${taskList}

以下の形式で回答してください：
【今日の優先タスク】
1. [タスク名] - 理由
2. [タスク名] - 理由
3. [タスク名] - 理由

【アドバイス】
（1-2文で）
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return {
      text: response.text(),
      success: true,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'AI処理に失敗しました',
    };
  }
}

// 会議メモ要約
export async function summarizeMeetingWithAI(meetingNotes: string, participants?: string[]): Promise<AIResponse> {
  try {
    const prompt = `
あなたは経営者・マネージャー向けのタスク管理AIアシスタントです。
以下の会議メモを要約し、アクションアイテムを抽出してください。

会議メモ:
${meetingNotes}
${participants?.length ? `参加者: ${participants.join(', ')}` : ''}

以下の形式で回答してください：
【要約】
（3-5文で）

【決定事項】
- 項目1
- 項目2

【アクションアイテム】
- [ ] タスク1 (担当: XX)
- [ ] タスク2 (担当: XX)

【次回のアジェンダ案】
- 項目1
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return {
      text: response.text(),
      success: true,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'AI処理に失敗しました',
    };
  }
}

// チャットアシスタント
export async function chatWithAI(message: string, context?: { tasks?: any[]; meetings?: any[] }): Promise<AIResponse> {
  try {
    const contextInfo = context ? `
現在のコンテキスト:
- タスク数: ${context.tasks?.length || 0}件
- 今後の会議: ${context.meetings?.length || 0}件
` : '';

    const prompt = `
あなたはEXECUTYの経営者・マネージャー向けAIアシスタントです。
タスク管理、スケジュール調整、優先順位付けについてサポートします。

${contextInfo}

ユーザーの質問: ${message}

簡潔で実用的な回答をしてください。
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return {
      text: response.text(),
      success: true,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'AI処理に失敗しました',
    };
  }
}

// メール下書き生成
export async function generateEmailDraftWithAI(
  purpose: string,
  recipient: string,
  context?: string
): Promise<AIResponse> {
  try {
    const prompt = `
あなたはビジネスメール作成のアシスタントです。
以下の条件でメール下書きを作成してください。

目的: ${purpose}
宛先: ${recipient}
${context ? `背景情報: ${context}` : ''}

以下の形式で回答してください：
件名:

本文:
（ビジネスメールとして適切な形式で）
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return {
      text: response.text(),
      success: true,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'AI処理に失敗しました',
    };
  }
}

// Slackメッセージ要約
export async function summarizeSlackWithAI(messages: { author: string; text: string; timestamp: string }[]): Promise<AIResponse> {
  try {
    const messageList = messages.map(m =>
      `[${m.timestamp}] ${m.author}: ${m.text}`
    ).join('\n');

    const prompt = `
以下のSlackメッセージを要約し、重要なポイントを抽出してください。

メッセージ:
${messageList}

以下の形式で回答してください：
【要約】
（2-3文で）

【重要ポイント】
- ポイント1
- ポイント2

【アクション必要な項目】
- [ ] 項目（あれば）
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return {
      text: response.text(),
      success: true,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'AI処理に失敗しました',
    };
  }
}
