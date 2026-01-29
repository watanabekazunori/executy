'use client'

import { useState } from 'react'
import { X, Plus, CheckCircle2, Play, MoreHorizontal, Edit3, Trash2, FolderKanban } from 'lucide-react'

interface Task {
  id: string; title: string; status: string; priority: string; projectId?: string
}

interface Project {
  id: string; name: string; description?: string; status?: string; organizationId: string
}

interface ProjectDetailModalProps {
  project: Project
  tasks: Task[]
  onClose: () => void
  onTaskClick: (task: Task) => void
  onNewTask: () => void
  onTaskStatusChange: (taskId: string, status: string) => void
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700'
}

const priorityLabels: Record<string, string> = { high: '高', medium: '中', low: '低' }

export default function ProjectDetailModal({ project, tasks, onClose, onTaskClick, onNewTask, onTaskStatusChange }: ProjectDetailModalProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')

  const projectTasks = tasks.filter(t => t.projectId === project.id)
  const filteredTasks = filter === 'all' ? projectTasks : projectTasks.filter(t => t.status === filter)

  const completedCount = projectTasks.filter(t => t.status === 'completed').length
  const totalCount = projectTasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const statusCounts = {
    pending: projectTasks.filter(t => t.status === 'pending').length,
    in_progress: projectTasks.filter(t => t.status === 'in_progress').length,
    completed: completedCount
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">{project.name}</h2>
              <p className="text-sm text-slate-500">{project.description || 'プロジェクト詳細'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 進捗サマリー */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">プロジェクト進捗</span>
            <span className="text-sm font-medium text-blue-600">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-slate-500">未着手: <span className="font-medium text-slate-700">{statusCounts.pending}</span></span>
            <span className="text-slate-500">進行中: <span className="font-medium text-slate-700">{statusCounts.in_progress}</span></span>
            <span className="text-slate-500">完了: <span className="font-medium text-slate-700">{statusCounts.completed}</span></span>
          </div>
        </div>

        {/* フィルター＆アクション */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
          <div className="flex gap-2">
            {(['all', 'pending', 'in_progress', 'completed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm ${filter === f ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                {f === 'all' ? '全て' : f === 'pending' ? '未着手' : f === 'in_progress' ? '進行中' : '完了'}
              </button>
            ))}
          </div>
          <button onClick={onNewTask} className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
            <Plus className="w-4 h-4" /> タスク追加
          </button>
        </div>

        {/* タスクリスト */}
        <div className="flex-1 overflow-y-auto">
          {filteredTasks.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              {filter === 'all' ? 'タスクがありません' : '該当するタスクがありません'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 cursor-pointer" onClick={() => onTaskClick(task)}>
                  <div className="flex items-center gap-3">
                    <button onClick={(e) => { e.stopPropagation(); onTaskStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed') }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-slate-400'}`}>
                      {task.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                      {priorityLabels[task.priority]}
                    </span>
                    {task.status === 'in_progress' && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">進行中</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
