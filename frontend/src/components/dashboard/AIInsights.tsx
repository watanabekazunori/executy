'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Zap,
  ChevronRight,
  Brain,
  Clock,
  Loader2,
  RefreshCw,
  Wand2
} from 'lucide-react'
import { tasksAPI } from '@/lib/api'
import { generateInsights, suggestPriorityTasks, breakdownTask } from '@/lib/ai'

interface AIInsight {
  type: 'warning' | 'suggestion' | 'prediction' | 'automation';
  title: string;
  description: string;
  action?: string;
}

const insightIcons = {
  warning: AlertTriangle,
  suggestion: Lightbulb,
  prediction: TrendingUp,
  automation: Zap,
}

const insightColors = {
  warning: { text: 'text-amber-600', bg: 'bg-amber-50' },
  suggestion: { text: 'text-blue-600', bg: 'bg-blue-50' },
  prediction: { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  automation: { text: 'text-cyan-600', bg: 'bg-cyan-50' },
}

const quickActions = [
  { id: '1', label: '今日の優先タスク', icon: Brain },
  { id: '2', label: 'タスクを分解', icon: Wand2 },
  { id: '3', label: '時間見積もり', icon: Clock },
]

export default function AIInsights() {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<string | null>(null)

  useEffect(() => {
    loadInsights()
  }, [])

  const loadInsights = async () => {
    try {
      setLoading(true)
      const tasks = await tasksAPI.getAll({ parentOnly: true })

      if (tasks.length === 0) {
        setInsights([
          {
            type: 'suggestion',
            title: 'タスクを追加しましょう',
            description: '新規タスクを作成して、AIによる分析や提案を受けられます。',
            action: 'タスクを作成',
          }
        ])
      } else {
        const generatedInsights = await generateInsights(tasks)
        setInsights(generatedInsights)
      }
    } catch (err) {
      console.error('Failed to load insights:', err)
      setInsights([
        {
          type: 'suggestion',
          title: 'AIアシスタント準備完了',
          description: 'タスクの分解や時間見積もりなど、AIがサポートします。',
          action: '試してみる',
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const refreshInsights = async () => {
    setRefreshing(true)
    await loadInsights()
    setRefreshing(false)
  }

  const handleQuickAction = async (actionId: string) => {
    setProcessingAction(actionId)
    setActionResult(null)

    try {
      if (actionId === '1') {
        const tasks = await tasksAPI.getAll({ parentOnly: true })
        if (tasks.length === 0) {
          setActionResult('タスクがありません。新規タスクを作成してください。')
        } else {
          const priorityTasks = await suggestPriorityTasks(tasks)
          if (priorityTasks.length > 0) {
            const taskNames = priorityTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n')
            setActionResult(`今日優先すべきタスク:\n${taskNames}`)
          } else {
            setActionResult('現在進行中のタスクはありません。')
          }
        }
      } else if (actionId === '2') {
        setActionResult('タスクを選択して「AIで分解」ボタンをクリックすると、サブタスクに分解できます。')
      } else if (actionId === '3') {
        setActionResult('タスクを選択すると、AIが過去データに基づいて所要時間を予測します。')
      }
    } catch (err) {
      setActionResult('処理中にエラーが発生しました。')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiInput.trim()) return

    setProcessingAction('chat')
    setActionResult(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (aiInput.includes('優先') || aiInput.includes('今日')) {
        const tasks = await tasksAPI.getAll({ parentOnly: true })
        if (tasks.length === 0) {
          setActionResult('タスクがありません。新規タスクを作成してください。')
        } else {
          const priorityTasks = await suggestPriorityTasks(tasks)
          const taskNames = priorityTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n')
          setActionResult(`今日優先すべきタスク:\n${taskNames}`)
        }
      } else if (aiInput.includes('分解') || aiInput.includes('サブタスク')) {
        setActionResult('タスクを分解するには、タスク詳細画面で「AIで分解」ボタンをクリックしてください。')
      } else {
        setActionResult(`「${aiInput}」について分析中です。具体的な質問をお試しください。`)
      }
    } catch {
      setActionResult('処理中にエラーが発生しました。')
    } finally {
      setProcessingAction(null)
      setAiInput('')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">AI インサイト</h3>
            <p className="text-xs text-slate-500">リアルタイム分析</p>
          </div>
        </div>
        <button
          onClick={refreshInsights}
          disabled={refreshing}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* クイックアクション */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleQuickAction(action.id)}
            disabled={!!processingAction}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            {processingAction === action.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <action.icon className="w-3.5 h-3.5" />
            )}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* アクション結果 */}
      {actionResult && (
        <div className="p-3 mb-4 bg-blue-50 border border-blue-200 rounded-xl">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
            {actionResult}
          </pre>
        </div>
      )}

      {/* インサイトリスト */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = insightIcons[insight.type]
            const colors = insightColors[insight.type]

            return (
              <div
                key={index}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-800 mb-1">{insight.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{insight.description}</p>
                    {insight.action && (
                      <button className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {insight.action}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* AIチャット入力 */}
      <form onSubmit={handleAiSubmit} className="mt-4 pt-4 border-t border-slate-200">
        <div className="relative">
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="AIに質問する..."
            disabled={processingAction === 'chat'}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!aiInput.trim() || processingAction === 'chat'}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {processingAction === 'chat' ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
