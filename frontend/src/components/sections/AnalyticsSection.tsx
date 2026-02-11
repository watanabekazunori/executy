'use client'

import React, { useMemo } from 'react'
import { CheckCircle2, Clock, Target, AlertTriangle, TrendingUp } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  projectId?: string
}

const AnalyticsSection: React.FC = () => {
  const {
    tasks,
    projects,
    completedCount,
    inProgressCount,
    overdueCount,
    todayTotalMinutes,
    priorityLabels,
    getOrgById
  } = useDashboard()

  const completionRate = useMemo(() => {
    return tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0
  }, [tasks.length, completedCount])

  const projectProgress = useMemo(() => {
    return projects.map(proj => {
      const projTasks = tasks.filter(t => t.projectId === proj.id)
      const completed = projTasks.filter(t => t.status === 'completed').length
      const total = projTasks.length
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0
      return { ...proj, completed, total, rate }
    })
  }, [projects, tasks])

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-slate-600 truncate">完了率</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{completionRate}%</p>
          <p className="text-xs text-slate-500 mt-1 truncate">{completedCount}/{tasks.length} タスク完了</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-600 truncate">総作業時間</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{Math.floor(todayTotalMinutes / 60)}h {todayTotalMinutes % 60}m</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-slate-600 truncate">進行中</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{inProgressCount}</p>
          <p className="text-xs text-slate-500 mt-1 truncate">{inProgressCount} タスク進行中</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-slate-600 truncate">期限超過</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{overdueCount}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Priority Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">優先度別タスク</h3>
          <div className="space-y-3">
            {(['high', 'medium', 'low'] as const).map(p => {
              const total = tasks.filter(t => t.priority === p).length
              const done = tasks.filter(t => t.priority === p && t.status === 'completed').length
              const rate = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                <div key={p} className="flex items-center gap-3 min-w-0">
                  <span className={`w-16 text-sm flex-shrink-0 ${p === 'high' ? 'text-red-600' : p === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {priorityLabels[p]}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-500 flex-shrink-0 whitespace-nowrap">{done}/{total}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Project Progress Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">プロジェクト別進捗</h3>
          <div className="space-y-3">
            {projectProgress.slice(0, 5).map(proj => (
              <div key={proj.id} className="flex items-center gap-3 min-w-0">
                <span className="text-sm text-slate-600 truncate flex-shrink-0 max-w-[80px]">{proj.name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${proj.rate}%` }}
                  />
                </div>
                <span className="text-sm text-slate-500 flex-shrink-0 whitespace-nowrap">{proj.completed}/{proj.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(AnalyticsSection)
