'use client'

import React, { useState, useMemo } from 'react'
import { Plus, CheckCircle2, ChevronDown, ChevronRight, Trash2, Play, Pause } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  organizationId: string
  projectId?: string
  estimatedMinutes?: number
  actualMinutes?: number
  comments?: { id: string; content: string; createdAt: string; author: string }[]
}

type TasksProps = {
  onNewTask?: () => void
  onOpenTaskDetail?: (task: Task) => void
}

const TasksSection: React.FC<TasksProps> = ({ onNewTask, onOpenTaskDetail }) => {
  const {
    tasks,
    organizations,
    getOrgById,
    getProjectById,
    updateTaskAPI,
    priorityColors,
    priorityLabels,
    activeTimer,
    timerDisplay,
    startTimer,
    stopTimer,
    showConfirm,
    showToast
  } = useDashboard()

  const [showCompletedTasks, setShowCompletedTasks] = useState(false)

  const filteredTasks = useMemo(() => {
    return tasks.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return (order[a.priority as keyof typeof order] || 1) - (order[b.priority as keyof typeof order] || 1)
    })
  }, [tasks])

  const handleOpenTask = (task: Task) => {
    if (onOpenTaskDetail) {
      onOpenTaskDetail(task)
    }
  }

  const handleDeleteTask = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    showConfirm('このタスクを削除しますか？', async () => {
      try {
        await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
        showToast('タスクを削除しました')
      } catch (error) {
        console.error('Failed to delete task:', error)
        showToast('削除に失敗しました', 'error')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Active Tasks */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">タスク一覧</h2>
          <button
            onClick={onNewTask}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
            <Plus className="w-4 h-4" /> 追加
          </button>
        </div>
        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
          {filteredTasks.filter(t => t.status !== 'completed').length === 0 ? (
            <div className="text-center py-8 text-slate-500">タスクがありません</div>
          ) : (
            filteredTasks.filter(t => t.status !== 'completed').map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 cursor-pointer min-w-0"
                onClick={() => handleOpenTask(task)}>
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateTaskAPI(task.id, { status: 'completed' })
                    }}
                    className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center hover:border-green-500 hover:bg-green-50 flex-shrink-0">
                  </button>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
                      {getOrgById(task.organizationId)?.name} {task.projectId && `/ ${getProjectById(task.projectId)?.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {activeTimer?.taskId === task.id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        stopTimer()
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 whitespace-nowrap">
                      <Pause className="w-3 h-3 flex-shrink-0" />
                      {timerDisplay}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startTimer(task.id, task.title)
                      }}
                      className="p-1.5 hover:bg-blue-100 rounded-lg text-slate-400 hover:text-blue-600 flex-shrink-0"
                      title="タイマー開始">
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${priorityColors[task.priority]}`}>
                    {priorityLabels[task.priority]}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Completed Tasks */}
      <div className="bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => setShowCompletedTasks(!showCompletedTasks)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold text-slate-800">完了済み</h2>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
              {filteredTasks.filter(t => t.status === 'completed').length}
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showCompletedTasks ? 'rotate-180' : ''}`} />
        </button>
        {showCompletedTasks && (
          <div className="divide-y divide-slate-100 border-t border-slate-100 max-h-[300px] overflow-y-auto">
            {filteredTasks.filter(t => t.status === 'completed').length === 0 ? (
              <div className="text-center py-8 text-slate-500">完了したタスクはありません</div>
            ) : (
              filteredTasks.filter(t => t.status === 'completed').map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 cursor-pointer min-w-0"
                  onClick={() => handleOpenTask(task)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateTaskAPI(task.id, { status: 'pending' })
                      }}
                      className="w-5 h-5 rounded border-2 bg-green-500 border-green-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </button>
                    <div className="min-w-0">
                      <p className="font-medium line-through text-slate-400 truncate">{task.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                        {getOrgById(task.organizationId)?.name} {task.projectId && `/ ${getProjectById(task.projectId)?.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteTask(e, task.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(TasksSection)
