'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  ListTodo, CheckCircle2, TrendingUp, AlertTriangle, RefreshCw, Loader2,
  Clock, Play, Pause, Calendar, Sparkles, ChevronRight, ExternalLink
} from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  organizationId: string
  projectId?: string
  estimatedMinutes?: number
  actualMinutes?: number
  progress?: number
  blockers?: string
  nextActions?: string
  slackLink?: string
  docLinks?: string[]
  driveLinks?: string[]
  dependentTaskIds?: string[]
  comments?: { id: string; content: string; createdAt: string; author: string }[]
}

interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  allDay: boolean
  location?: string
  htmlLink?: string
}

interface ScheduleItem {
  taskId: string
  taskTitle: string
  date: string
  startTime: string
  endTime: string
  reason: string
}

type TaskFilterType = 'all' | 'today' | 'overdue' | 'in_progress' | 'completed'
type TaskSortType = 'priority' | 'dueDate' | 'created'

interface DashboardSectionProps {
  onOpenTaskDetail?: (task: any) => void
  onOpenScheduleModal?: () => void
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ onOpenTaskDetail, onOpenScheduleModal }) => {
  const {
    organizations,
    tasks,
    loading,
    activeTimer,
    timerDisplay,
    startTimer,
    stopTimer,
    completedCount,
    inProgressCount,
    overdueCount,
    getOrgById,
    getProjectById,
    updateTaskAPI,
    priorityColors,
    priorityLabels,
    calendarEvents,
    calendarLoading,
    loadCalendarEvents,
  } = useDashboard()

  const [aiSchedule] = useState<{ schedule: ScheduleItem[] } | null>(null)
  const [taskFilter, setTaskFilter] = useState<TaskFilterType>('all')
  const [taskSort, setTaskSort] = useState<TaskSortType>('priority')
  const [orgFilter, setOrgFilter] = useState<string>('all')
  const [dashboardAdvice, setDashboardAdvice] = useState<string[]>([])
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [schedulingLoading, setSchedulingLoading] = useState(false)

  const loadDashboardAdvice = useCallback(async () => {
    setAdviceLoading(true)
    try {
      const response = await fetch('/api/ai/analyze-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskStats: {
            total: tasks.length,
            completed: completedCount,
            inProgress: inProgressCount,
            overdue: overdueCount
          }
        })
      })
      if (response.ok) {
        const data = await response.json()
        setDashboardAdvice(Array.isArray(data.advice) ? data.advice : [])
      }
    } catch (error) {
      console.error('Failed to load dashboard advice:', error)
    } finally {
      setAdviceLoading(false)
    }
  }, [tasks.length, completedCount, inProgressCount, overdueCount])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (orgFilter !== 'all' && task.organizationId !== orgFilter) return false
      if (taskFilter === 'completed') return task.status === 'completed'
      if (taskFilter === 'today') {
        const today = new Date().toISOString().split('T')[0]
        return task.dueDate?.startsWith(today)
      }
      if (taskFilter === 'overdue') {
        return task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && task.status !== 'completed'
      }
      if (taskFilter === 'in_progress') return task.status === 'in_progress'
      return true
    })
  }, [tasks, orgFilter, taskFilter])

  const handleLoadData = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks?parentOnly=true')
      if (response.ok) {
        // This would update through context in real implementation
      }
    } catch (error) {
      console.error('Failed to reload data:', error)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Timer Display */}
      {activeTimer && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-700 font-medium text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">{activeTimer.taskTitle}</span>
            <span className="text-xl sm:text-2xl font-mono text-green-800">{timerDisplay}</span>
          </div>
          <button onClick={stopTimer} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm whitespace-nowrap">
            <Pause className="w-4 h-4 inline mr-1" /> 停止
          </button>
        </div>
      )}

      {/* AI Advice */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-purple-800">AIアドバイス</span>
          </div>
          <button onClick={loadDashboardAdvice} className="p-1 hover:bg-purple-100 rounded" title="更新">
            <RefreshCw className={`w-4 h-4 text-purple-500 ${adviceLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {adviceLoading ? (
          <div className="flex items-center gap-2 text-purple-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">分析中...</span>
          </div>
        ) : dashboardAdvice.length > 0 ? (
          <ul className="space-y-1">
            {dashboardAdvice.map((advice, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-purple-700">
                <span className="text-purple-400">•</span>
                {advice}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-purple-600">タスクを追加するとアドバイスが表示されます</p>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div
          onClick={() => setTaskFilter('all')}
          className={`bg-white rounded-xl border p-3 sm:p-5 cursor-pointer transition-all hover:shadow-md ${taskFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0"><ListTodo className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /></div>
            <span className="text-xs sm:text-sm text-slate-600 truncate">未完了</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{tasks.filter(t => t.status !== 'completed').length}</p>
        </div>
        <div
          onClick={() => setTaskFilter('completed')}
          className={`bg-white rounded-xl border p-3 sm:p-5 cursor-pointer transition-all hover:shadow-md ${taskFilter === 'completed' ? 'border-green-500 ring-2 ring-green-200' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /></div>
            <span className="text-xs sm:text-sm text-slate-600 truncate">完了</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{completedCount}</p>
        </div>
        <div
          onClick={() => setTaskFilter('in_progress')}
          className={`bg-white rounded-xl border p-3 sm:p-5 cursor-pointer transition-all hover:shadow-md ${taskFilter === 'in_progress' ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" /></div>
            <span className="text-xs sm:text-sm text-slate-600 truncate">進行中</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{inProgressCount}</p>
        </div>
        <div
          onClick={() => setTaskFilter('overdue')}
          className={`bg-white rounded-xl border p-3 sm:p-5 cursor-pointer transition-all hover:shadow-md ${taskFilter === 'overdue' ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" /></div>
            <span className="text-xs sm:text-sm text-slate-600 truncate">期限超過</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">{overdueCount}</p>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 gap-2 sm:gap-0">
          <h2 className="font-semibold text-slate-800">タスク一覧</h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded-lg text-xs sm:text-sm">
              <option value="all">全組織</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            <select
              value={taskSort}
              onChange={(e) => setTaskSort(e.target.value as TaskSortType)}
              className="px-2 py-1 border border-slate-200 rounded-lg text-xs sm:text-sm">
              <option value="priority">優先度順</option>
              <option value="dueDate">期限順</option>
              <option value="created">作成順</option>
            </select>
            <div className="flex gap-1 overflow-x-auto">
              {(['all', 'today', 'in_progress', 'overdue', 'completed'] as const).map(f => (
                <button key={f} onClick={() => setTaskFilter(f)}
                  className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap ${taskFilter === f ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {f === 'all' ? '全て' : f === 'today' ? '今日' : f === 'in_progress' ? '進行中' : f === 'overdue' ? '期限超過' : '完了'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
          ) : (taskFilter === 'completed' ? filteredTasks : filteredTasks.filter(t => t.status !== 'completed')).length === 0 ? (
            <div className="p-10 text-center text-slate-500">タスクがありません</div>
          ) : (
            [...(taskFilter === 'completed' ? filteredTasks : filteredTasks.filter(t => t.status !== 'completed'))]
              .sort((a, b) => {
                if (taskSort === 'priority') {
                  const order = { high: 0, medium: 1, low: 2 }
                  return (order[a.priority as keyof typeof order] || 1) - (order[b.priority as keyof typeof order] || 1)
                }
                if (taskSort === 'dueDate') {
                  if (!a.dueDate) return 1
                  if (!b.dueDate) return -1
                  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
                }
                return 0
              })
              .map(task => {
                const estimated = task.estimatedMinutes || 0
                const actual = task.actualMinutes || 0
                const remaining = Math.max(0, estimated - actual)
                return (
                  <div key={task.id} onClick={() => onOpenTaskDetail?.(task)} className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-5 py-3 sm:py-4 hover:bg-slate-50 cursor-pointer gap-2 sm:gap-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <button onClick={() => updateTaskAPI(task.id, { status: 'completed' }).then(handleLoadData)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-green-500 hover:bg-green-50'}`}>
                        {task.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium text-sm sm:text-base truncate ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap min-w-0">
                          {task.projectId && <span className="text-xs text-slate-500 truncate max-w-[100px]">{getProjectById(task.projectId)?.name}</span>}
                          {task.dueDate && <span className={`text-xs flex-shrink-0 ${new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'text-red-500 font-medium' : 'text-slate-500'}`}>期限: {task.dueDate}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 ml-7 sm:ml-0 flex-shrink-0">
                      {estimated > 0 && (
                        <div className="text-right mr-1 sm:mr-2 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>{estimated}分</span>
                          </div>
                          {actual > 0 && (
                            <div className={`text-xs ${remaining > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                              残り{remaining}分
                            </div>
                          )}
                        </div>
                      )}
                      {activeTimer?.taskId === task.id ? (
                        <button
                          onClick={() => stopTimer()}
                          className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 whitespace-nowrap">
                          <Pause className="w-3 h-3 flex-shrink-0" />
                          {timerDisplay}
                        </button>
                      ) : (
                        <button
                          onClick={() => startTimer(task.id, task.title)}
                          className="p-1.5 rounded-lg hover:bg-green-100 text-slate-400 hover:text-green-600 flex-shrink-0"
                          title="タイマー開始">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${priorityColors[task.priority]}`}>{priorityLabels[task.priority]}</span>
                    </div>
                  </div>
                )
              })
          )}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 gap-2">
          <h2 className="font-semibold text-slate-800">今日のスケジュール</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenScheduleModal?.()}
              className="flex items-center gap-1 text-xs sm:text-sm text-purple-600 hover:text-purple-700">
              <Sparkles className="w-4 h-4" />
              AI提案
            </button>
            <button
              onClick={loadCalendarEvents}
              className="flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-700"
              disabled={calendarLoading}>
              {calendarLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              更新
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
          {calendarLoading ? (
            <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
          ) : (() => {
            const todayStr = new Date().toISOString().split('T')[0]
            type ScheduleEvent = {
              id: string
              title: string
              startTime: string
              endTime: string
              allDay: boolean
              type: 'google' | 'ai'
              location?: string
              htmlLink?: string
              reason?: string
              taskId?: string
            }
            const googleEvents: ScheduleEvent[] = calendarEvents
              .filter(e => e.startTime.startsWith(todayStr))
              .map(e => ({ ...e, type: 'google' as const }))
            const aiEvents: ScheduleEvent[] = (aiSchedule?.schedule || [])
              .filter((s: ScheduleItem) => s.date === todayStr)
              .map((s: ScheduleItem) => ({
                id: `ai-${s.taskId}`,
                title: s.taskTitle,
                startTime: `${s.date}T${s.startTime}`,
                endTime: `${s.date}T${s.endTime}`,
                allDay: false,
                type: 'ai' as const,
                reason: s.reason,
                taskId: s.taskId
              }))
            const allEvents = [...googleEvents, ...aiEvents].sort((a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            )

            if (allEvents.length === 0) {
              return (
                <div className="p-8 text-center text-slate-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">今日の予定はありません</p>
                </div>
              )
            }

            return allEvents.map(event => (
              <div key={event.id} className={`px-3 sm:px-5 py-3 hover:bg-slate-50 ${event.type === 'ai' ? 'bg-purple-50/50' : ''}`}>
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="text-center min-w-[45px] sm:min-w-[50px] flex-shrink-0">
                    <p className={`text-sm font-medium ${event.type === 'ai' ? 'text-purple-600' : 'text-blue-600'}`}>
                      {event.allDay ? '終日' : new Date(event.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {!event.allDay && (
                      <p className="text-xs text-slate-400 whitespace-nowrap">
                        〜{new Date(event.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{event.title}</p>
                      {event.type === 'ai' && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-xs rounded flex-shrink-0">AI</span>
                      )}
                    </div>
                    {event.type === 'google' && event.location && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{event.location}</p>
                    )}
                    {event.type === 'ai' && event.reason && (
                      <p className="text-xs text-purple-500 mt-0.5 truncate">{event.reason}</p>
                    )}
                  </div>
                  {event.type === 'google' && event.htmlLink && (
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 flex-shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {event.type === 'ai' && (
                    <button className="text-slate-400 hover:text-purple-600 flex-shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          })()}
        </div>
      </div>
    </div>
  )
}

export default React.memo(DashboardSection)
