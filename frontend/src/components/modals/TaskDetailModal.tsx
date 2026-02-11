'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Edit3,
  Save,
  CheckCircle2,
  MessageSquare,
  FileText,
  ExternalLink,
  Clock,
  Sparkles,
  Loader2,
  Link as LinkIcon,
  Target,
} from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface Comment {
  id: string
  content: string
  createdAt: string
  author: string
}

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
  comments?: Comment[]
}

interface TaskDetailModalProps {
  open: boolean
  onClose: () => void
  task: Task | null
  onOpenPlanning?: (task: Task) => void
}

export default function TaskDetailModal({ open, onClose, task, onOpenPlanning }: TaskDetailModalProps) {
  const {
    updateTaskAPI,
    projects,
    getOrgById,
    showToast,
    tasks,
    setTasks,
  } = useDashboard()

  const [editingTask, setEditingTask] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedProgress, setEditedProgress] = useState(0)
  const [editedBlockers, setEditedBlockers] = useState('')
  const [editedNextActions, setEditedNextActions] = useState('')
  const [editedSlackLink, setEditedSlackLink] = useState('')
  const [newDocLink, setNewDocLink] = useState('')
  const [taskDocLinks, setTaskDocLinks] = useState<string[]>([])
  const [newDriveLink, setNewDriveLink] = useState('')
  const [taskDriveLinks, setTaskDriveLinks] = useState<string[]>([])
  const [newComment, setNewComment] = useState('')
  const [taskComments, setTaskComments] = useState<Comment[]>([])
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  useEffect(() => {
    if (task) {
      setEditedTitle(task.title)
      setEditedDescription(task.description || '')
      setEditedProgress(task.progress || 0)
      setEditedBlockers(task.blockers || '')
      setEditedNextActions(task.nextActions || '')
      setEditedSlackLink(task.slackLink || '')
      setTaskDocLinks(task.docLinks || [])
      setTaskDriveLinks(task.driveLinks || [])
      setTaskComments(task.comments || [])
      loadSubtasks(task.id)
    }
  }, [task])

  const loadSubtasks = async (taskId: string) => {
    setLoadingSubtasks(true)
    try {
      const res = await fetch(`/api/tasks?parentId=${taskId}`)
      if (res.ok) {
        const data = await res.json()
        setSubtasks(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSubtasks(false)
    }
  }

  const saveTaskDetail = async () => {
    if (!task) return
    try {
      const updated = await updateTaskAPI(task.id, {
        title: editedTitle,
        description: editedDescription,
        progress: editedProgress,
        blockers: editedBlockers,
        nextActions: editedNextActions,
        slackLink: editedSlackLink,
        docLinks: taskDocLinks,
        driveLinks: taskDriveLinks,
      })
      setTasks((prev: Task[]) => prev.map(t => (t.id === task.id ? updated : t)))
      setEditingTask(false)
      showToast('タスクを更新しました')
    } catch (e) {
      console.error(e)
      showToast('更新に失敗しました', 'error')
    }
  }

  const toggleSubtaskStatus = async (subtask: Task) => {
    try {
      const newStatus = subtask.status === 'completed' ? 'pending' : 'completed'
      const updated = await updateTaskAPI(subtask.id, { status: newStatus })
      setSubtasks(subtasks.map(s => (s.id === subtask.id ? updated : s)))
    } catch (e) {
      console.error(e)
      showToast('更新に失敗しました', 'error')
    }
  }

  const addSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          status: 'pending',
          priority: 'medium',
          organizationId: task.organizationId,
          projectId: task.projectId,
          parentId: task.id,
        }),
      })
      if (res.ok) {
        const newSubtask = await res.json()
        setSubtasks([...subtasks, newSubtask])
        setNewSubtaskTitle('')
        showToast('サブタスクを追加しました')
      }
    } catch (e) {
      console.error(e)
      showToast('追加に失敗しました', 'error')
    }
  }

  if (!open || !task) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-white rounded-t-2xl sticky top-0 z-10 gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-800 text-sm sm:text-base truncate">
              {task.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 truncate">
              {getOrgById(task.organizationId)?.name}{' '}
              {task.projectId &&
                `/ ${projects.find(p => p.id === task.projectId)?.name}`}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {editingTask ? (
              <button
                onClick={saveTaskDetail}
                className="px-2 sm:px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs sm:text-sm"
              >
                <Save className="w-4 h-4 inline mr-1" />
                保存
              </button>
            ) : (
              <button
                onClick={() => setEditingTask(true)}
                className="px-2 sm:px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm"
              >
                <Edit3 className="w-4 h-4 inline mr-1" />
                編集
              </button>
            )}
            {onOpenPlanning && (
              <button
                onClick={() => onOpenPlanning(task)}
                className="px-2 sm:px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs sm:text-sm hover:bg-purple-200"
              >
                <Target className="w-4 h-4 inline mr-1" />
                <span className="hidden sm:inline">計画</span>
              </button>
            )}
            {task.status !== 'completed' && (
              <button
                onClick={async () => {
                  try {
                    const updated = await updateTaskAPI(task.id, {
                      status: 'completed',
                    })
                    setTasks((prev: Task[]) => prev.map(t => (t.id === task.id ? updated : t)))
                    onClose()
                    showToast('タスクを完了にしました')
                  } catch (e) {
                    console.error(e)
                    showToast('更新に失敗しました', 'error')
                  }
                }}
                className="px-2 sm:px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs sm:text-sm"
              >
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                <span className="hidden sm:inline">完了</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Title Edit */}
          {editingTask && (
            <div>
              <label className="block text-sm text-slate-600 mb-1">タイトル</label>
              <input
                type="text"
                value={editedTitle}
                onChange={e => setEditedTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">説明</label>
            {editingTask ? (
              <textarea
                value={editedDescription}
                onChange={e => setEditedDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                rows={3}
              />
            ) : (
              <p className="text-slate-700">{task.description || '説明なし'}</p>
            )}
          </div>

          {/* Progress */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              進捗 ({editedProgress}%)
            </label>
            {editingTask ? (
              <input
                type="range"
                min={0}
                max={100}
                value={editedProgress}
                onChange={e => setEditedProgress(parseInt(e.target.value))}
                className="w-full"
              />
            ) : (
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${task.progress || 0}%` }}
                />
              </div>
            )}
          </div>

          {/* Blockers */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">ブロッカー</label>
            {editingTask ? (
              <textarea
                value={editedBlockers}
                onChange={e => setEditedBlockers(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                rows={2}
                placeholder="進捗を妨げている要因..."
              />
            ) : (
              <p className="text-slate-700">{task.blockers || 'なし'}</p>
            )}
          </div>

          {/* Next Actions */}
          <div>
            <label className="block text-sm text-slate-600 mb-1">次のアクション</label>
            {editingTask ? (
              <textarea
                value={editedNextActions}
                onChange={e => setEditedNextActions(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                rows={2}
                placeholder="次に取るべきアクション..."
              />
            ) : (
              <p className="text-slate-700">{task.nextActions || 'なし'}</p>
            )}
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-slate-600">サブタスク</label>
              {subtasks.length > 0 && (
                <span className="text-xs text-slate-500">
                  合計: {subtasks.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0)}分
                </span>
              )}
            </div>
            {loadingSubtasks ? (
              <div className="text-center py-4">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {subtasks.map(sub => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSubtaskStatus(sub)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          sub.status === 'completed'
                            ? 'bg-green-500 border-green-500'
                            : 'border-slate-300'
                        }`}
                      >
                        {sub.status === 'completed' && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </button>
                      <span
                        className={
                          sub.status === 'completed'
                            ? 'line-through text-slate-400'
                            : 'text-slate-700'
                        }
                      >
                        {sub.title}
                      </span>
                    </div>
                    {sub.estimatedMinutes && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {sub.estimatedMinutes}分
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubtask()}
                    placeholder="サブタスクを追加（AIが所要時間を見積もります）"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={addSubtask}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    追加
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="space-y-4">
            {/* Slack Link */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Slackリンク
              </label>
              {task.slackLink ? (
                <div className="flex items-center gap-2">
                  <a
                    href={task.slackLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <MessageSquare className="w-4 h-4" /> Slackを開く
                  </a>
                  <button
                    onClick={() => {
                      setEditedSlackLink('')
                      updateTaskAPI(task.id, { slackLink: '' }).then((updated: any) => {
                        setTasks((prev: Task[]) => prev.map(t => (t.id === updated.id ? updated : t)))
                      })
                    }}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editedSlackLink}
                    onChange={e => setEditedSlackLink(e.target.value)}
                    placeholder="https://slack.com/..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => {
                      if (editedSlackLink.trim()) {
                        updateTaskAPI(task.id, {
                          slackLink: editedSlackLink.trim(),
                        }).then((updated: any) => {
                          setTasks((prev: Task[]) => prev.map(t => (t.id === updated.id ? updated : t)))
                          setEditedSlackLink('')
                        })
                      }
                    }}
                    className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
                  >
                    追加
                  </button>
                </div>
              )}
            </div>

            {/* Document Links */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ドキュメント
              </label>
              <div className="space-y-2">
                {taskDocLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-blue-600 hover:underline flex items-center gap-1 text-sm truncate"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />{' '}
                      {link.length > 40 ? link.substring(0, 40) + '...' : link}
                    </a>
                    <button
                      onClick={() => {
                        const newLinks = taskDocLinks.filter((_, idx) => idx !== i)
                        setTaskDocLinks(newLinks)
                        updateTaskAPI(task.id, { docLinks: newLinks }).then((updated: any) => {
                          setTasks((prev: Task[]) => prev.map(t => (t.id === updated.id ? updated : t)))
                        })
                      }}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDocLink}
                    onChange={e => setNewDocLink(e.target.value)}
                    placeholder="https://docs.google.com/..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => {
                      if (newDocLink.trim()) {
                        const newLinks = [...taskDocLinks, newDocLink.trim()]
                        setTaskDocLinks(newLinks)
                        updateTaskAPI(task.id, { docLinks: newLinks }).then((updated: any) => {
                          setTasks((prev: Task[]) => prev.map(t => (t.id === updated.id ? updated : t)))
                        })
                        setNewDocLink('')
                      }
                    }}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>

            {/* Google Drive Links */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Google Driveリンク
              </label>
              <div className="space-y-2">
                {taskDriveLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-blue-600 hover:underline flex items-center gap-1 text-sm truncate"
                    >
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />{' '}
                      {link.length > 40 ? link.substring(0, 40) + '...' : link}
                    </a>
                    <button
                      onClick={() => {
                        const newLinks = taskDriveLinks.filter((_, idx) => idx !== i)
                        setTaskDriveLinks(newLinks)
                        updateTaskAPI(task.id, { driveLinks: newLinks }).then((updated: any) => {
                          setTasks((prev: Task[]) => prev.map(t => (t.id === updated.id ? updated : t)))
                        })
                      }}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDriveLink}
                    onChange={e => setNewDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => {
                      if (newDriveLink.trim()) {
                        const newLinks = [...taskDriveLinks, newDriveLink.trim()]
                        setTaskDriveLinks(newLinks)
                        updateTaskAPI(task.id, { driveLinks: newLinks }).then((updated: any) => {
                          setTasks((prev: Task[]) => prev.map(t => (t.id === updated.id ? updated : t)))
                        })
                        setNewDriveLink('')
                      }
                    }}
                    className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
