'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  ChevronRight,
  Flag,
  MessageSquare,
  Paperclip,
  Play,
  Loader2,
  Video
} from 'lucide-react'
import { Task, tasksAPI } from '@/lib/api'
import TaskDetail from './TaskDetail'

// 優先度設定
const priorities = {
  urgent: { label: '緊急', color: 'text-red-600 bg-red-100', icon: AlertTriangle },
  high: { label: '高', color: 'text-orange-600 bg-orange-100', icon: Flag },
  medium: { label: '中', color: 'text-yellow-600 bg-yellow-100', icon: Flag },
  low: { label: '低', color: 'text-slate-500 bg-slate-100', icon: Flag },
}

// 組織カラー
const orgColors: Record<string, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
}

type FilterType = 'all' | 'today' | 'overdue' | 'inprogress'

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // データ取得
  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await tasksAPI.getAll({ parentOnly: true })
      setTasks(data)
    } catch (err) {
      console.error('Failed to load tasks:', err)
      setError('タスクの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // タスク詳細を開く
  const openTaskDetail = async (task: Task) => {
    try {
      // 詳細データを取得
      const fullTask = await tasksAPI.getById(task.id)
      setSelectedTask(fullTask)
      setDetailOpen(true)
    } catch (err) {
      console.error('Failed to load task detail:', err)
    }
  }

  // フィルタリング
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    if (filter === 'today') {
      if (!task.dueDate) return false
      const due = new Date(task.dueDate)
      const today = new Date()
      return due.toDateString() === today.toDateString()
    }
    if (filter === 'overdue') {
      if (!task.dueDate) return false
      const due = new Date(task.dueDate)
      return due < new Date() && task.status !== 'completed'
    }
    if (filter === 'inprogress') {
      return task.status === 'in_progress'
    }
    return true
  })

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'すべて' },
    { id: 'today', label: '今日' },
    { id: 'overdue', label: '期限超過' },
    { id: 'inprogress', label: '進行中' },
  ]

  // 期限のフォーマット
  const formatDueDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return `今日 ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `明日 ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
    }
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  }

  // 期限ステータス
  const getDueStatus = (dateString?: string) => {
    if (!dateString) return 'none'
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date < today) return 'overdue'
    if (date.toDateString() === today.toDateString()) return 'today'
    if (date.toDateString() === tomorrow.toDateString()) return 'tomorrow'
    return 'upcoming'
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <p className="text-slate-500">{error}</p>
          <button
            onClick={loadTasks}
            className="mt-4 btn-primary"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6 gap-2">
          <h3 className="text-lg font-semibold text-slate-900 flex-shrink-0">タスク</h3>
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === f.id
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* タスクリスト */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              該当するタスクはありません
            </div>
          ) : (
            filteredTasks.map(task => {
              const priority = priorities[task.priority]
              const dueStatus = getDueStatus(task.dueDate)
              const subtasksCompleted = task.subtasks?.filter(st => st.status === 'completed').length || 0
              const subtasksTotal = task.subtasks?.length || 0
              const progress = subtasksTotal > 0 ? Math.round((subtasksCompleted / subtasksTotal) * 100) : 0

              return (
                <div
                  key={task.id}
                  onClick={() => openTaskDetail(task)}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                  className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                    hoveredTask === task.id
                      ? 'bg-slate-50 border-slate-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* チェックボックス */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: ステータス更新
                      }}
                      className="mt-1 text-slate-400 hover:text-primary-500 transition-colors flex-shrink-0"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    {/* メインコンテンツ */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className={`font-medium group-hover:text-slate-900 transition-colors truncate ${
                            task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'
                          }`}>
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                            {/* 組織 */}
                            {task.organization && (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${orgColors[task.organization.color] || 'bg-slate-400'}`} />
                                <span className="text-xs text-slate-500 truncate max-w-[100px]">{task.organization.name}</span>
                              </div>
                            )}
                            {/* プロジェクト */}
                            {task.project && (
                              <span className="text-xs text-slate-500 truncate max-w-[100px]">{task.project.name}</span>
                            )}
                            {/* 優先度 */}
                            <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${priority.color}`}>
                              {priority.label}
                            </span>
                          </div>
                        </div>

                        {/* 右側情報 */}
                        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                          {/* タイマー */}
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="hidden sm:flex opacity-0 group-hover:opacity-100 items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-primary-100 hover:text-primary-600 rounded-lg text-xs transition-all"
                          >
                            <Play className="w-3 h-3" />
                            <span>開始</span>
                          </button>

                          {/* 期限 */}
                          <div className={`flex items-center gap-1 sm:gap-1.5 text-xs whitespace-nowrap ${
                            dueStatus === 'today' ? 'text-yellow-600' :
                            dueStatus === 'overdue' ? 'text-red-600' :
                            'text-slate-500'
                          }`}>
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{formatDueDate(task.dueDate)}</span>
                          </div>

                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all"
                          >
                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>

                      {/* 進捗バー */}
                      {subtasksTotal > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-slate-500">
                              サブタスク {subtasksCompleted}/{subtasksTotal}
                            </span>
                            <span className="text-slate-500">{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* メタ情報 */}
                      <div className="flex items-center gap-2 sm:gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                        {task.estimatedMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {Math.floor(task.estimatedMinutes / 60)}時間{task.estimatedMinutes % 60 > 0 ? `${task.estimatedMinutes % 60}分` : ''}
                          </span>
                        )}
                        {task.meetings && task.meetings.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Video className="w-3.5 h-3.5" />
                            {task.meetings.length}件の打合せ
                          </span>
                        )}
                        {task.sharedLinks && task.sharedLinks.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip className="w-3.5 h-3.5" />
                            {task.sharedLinks.length}件のリンク
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* もっと見る */}
        <button className="w-full mt-4 py-3 text-sm text-slate-500 hover:text-primary-600 flex items-center justify-center gap-2 transition-colors">
          <span>すべてのタスクを見る</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* タスク詳細パネル */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          isOpen={detailOpen}
          onClose={() => {
            setDetailOpen(false)
            setSelectedTask(null)
          }}
          onUpdate={(updatedTask) => {
            setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
            setSelectedTask(updatedTask)
          }}
        />
      )}
    </>
  )
}
