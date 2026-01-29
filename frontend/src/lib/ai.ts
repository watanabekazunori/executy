// AI機能クライアント
// Claude APIとの連携でタスク分解・時間予測を行う

import { Task } from './api';

interface TaskBreakdownResult {
  subtasks: {
    title: string;
    description?: string;
    estimatedMinutes: number;
    priority: 'low' | 'medium' | 'high';
  }[];
  totalEstimatedMinutes: number;
  reasoning: string;
}

interface TimeEstimateResult {
  estimatedMinutes: number;
  confidence: 'low' | 'medium' | 'high';
  factors: string[];
  recommendation?: string;
}

interface AIInsight {
  type: 'warning' | 'suggestion' | 'prediction' | 'automation';
  title: string;
  description: string;
  action?: string;
}

// モックAI応答（実際のAPIが設定されるまで使用）
const USE_MOCK_AI = true;

// タスク分解AI
export async function breakdownTask(task: {
  title: string;
  description?: string;
  estimatedMinutes?: number;
}): Promise<TaskBreakdownResult> {
  if (USE_MOCK_AI) {
    await delay(1500); // AI処理のシミュレーション

    // タスクの種類に基づいて分解を生成
    const subtasks = generateMockSubtasks(task.title);

    return {
      subtasks,
      totalEstimatedMinutes: subtasks.reduce((sum, st) => sum + st.estimatedMinutes, 0),
      reasoning: `「${task.title}」を${subtasks.length}つのサブタスクに分解しました。過去の類似タスクの実績データに基づき、各タスクの所要時間を推定しています。`,
    };
  }

  // 実際のAI API呼び出し（将来実装）
  throw new Error('AI API not configured');
}

// 時間予測AI
export async function estimateTaskTime(task: {
  title: string;
  description?: string;
  subtasks?: { title: string; status: string }[];
}): Promise<TimeEstimateResult> {
  if (USE_MOCK_AI) {
    await delay(800);

    const baseTime = getBaseTimeEstimate(task.title);
    const complexity = task.description?.length || 0 > 100 ? 1.3 : 1;
    const subtaskFactor = task.subtasks?.length ? 1 + task.subtasks.length * 0.1 : 1;

    const estimatedMinutes = Math.round(baseTime * complexity * subtaskFactor);

    return {
      estimatedMinutes,
      confidence: complexity > 1.2 ? 'medium' : 'high',
      factors: [
        'タスクタイトルの分析',
        task.description ? '詳細説明の複雑さ' : null,
        task.subtasks?.length ? `${task.subtasks.length}個のサブタスク` : null,
        '過去の類似タスクの実績',
      ].filter(Boolean) as string[],
      recommendation:
        estimatedMinutes > 120
          ? 'このタスクは2時間以上かかる見込みです。複数のセッションに分けることをお勧めします。'
          : undefined,
    };
  }

  throw new Error('AI API not configured');
}

// AIインサイト生成
export async function generateInsights(tasks: Task[]): Promise<AIInsight[]> {
  if (USE_MOCK_AI) {
    await delay(500);

    const insights: AIInsight[] = [];

    // 期限が今日のタスクをチェック
    const todayTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      const today = new Date();
      return due.toDateString() === today.toDateString();
    });

    if (todayTasks.length >= 3) {
      insights.push({
        type: 'warning',
        title: `今日のタスクが${todayTasks.length}件`,
        description: '多くのタスクが今日期限です。優先順位を見直すことをお勧めします。',
        action: 'スケジュール調整',
      });
    }

    // 緊急タスクのチェック
    const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed');
    if (urgentTasks.length > 0) {
      insights.push({
        type: 'warning',
        title: `緊急タスク: ${urgentTasks[0].title}`,
        description: `このタスクは緊急度が高く設定されています。優先的に対応することをお勧めします。`,
        action: '今すぐ開始',
      });
    }

    // 進行中タスクの提案
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    if (inProgressTasks.length > 0 && inProgressTasks[0].subtasks?.length) {
      const task = inProgressTasks[0];
      const subtasks = task.subtasks || [];
      const completed = subtasks.filter(st => st.status === 'completed').length;
      const total = subtasks.length;
      const progress = Math.round((completed / total) * 100);

      if (progress >= 60 && progress < 100) {
        insights.push({
          type: 'suggestion',
          title: `「${task.title}」あと少しで完了`,
          description: `現在${progress}%完了しています。残りのサブタスクを完了させましょう。`,
          action: '続きを開始',
        });
      }
    }

    // 目標達成予測
    const completedThisWeek = tasks.filter(t => {
      if (!t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return completedDate >= weekAgo;
    }).length;

    insights.push({
      type: 'prediction',
      title: '今週の生産性',
      description: `今週${completedThisWeek}件のタスクを完了しました。現在のペースを維持すれば、月間目標を達成できる見込みです。`,
      action: '詳細を見る',
    });

    return insights;
  }

  throw new Error('AI API not configured');
}

