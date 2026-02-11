'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface Organization {
  id: string
  name: string
  initial: string
  color: string
}

interface Project {
  id: string
  name: string
  organizationId: string
  color?: string
  description?: string
}

interface NewTaskModalProps {
  open: boolean
  onClose: () => void
  onTaskCreated?: (task: any) => void
  onAnalyzeTask?: (taskId: string) => void
}

export default function NewTaskModal({
  open,
  onClose,
  onTaskCreated,
  onAnalyzeTask,
}: NewTaskModalProps) {
  const { organizations, projects, showToast, tasks, setTasks } = useDashboard()

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')
  const [newTaskOrgId, setNewTaskOrgId] = useState('')
  const [newTaskProjectId, setNewTaskProjectId] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [newTaskEstimate, setNewTaskEstimate] = useState('')
  const [newProjectInline, setNewProjectInline] = useState('')
  const [showInlineProjectInput, setShowInlineProjectInput] = useState(false)

  const handleClose = () => {
    setNewTaskTitle('')
    setNewTaskPriority('medium')
    setNewTaskOrgId('')
    setNewTaskProjectId('')
    setNewTaskDueDate('')
    setNewTaskEstimate('')
    setNewProjectInline('')
    setShowInlineProjectInput(false)
    onClose()
  }

  const createNewTask = async () => {
    if (!newTaskTitle.trim() || !newTaskOrgId) {
      showToast('タスク名と組織は必須です', 'error')
      return
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          status: 'pending',
          priority: newTaskPriority,
          organizationId: newTaskOrgId,
          projectId: newTaskProjectId || undefined,
          dueDate: newTaskDueDate || undefined,
          estimatedMinutes: newTaskEstimate ? parseInt(newTaskEstimate) : undefined,
        }),
      })

      if (res.ok) {
        const newTask = await res.json()
        setTasks((prev: any[]) => [...prev, newTask])
        showToast('タスクを作成しました')

        if (onTaskCreated) {
          onTaskCreated(newTask)
        }

        // Optionally trigger AI analysis
        if (onAnalyzeTask) {
          onAnalyzeTask(newTask.id)
        }

        handleClose()
      } else {
        showToast('タスク作成に失敗しました', 'error')
      }
    } catch (e) {
      console.error(e)
      showToast('タスク作成に失敗しました', 'error')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-semibold text-slate-800">新規タスク</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              タスク名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createNewTask()}
              placeholder="タスク名を入力..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              優先度
            </label>
            <select
              value={newTaskPriority}
              onChange={e => setNewTaskPriority(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              組織 <span className="text-red-500">*</span>
            </label>
            <select
              value={newTaskOrgId}
              onChange={e => setNewTaskOrgId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            >
              {!newTaskOrgId && <option value="">組織を選択してください</option>}
              {organizations.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project selection */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">プロジェクト</label>
            {!showInlineProjectInput ? (
              <div className="flex gap-2">
                <select
                  value={newTaskProjectId}
                  onChange={e => setNewTaskProjectId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">プロジェクトなし</option>
                  {projects
                    .filter(p => p.organizationId === newTaskOrgId)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowInlineProjectInput(true)}
                  className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                  title="新規プロジェクト作成"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProjectInline}
                  onChange={e => setNewProjectInline(e.target.value)}
                  placeholder="新規プロジェクト名..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (newProjectInline.trim()) {
                      try {
                        const colors = [
                          'bg-blue-400',
                          'bg-green-400',
                          'bg-purple-400',
                          'bg-orange-400',
                          'bg-pink-400',
                        ]
                        const res = await fetch('/api/projects', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: newProjectInline.trim(),
                            organizationId: newTaskOrgId,
                            color: colors[projects.length % colors.length],
                            status: 'active',
                          }),
                        })
                        if (res.ok) {
                          const newProj = await res.json()
                          setNewTaskProjectId(newProj.id)
                          setNewProjectInline('')
                          setShowInlineProjectInput(false)
                          showToast('プロジェクトを作成しました')
                        }
                      } catch (e) {
                        console.error(e)
                        showToast('プロジェクト作成に失敗しました', 'error')
                      }
                    }
                  }}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm"
                >
                  作成
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInlineProjectInput(false)
                    setNewProjectInline('')
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">期日</label>
            <input
              type="date"
              value={newTaskDueDate}
              onChange={e => setNewTaskDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">予定時間（分）</label>
            <input
              type="number"
              value={newTaskEstimate}
              onChange={e => setNewTaskEstimate(e.target.value)}
              placeholder="予定時間（分）"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <button
            onClick={createNewTask}
            disabled={!newTaskTitle.trim() || !newTaskOrgId}
            className={`w-full py-2 rounded-lg ${
              !newTaskTitle.trim() || !newTaskOrgId
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            作成
          </button>

          {(!newTaskTitle.trim() || !newTaskOrgId) && (
            <p className="text-xs text-red-500 text-center">タスク名と組織は必須です</p>
          )}
        </div>
      </div>
    </div>
  )
}
