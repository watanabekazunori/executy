'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Zap,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react'
import { tasksAPI } from '@/lib/api'

// クイックアクション
const quickActions = [
  { id: 'focus', label: 'フォーカスモード', icon: Zap, color: 'text-amber-500' },
  { id: 'goals', label: '目標確認', icon: Target, color: 'text-emerald-500' },
  { id: 'schedule', label: '予定調整', icon: Calendar, color: 'text-blue-500' },
]

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    todayTasks: 0,
    completedToday: 0,
    inProgress: 0,
    overdue: 0,
    productivity: 0
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const tasks = await tasksAPI.getAll({})
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayTasks = tasks.filter(t => {
        if (!t.dueDate) return false
        const due = new Date(t.dueDate)
        due.setHours(0, 0, 0, 0)
        return due.getTime() === today.getTime()
      })

      const completedToday = todayTasks.filter(t => t.status === 'completed').length
      const inProgress = tasks.filter(t => t.status === 'in_progress').length
      const overdue = tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false
        return new Date(t.dueDate) < new Date()
      }).length

      const totalTasks = tasks.length
      const completedTasks = tasks.filter(t => t.status === 'completed').length
      const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      setStats({
        todayTasks: todayTasks.length,
        completedToday,
        inProgress,
        overdue,
        productivity
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const statCards = [
    {
      id: 'today',
      label: '今日のタスク',
      value: stats.todayTasks,
      subValue: `${stats.completedToday} 完了`,
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      id: 'inprogress',
      label: '進行中',
      value: stats.inProgress,
      subValue: 'タスク',
      icon: Clock,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'overdue',
      label: '期限超過',
      value: stats.overdue,
      subValue: '対応必要',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      id: 'productivity',
      label: '完了率',
      value: stats.productivity,
      subValue: '%',
      icon: TrendingUp,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    }
  ]

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <div
            key={stat.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-5"
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                <span className="text-slate-500 text-sm">{stat.subValue}</span>
              </div>
              <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* クイックアクション */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map(action => (
          <button
            key={action.id}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 rounded-xl transition-colors border border-slate-200 shadow-sm"
          >
            <action.icon className={`w-4 h-4 ${action.color}`} />
            <span className="text-sm font-medium text-slate-700">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