// 今日の優先タスクを提案
export async function suggestPriorityTasks(tasks: Task[]): Promise<Task[]> {
  if (USE_MOCK_AI) {
    await delay(600);

    // スコアリングロジック
    const scoredTasks = tasks
      .filter(t => t.status !== 'completed')
      .map(task => {
        let score = 0;

        // 優先度によるスコア
        if (task.priority === 'urgent') score += 100;
        else if (task.priority === 'high') score += 60;
        else if (task.priority === 'medium') score += 30;
        else score += 10;

        // 期限によるスコア
        if (task.dueDate) {
          const daysUntilDue = Math.ceil(
            (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilDue <= 0) score += 80; // 期限超過
          else if (daysUntilDue === 1) score += 60; // 明日
          else if (daysUntilDue <= 3) score += 40; // 3日以内
          else if (daysUntilDue <= 7) score += 20; // 1週間以内
        }

        // 進行中タスクの優先
        if (task.status === 'in_progress') score += 25;

        return { task, score };
      })
      .sort((a, b) => b.score - a.score);

    return scoredTasks.slice(0, 5).map(st => st.task);
  }

  throw new Error('AI API not configured');
}

// ==================== ヘルパー関数 ====================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateMockSubtasks(title: string): TaskBreakdownResult['subtasks'] {
  // タスクタイトルに基づいてサブタスクを生成
  const titleLower = title.toLowerCase();

  if (titleLower.includes('資料') || titleLower.includes('レポート')) {
    return [
      { title: '情報収集・リサーチ', estimatedMinutes: 45, priority: 'high' },
      { title: '構成案作成', estimatedMinutes: 20, priority: 'high' },
      { title: '本文執筆', estimatedMinutes: 60, priority: 'high' },
      { title: 'グラフ・図表作成', estimatedMinutes: 30, priority: 'medium' },
      { title: 'レビュー・修正', estimatedMinutes: 25, priority: 'medium' },
    ];
  }

  if (titleLower.includes('mtg') || titleLower.includes('会議') || titleLower.includes('ミーティング')) {
    return [
      { title: 'アジェンダ作成', estimatedMinutes: 15, priority: 'high' },
      { title: '資料準備', estimatedMinutes: 30, priority: 'high' },
      { title: '参加者への連絡', estimatedMinutes: 10, priority: 'medium' },
      { title: '会議室・オンライン設定確認', estimatedMinutes: 5, priority: 'low' },
    ];
  }

  if (titleLower.includes('開発') || titleLower.includes('システム')) {
    return [
      { title: '要件確認・整理', estimatedMinutes: 30, priority: 'high' },
      { title: '設計・仕様検討', estimatedMinutes: 45, priority: 'high' },
      { title: '実装', estimatedMinutes: 90, priority: 'high' },
      { title: 'テスト', estimatedMinutes: 30, priority: 'medium' },
      { title: 'レビュー・修正', estimatedMinutes: 30, priority: 'medium' },
    ];
  }

  // デフォルトの分解
  return [
    { title: '準備・計画', estimatedMinutes: 20, priority: 'high' },
    { title: 'メイン作業', estimatedMinutes: 45, priority: 'high' },
    { title: '確認・調整', estimatedMinutes: 15, priority: 'medium' },
  ];
}

function getBaseTimeEstimate(title: string): number {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('資料') || titleLower.includes('レポート')) return 120;
  if (titleLower.includes('mtg') || titleLower.includes('会議')) return 60;
  if (titleLower.includes('開発') || titleLower.includes('システム')) return 180;
  if (titleLower.includes('確認') || titleLower.includes('レビュー')) return 45;
  if (titleLower.includes('メール') || titleLower.includes('連絡')) return 15;

  return 60; // デフォルト
}
