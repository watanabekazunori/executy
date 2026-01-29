'use client'

import { BarChart3, TrendingUp, Clock, CheckCircle2, Target, Calendar } from 'lucide-react'

interface Task {
  id: string; status: string; priority: string; dueDate?: string; organizationId: string; projectId?: string
  estimatedMinutes?: number; actualMinutes?: number
}

interface TimeEntry {
  id: string; taskId: string; duration: number; startTime: string
}

interface Goal {
  id: string; title: string; progress: number
}

interface AnalyticsViewProps {
  tasks: Task[]
  timeEntries: TimeEntry[]
  goals: Goal[]
}

export default function AnalyticsView({ tasks, timeEntries, goals }: AnalyticsViewProps) {
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const totalTasks = tasks.length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const totalMinutes = timeEntries.reduce((s, e) => s + e.duration, 0)
  const avgMinutesPerDay = timeEntries.length > 0 ? Math.round(totalMinutes / 7) : 0

  const highPriorityCompleted = tasks.filter(t => t.priority === 'high' && t.status === 'completed').length
  const highPriorityTotal = tasks.filter(t => t.priority === 'high').length

  const overdueTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'completed') return false
    return t.dueDate < new Date().toISOString().split('T')[0]
  }).length

  const avgGoalProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0

  // 週別データ（モック）
  const weeklyData = [
    { day: '月', tasks: 5, hours: 6 },
    { day: '火', tasks: 8, hours: 7.5 },
    { day: '水', tasks: 3, hours: 5 },
    { day: '木', tasks: 6, hours: 8 },
    { day: '金', tasks: 4, hours: 6.5 },
    { day: '土', tasks: 2, hours: 3 },
    { day: '日', tasks: 1, hours: 1 },
  ]

  const maxTasks = Math.max(...weeklyData.map(d => d.tasks))
  const maxHours = Math.max(...weeklyData.map(d => d.hours))

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-slate-600">完了率</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{completionRate}%</p>
          <p className="text-xs text-slate-500 mt-1">{completedTasks}/{totalTasks} タスク完了</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-600">平均作業時間/日</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{Math.floor(avgMinutesPerDay / 60)}h {avgMinutesPerDay % 60}m</p>
          <p className="text-xs text-slate-500 mt-1">週間合計: {Math.floor(totalMinutes / 60)}時間</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-slate-600">目標達成度</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{avgGoalProgress}%</p>
          <p className="text-xs text-slate-500 mt-1">{goals.length} 個の目標</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-slate-600">期限超過</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{overdueTasks}</p>
          <p className="text-xs text-slate-500 mt-1">要対応タスク</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 週間タスク完了グラフ */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">週間タスク完了数</h3>
          <div className="flex items-end justify-between h-40 gap-2">
            {weeklyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '120px' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all"
                    style={{ height: `${(d.tasks / maxTasks) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-600">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 週間作業時間グラフ */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">週間作業時間</h3>
          <div className="flex items-end justify-between h-40 gap-2">
            {weeklyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '120px' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg transition-all"
                    style={{ height: `${(d.hours / maxHours) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-600">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 優先度別統計 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">優先度別タスク状況</h3>
        <div className="grid grid-cols-3 gap-4">
          {(['high', 'medium', 'low'] as const).map(priority => {
            const total = tasks.filter(t => t.priority === priority).length
            const completed = tasks.filter(t => t.priority === priority && t.status === 'completed').length
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0
            const colors = { high: 'red', medium: 'yellow', low: 'green' }
            const labels = { high: '高優先度', medium: '中優先度', low: '低優先度' }

            return (
              <div key={priority} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium text-${colors[priority]}-600`}>{labels[priority]}</span>
                  <span className="text-sm text-slate-500">{completed}/{total}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full bg-${colors[priority]}-500 rounded-full`} style={{ width: `${rate}%` }} />
                </div>
                <p className="text-right text-xs text-slate-500 mt-1">{rate}% 完了</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
