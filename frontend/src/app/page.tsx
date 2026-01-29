'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, ListTodo, FolderKanban, Target, Clock, Calendar, BarChart3,
  Sparkles, Bell, Plus, ChevronDown, Building2, CheckCircle2,
  AlertTriangle, TrendingUp, MoreHorizontal, X, Play, Pause, Trash2, Edit3, Save,
  Zap, MessageSquare, Link as LinkIcon, User, LogOut, Square, Coffee, Heart, Brain,
  FileText, ExternalLink, ArrowRight, RefreshCw, Send, Loader2, ChevronRight, Settings,
  ChevronLeft, Mail, Link2, Shield
} from 'lucide-react'

// 型定義
interface Organization { id: string; name: string; initial: string; color: string }
interface Project { id: string; name: string; organizationId: string; color?: string; description?: string; status?: string }
interface Task {
  id: string; title: string; description?: string; status: string; priority: string
  dueDate?: string; organizationId: string; projectId?: string
  estimatedMinutes?: number; actualMinutes?: number
  progress?: number; blockers?: string; nextActions?: string
  slackLink?: string; docLinks?: string[]; driveLinks?: string[]; dependentTaskIds?: string[]
  comments?: Comment[]
}
interface Comment { id: string; content: string; createdAt: string; author: string }
interface Goal { id: string; title: string; progress: number; targetValue: number; currentValue: number; unit: string; quarter: string }
interface TimeEntry { id: string; taskId: string; taskTitle: string; startTime: string; endTime?: string; duration: number }
interface Notification { id: string; type: string; message: string; createdAt: string; read: boolean; taskId?: string }
interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string }
interface Meeting { id: string; title: string; startTime: string; endTime: string; organizationId: string }

// API関数
async function fetchOrganizations(): Promise<Organization[]> {
  const res = await fetch('/api/organizations'); return res.ok ? res.json() : []
}
async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects'); return res.ok ? res.json() : []
}
async function fetchTasks(): Promise<Task[]> {
  const res = await fetch('/api/tasks?parentOnly=true'); return res.ok ? res.json() : []
}
async function updateTaskAPI(id: string, data: Partial<Task>): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed'); return res.json()
}
async function createTaskAPI(data: Partial<Task>): Promise<Task> {
  const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed'); return res.json()
}

// 優先度色
const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200'
}
const priorityLabels: Record<string, string> = { high: '高', medium: '中', low: '低' }
const statusLabels: Record<string, string> = { pending: '未着手', in_progress: '進行中', completed: '完了', blocked: 'ブロック' }

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false) // モバイルではデフォルト非表示
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'overdue' | 'in_progress' | 'completed'>('all')
  const [taskSort, setTaskSort] = useState<'priority' | 'dueDate' | 'created'>('priority')
  const [orgFilter, setOrgFilter] = useState<string>('all') // 組織フィルター
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // AIアドバイス
  const [dashboardAdvice, setDashboardAdvice] = useState<string[]>([])
  const [adviceLoading, setAdviceLoading] = useState(false)

  // データ
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // タスク詳細
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskDetailOpen, setTaskDetailOpen] = useState(false)
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

  // サブタスク
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loadingSubtasks, setLoadingSubtasks] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  // 新規タスク
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')
  const [newTaskOrgId, setNewTaskOrgId] = useState('')
  const [newTaskProjectId, setNewTaskProjectId] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [newTaskEstimate, setNewTaskEstimate] = useState('')
  const [newProjectInline, setNewProjectInline] = useState('')
  const [showInlineProjectInput, setShowInlineProjectInput] = useState(false)

  // タスクフィルタ（完了タスク表示用）
  const [showCompletedTasks, setShowCompletedTasks] = useState(false)

  // タイムトラック
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [activeTimer, setActiveTimer] = useState<{ taskId: string; taskTitle: string; startTime: Date } | null>(null)
  const [timerDisplay, setTimerDisplay] = useState('00:00:00')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 目標
  const [goals, setGoals] = useState<Goal[]>([])
  const [newGoalOpen, setNewGoalOpen] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('')
  const [newGoalUnit, setNewGoalUnit] = useState('')

  // プロジェクト
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newProjectOrgId, setNewProjectOrgId] = useState('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectDetailOpen, setProjectDetailOpen] = useState(false)

  // 通知
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)

  // メンタル・体調
  const [healthLogs, setHealthLogs] = useState<{ date: string; mood: number; energy: number; note: string }[]>([])
  const [todayMood, setTodayMood] = useState(3)
  const [todayEnergy, setTodayEnergy] = useState(3)
  const [healthNote, setHealthNote] = useState('')

  // 週間レビュー
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false)
  const [weekReflection, setWeekReflection] = useState('')
  const [nextWeekFocus, setNextWeekFocus] = useState('')

  // AI
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // AI分析（タスク作成後）
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    estimatedMinutes: number
    subtasks: { title: string; canAutomate: boolean }[]
    priority: string
    suggestions: string[]
  } | null>(null)
  const [analyzingTask, setAnalyzingTask] = useState<Task | null>(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)

  // 外部連携
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({
    googleCalendar: false,
    slack: false,
    gmail: false
  })
  const [connectingService, setConnectingService] = useState<string | null>(null)

  // Googleカレンダー
  interface CalendarEvent {
    id: string
    title: string
    startTime: string
    endTime: string
    allDay: boolean
    location?: string
    htmlLink?: string
  }
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)

  // AIスケジューリング
  interface ScheduleItem {
    taskId: string
    taskTitle: string
    date: string
    startTime: string
    endTime: string
    reason: string
  }
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [schedulingLoading, setSchedulingLoading] = useState(false)
  const [aiSchedule, setAiSchedule] = useState<{
    schedule: ScheduleItem[]
    suggestions: string[]
    warnings: string[]
  } | null>(null)

  // 設定タブ
  const [settingsTab, setSettingsTab] = useState('profile')

  // カレンダービュー
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week')
  const [calendarDate, setCalendarDate] = useState(new Date())

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login') }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') { loadData() }
  }, [status])

  const loadData = async () => {
    setLoading(true)
    try {
      const [orgs, projs, tsks] = await Promise.all([fetchOrganizations(), fetchProjects(), fetchTasks()])
      setOrganizations(orgs)
      setProjects(projs)
      setTasks(tsks)
      if (orgs.length > 0 && !selectedOrgId) setSelectedOrgId(orgs[0].id)
      if (orgs.length > 0) setNewTaskOrgId(orgs[0].id)
      if (orgs.length > 0) setNewProjectOrgId(orgs[0].id)
      // モック目標
      setGoals([
        { id: '1', title: '新規顧客獲得', progress: 65, targetValue: 10, currentValue: 6.5, unit: '件', quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}` },
        { id: '2', title: '売上達成', progress: 45, targetValue: 1000, currentValue: 450, unit: '万円', quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}` }
      ])
      // モック通知
      setNotifications([
        { id: '1', type: 'due', message: 'プレゼン資料作成の期限が明日です', createdAt: new Date().toISOString(), read: false, taskId: '1' },
        { id: '2', type: 'mention', message: '田中さんがコメントしました', createdAt: new Date().toISOString(), read: false, taskId: '2' }
      ])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  // サブタスク読み込み
  const loadSubtasks = useCallback(async (taskId: string) => {
    setLoadingSubtasks(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`)
      if (res.ok) setSubtasks(await res.json())
    } catch (e) { console.error(e) }
    setLoadingSubtasks(false)
  }, [])

  // Googleカレンダーからイベントを取得
  const loadCalendarEvents = useCallback(async () => {
    setCalendarLoading(true)
    try {
      const res = await fetch('/api/calendar')
      if (res.ok) {
        const data = await res.json()
        setCalendarEvents(data.events || [])
        setIntegrations(prev => ({ ...prev, googleCalendar: true }))
      }
    } catch (e) { console.error(e) }
    setCalendarLoading(false)
  }, [])

  // AIスケジューリング実行
  const runAiScheduling = async () => {
    setSchedulingLoading(true)
    setAiSchedule(null)
    try {
      const res = await fetch('/api/ai/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.filter(t => t.status !== 'completed'),
          calendarEvents,
          workingHours: { start: '09:00', end: '18:00' }
        })
      })
      if (res.ok) {
        const data = await res.json()
        setAiSchedule(data)
      }
    } catch (e) { console.error(e) }
    setSchedulingLoading(false)
  }

  // スケジュールをタスクに適用
  const applySchedule = (item: ScheduleItem) => {
    setTasks(tasks.map(t =>
      t.id === item.taskId
        ? { ...t, dueDate: item.date }
        : t
    ))
  }

  // AIダッシュボードアドバイスを取得（タスク内容に基づいた具体的なアドバイス）
  const loadDashboardAdvice = useCallback(async () => {
    if (tasks.length === 0) return
    setAdviceLoading(true)
    try {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      const pendingTasks = tasks.filter(t => t.status !== 'completed')
      const overdueTasks = pendingTasks.filter(t => t.dueDate && t.dueDate < todayStr)
      const dueTodayTasks = pendingTasks.filter(t => t.dueDate === todayStr)
      const dueTomorrowTasks = pendingTasks.filter(t => t.dueDate === tomorrowStr)
      const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high')
      const blockedTasks = pendingTasks.filter(t => t.status === 'blocked' || t.blockers)
      const inProgressTasks = pendingTasks.filter(t => t.status === 'in_progress')

      // タスク詳細を含めてAIに送信
      const taskDetails = pendingTasks.slice(0, 10).map(t => ({
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate || 'なし',
        status: t.status,
        estimatedMinutes: t.estimatedMinutes || 30,
        progress: t.progress || 0,
        blockers: t.blockers || ''
      }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `あなたは渡邊さんの秘書AIです。以下のタスク状況を分析し、今すぐ実行可能な具体的アドバイスを3つ提案してください。

## 現在の状況
- 期限超過タスク: ${overdueTasks.length}件${overdueTasks.length > 0 ? ` → ${overdueTasks.map(t => `「${t.title}」`).join(', ')}` : ''}
- 今日期限: ${dueTodayTasks.length}件${dueTodayTasks.length > 0 ? ` → ${dueTodayTasks.map(t => `「${t.title}」`).join(', ')}` : ''}
- 明日期限: ${dueTomorrowTasks.length}件${dueTomorrowTasks.length > 0 ? ` → ${dueTomorrowTasks.map(t => `「${t.title}」`).join(', ')}` : ''}
- 高優先度: ${highPriorityTasks.length}件${highPriorityTasks.length > 0 ? ` → ${highPriorityTasks.map(t => `「${t.title}」`).join(', ')}` : ''}
- ブロック中: ${blockedTasks.length}件
- 進行中: ${inProgressTasks.length}件

## タスク詳細（上位10件）
${taskDetails.map(t => `- ${t.title} (優先度:${t.priority}, 期限:${t.dueDate}, 進捗:${t.progress}%${t.blockers ? `, ブロッカー:${t.blockers}` : ''})`).join('\n')}

## アドバイスの要件
- 具体的なタスク名を含めて言及すること
- 「今日中に○○しないと明日つらくなります」のような緊急性を伝える表現
- 「○○が遅れています」「○○を先に片付けましょう」のような具体的な指示
- 各アドバイスは30文字程度で簡潔に
- 箇条書きで3つ（「・」で始める）`,
          context: 'dashboard-advice'
        })
      })
      if (res.ok) {
        const data = await res.json()
        const lines = data.response.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('・') || l.trim().startsWith('1') || l.trim().startsWith('2') || l.trim().startsWith('3'))
        setDashboardAdvice(lines.slice(0, 3).map((l: string) => l.replace(/^[-・\d.]\s*/, '').trim()))
      }
    } catch (e) { console.error(e) }
    setAdviceLoading(false)
  }, [tasks, goals])

  // タスク読み込み時にアドバイスも取得
  useEffect(() => {
    if (tasks.length > 0 && dashboardAdvice.length === 0 && !adviceLoading) {
      loadDashboardAdvice()
    }
  }, [tasks])

  // タスク詳細を開く
  const openTaskDetail = (task: Task) => {
    setSelectedTask(task)
    setEditedTitle(task.title)
    setEditedDescription(task.description || '')
    setEditedProgress(task.progress || 0)
    setEditedBlockers(task.blockers || '')
    setEditedNextActions(task.nextActions || '')
    setEditedSlackLink(task.slackLink || '')
    setTaskDocLinks(task.docLinks || [])
    setTaskDriveLinks(task.driveLinks || [])
    setTaskComments(task.comments || [])
    setSubtasks([])
    setNewSubtaskTitle('')
    loadSubtasks(task.id)
    setTaskDetailOpen(true)
    setEditingTask(false)
  }

  // タスク保存
  const saveTaskDetail = async () => {
    if (!selectedTask) return
    const updated = await updateTaskAPI(selectedTask.id, {
      title: editedTitle, description: editedDescription, progress: editedProgress,
      blockers: editedBlockers, nextActions: editedNextActions, slackLink: editedSlackLink, docLinks: taskDocLinks
    })
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelectedTask(updated)
    setEditingTask(false)
  }

  // サブタスクの時間をAIで見積もる
  const estimateSubtaskTime = async (subtaskTitle: string, parentTitle: string): Promise<number> => {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `以下のサブタスクにかかる時間を分単位で見積もってください。数字のみで回答してください。

親タスク: ${parentTitle}
サブタスク: ${subtaskTitle}

回答例: 30`,
          context: 'time-estimation'
        })
      })
      if (res.ok) {
        const data = await res.json()
        const match = data.response.match(/\d+/)
        return match ? parseInt(match[0]) : 30
      }
    } catch (e) { console.error(e) }
    return 30 // デフォルト30分
  }

  // サブタスク追加（AI時間見積もり付き）
  const addSubtask = async () => {
    if (!selectedTask || !newSubtaskTitle.trim()) return
    try {
      // AIで時間を見積もる
      const estimatedMinutes = await estimateSubtaskTime(newSubtaskTitle, selectedTask.title)

      const res = await fetch(`/api/tasks/${selectedTask.id}/subtasks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSubtaskTitle,
          organizationId: selectedTask.organizationId,
          projectId: selectedTask.projectId,
          estimatedMinutes
        })
      })
      if (res.ok) {
        const newSub = await res.json()
        setSubtasks(prev => [...prev, newSub])
        setNewSubtaskTitle('')
      }
    } catch (e) { console.error(e) }
  }

  // サブタスクステータス切替
  const toggleSubtaskStatus = async (subtask: Task) => {
    const newStatus = subtask.status === 'completed' ? 'pending' : 'completed'
    try {
      await updateTaskAPI(subtask.id, { status: newStatus })
      setSubtasks(prev => prev.map(s => s.id === subtask.id ? { ...s, status: newStatus } : s))
    } catch (e) { console.error(e) }
  }

  // 新規タスク作成
  const createNewTask = async () => {
    if (!newTaskTitle.trim() || !newTaskOrgId) return
    try {
      const newTask = await createTaskAPI({
        title: newTaskTitle, priority: newTaskPriority, status: 'pending',
        organizationId: newTaskOrgId, projectId: newTaskProjectId || undefined,
        dueDate: newTaskDueDate || undefined,
        estimatedMinutes: newTaskEstimate ? parseInt(newTaskEstimate) : undefined
      })
      setTasks(prev => [...prev, newTask])
      setNewTaskOpen(false)
      setShowInlineProjectInput(false)
      setNewProjectInline('')

      // AI分析を開始
      setAnalyzingTask(newTask)
      setAiAnalysisOpen(true)
      setAiAnalyzing(true)
      try {
        const res = await fetch('/api/ai/analyze-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskTitle: newTaskTitle, taskDescription: '' })
        })
        if (res.ok) {
          const analysis = await res.json()
          setAiAnalysisResult(analysis)
        }
      } catch (e) { console.error(e) }
      setAiAnalyzing(false)

      setNewTaskTitle('')
      setNewTaskPriority('medium')
      setNewTaskProjectId('')
      setNewTaskDueDate('')
      setNewTaskEstimate('')
    } catch (e) { console.error(e) }
  }

  // AI分析結果からサブタスクを追加
  const addAISubtasks = async (subtasksToAdd: { title: string; canAutomate: boolean }[]) => {
    if (!analyzingTask) return
    for (const st of subtasksToAdd) {
      try {
        const res = await fetch(`/api/tasks/${analyzingTask.id}/subtasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: st.title + (st.canAutomate ? ' 🤖' : ''),
            organizationId: analyzingTask.organizationId,
            projectId: analyzingTask.projectId
          })
        })
        if (res.ok) await res.json()
      } catch (e) { console.error(e) }
    }
    setAiAnalysisOpen(false)
    setAiAnalysisResult(null)
    setAnalyzingTask(null)
  }

  // 外部連携の切り替え
  const toggleIntegration = async (service: string) => {
    setConnectingService(service)
    const isConnected = integrations[service]
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, action: isConnected ? 'disconnect' : 'connect' })
      })
      if (res.ok) {
        setIntegrations(prev => ({ ...prev, [service]: !isConnected }))
      }
    } catch (e) { console.error(e) }
    setConnectingService(null)
  }

  // タイマー機能
  const startTimer = (taskId: string, taskTitle: string) => {
    if (activeTimer) stopTimer()
    const now = new Date()
    setActiveTimer({ taskId, taskTitle, startTime: now })
    timerRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - now.getTime()) / 1000)
      const h = Math.floor(diff / 3600).toString().padStart(2, '0')
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setTimerDisplay(`${h}:${m}:${s}`)
    }, 1000)
  }

  const stopTimer = () => {
    if (!activeTimer) return
    if (timerRef.current) clearInterval(timerRef.current)
    const end = new Date()
    const dur = Math.floor((end.getTime() - activeTimer.startTime.getTime()) / 60000)
    setTimeEntries(prev => [...prev, {
      id: Date.now().toString(), taskId: activeTimer.taskId, taskTitle: activeTimer.taskTitle,
      startTime: activeTimer.startTime.toISOString(), endTime: end.toISOString(), duration: dur
    }])
    setActiveTimer(null)
    setTimerDisplay('00:00:00')
  }

  // AI送信
  const sendAIMessage = async () => {
    if (!chatInput.trim() || aiLoading) return
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: chatInput }
    setChatMessages(prev => [...prev, userMsg])
    const inputText = chatInput
    setChatInput('')
    setAiLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputText,
          context: { tasks: tasks.slice(0, 5), goals: goals.slice(0, 3) }
        })
      })
      if (res.ok) {
        const data = await res.json()
        const aiResp: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response
        }
        setChatMessages(prev => [...prev, aiResp])
      }
    } catch (e) {
      console.error(e)
      const aiResp: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'すみません、エラーが発生しました。もう一度お試しください。'
      }
      setChatMessages(prev => [...prev, aiResp])
    }
    setAiLoading(false)
  }

  // 体調記録
  const saveHealthLog = () => {
    const today = new Date().toISOString().split('T')[0]
    setHealthLogs(prev => [...prev.filter(l => l.date !== today), { date: today, mood: todayMood, energy: todayEnergy, note: healthNote }])
    setHealthNote('')
  }

  // フィルタ済みタスク
  const getFilteredTasks = () => {
    let filtered = tasks
    // サイドバーの組織選択（selectedOrgIdはサイドバー用）
    if (selectedOrgId) filtered = filtered.filter(t => t.organizationId === selectedOrgId)
    // タスク一覧の組織フィルター（orgFilterはタスク一覧用）
    if (orgFilter !== 'all') filtered = filtered.filter(t => t.organizationId === orgFilter)
    const today = new Date().toISOString().split('T')[0]
    switch (taskFilter) {
      case 'today': return filtered.filter(t => t.dueDate === today)
      case 'overdue': return filtered.filter(t => t.dueDate && t.dueDate < today && t.status !== 'completed')
      case 'in_progress': return filtered.filter(t => t.status === 'in_progress')
      case 'completed': return filtered.filter(t => t.status === 'completed')
      default: return filtered
    }
  }

  const getOrgById = (id: string) => organizations.find(o => o.id === id)
  const getProjectById = (id: string) => projects.find(p => p.id === id)

  // ローディング・認証チェック
  if (!mounted || status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
  }
  if (status === 'unauthenticated') return null

  const filteredTasks = getFilteredTasks()
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
  const overdueCount = tasks.filter(t => t.dueDate && t.dueDate < new Date().toISOString().split('T')[0] && t.status !== 'completed').length
  const todayTotalMinutes = timeEntries.reduce((s, e) => s + e.duration, 0)
  const unreadNotifs = notifications.filter(n => !n.read).length

  // メニュー項目（AIを上に配置）
  const menuItems = [
    { id: 'ai', name: 'AI アシスタント', icon: Sparkles },
    { id: 'dashboard', name: 'ダッシュボード', icon: LayoutDashboard },
    { id: 'tasks', name: 'タスク', icon: ListTodo },
    { id: 'projects', name: 'プロジェクト', icon: FolderKanban },
    { id: 'calendar', name: 'カレンダー', icon: Calendar },
    { id: 'goals', name: '四半期目標', icon: Target },
    { id: 'timetrack', name: 'タイムトラック', icon: Clock },
    { id: 'analytics', name: '分析・レポート', icon: BarChart3 },
    { id: 'health', name: 'メンタル・体調', icon: Heart },
    { id: 'settings', name: '設定', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* モバイルオーバーレイ */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* サイドバー */}
      <aside className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 z-40 transition-all duration-300
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-16 lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* ロゴ */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              {sidebarOpen && <span className="font-bold text-slate-800">EXECUTY</span>}
            </div>
          </div>

          {/* 組織セレクター */}
          {sidebarOpen && (
            <div className="px-3 py-3 border-b border-slate-100">
              <div className="relative">
                <button onClick={() => setOrgDropdownOpen(!orgDropdownOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg hover:bg-slate-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">{selectedOrgId ? getOrgById(selectedOrgId)?.name : '全組織'}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                {orgDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                    <button onClick={() => { setSelectedOrgId(null); setOrgDropdownOpen(false) }} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50">全組織</button>
                    {organizations.map(org => (
                      <button key={org.id} onClick={() => { setSelectedOrgId(org.id); setOrgDropdownOpen(false) }} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50">{org.name}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* メニュー */}
          <nav className="flex-1 px-3 py-3 overflow-y-auto">
            {menuItems.map(item => (
              <button key={item.id} onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${activeMenu === item.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                <item.icon className="w-5 h-5" />
                {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
              </button>
            ))}
          </nav>

          {/* ユーザーメニュー */}
          <div className="px-3 py-3 border-t border-slate-200">
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-500" />
                </div>
                {sidebarOpen && <span className="text-sm text-slate-700">{session?.user?.name || 'ユーザー'}</span>}
              </button>
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                  <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4" /> ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 transition-all duration-300 ml-0 lg:ml-16">
        {/* ヘッダー */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            {/* モバイルメニューボタン */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg lg:text-xl font-bold text-slate-800">{menuItems.find(m => m.id === activeMenu)?.name || 'ダッシュボード'}</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              {/* 通知 */}
              <div className="relative">
                <button onClick={() => setNotifOpen(!notifOpen)} className="p-2 rounded-lg hover:bg-slate-100 relative">
                  <Bell className="w-5 h-5 text-slate-600" />
                  {unreadNotifs > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50">
                    <div className="p-3 border-b border-slate-100"><span className="font-medium text-slate-800">通知</span></div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className={`p-3 border-b border-slate-50 ${n.read ? '' : 'bg-blue-50'}`}>
                          <p className="text-sm text-slate-700">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* 週間レビュー - モバイル非表示 */}
              <button onClick={() => setWeeklyReviewOpen(true)} className="hidden sm:flex px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">
                <RefreshCw className="w-4 h-4 inline mr-1" /> 週間レビュー
              </button>
              {/* AIアシスタント */}
              <button onClick={() => setActiveMenu('ai')} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600">
                <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">AI</span>
              </button>
              {/* 新規タスク */}
              <button onClick={() => { setNewTaskOpen(true); if (organizations.length > 0 && !newTaskOrgId) setNewTaskOrgId(organizations[0].id) }} className="flex items-center gap-1 px-2 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline text-sm font-medium">新規タスク</span>
              </button>
            </div>
          </div>
        </header>

        {/* コンテンツエリア */}
        <div className="p-3 sm:p-4 lg:p-6">
          {/* ダッシュボード */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6">
              {/* タイマー表示 */}
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

              {/* AIアドバイス */}
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

              {/* 統計カード（クリック可能） */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div
                  onClick={() => setTaskFilter('all')}
                  className={`bg-white rounded-xl border p-3 sm:p-5 cursor-pointer transition-all hover:shadow-md ${taskFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center"><ListTodo className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /></div>
                    <span className="text-xs sm:text-sm text-slate-600">未完了</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{tasks.filter(t => t.status !== 'completed').length}</p>
                </div>
                <div
                  onClick={() => setTaskFilter('completed')}
                  className={`bg-white rounded-xl border p-3 sm:p-5 cursor-pointer transition-all hover:shadow-md ${taskFilter === 'completed' ? 'border-green-500 ring-2 ring-green-200' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /></div>
                    <span className="text-xs sm:text-sm text-slate-600">完了</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{completedCount}</p>
                </div>
                <div
                  onClick={() => setTaskFilter('in_progress')}
                  className={`bg-white rounded-xl border p-3 sm:p-5 cursor-pointer transition-all hover:shadow-md ${taskFilter === 'in_progress' ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" /></div>
                    <span className="text-xs sm:text-sm text-slate-600">進行中</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{inProgressCount}</p>
                </div>
                <div
                  onClick={() => setTaskFilter('overdue')}
                  className={`bg-white rounded-xl border p-3 sm:p-5 cursor-pointer transition-all hover:shadow-md ${taskFilter === 'overdue' ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-100 flex items-center justify-center"><AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" /></div>
                    <span className="text-xs sm:text-sm text-slate-600">期限超過</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{overdueCount}</p>
                </div>
              </div>

              {/* タスクリスト（完了を除外） */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 gap-2 sm:gap-0">
                  <h2 className="font-semibold text-slate-800">タスク一覧</h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    {/* 組織フィルター */}
                    <select
                      value={orgFilter}
                      onChange={(e) => setOrgFilter(e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded-lg text-xs sm:text-sm">
                      <option value="all">全組織</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                    {/* ソート */}
                    <select
                      value={taskSort}
                      onChange={(e) => setTaskSort(e.target.value as 'priority' | 'dueDate' | 'created')}
                      className="px-2 py-1 border border-slate-200 rounded-lg text-xs sm:text-sm">
                      <option value="priority">優先度順</option>
                      <option value="dueDate">期限順</option>
                      <option value="created">作成順</option>
                    </select>
                    {/* フィルタ - モバイルではスクロール */}
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
                        <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-5 py-3 sm:py-4 hover:bg-slate-50 cursor-pointer gap-2 sm:gap-0" onClick={() => openTaskDetail(task)}>
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <button onClick={(e) => { e.stopPropagation(); updateTaskAPI(task.id, { status: 'completed' }).then(() => loadData()) }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-green-500 hover:bg-green-50'}`}>
                              {task.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={`font-medium text-sm sm:text-base truncate ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {task.projectId && <span className="text-xs text-slate-500">{getProjectById(task.projectId)?.name}</span>}
                                {task.dueDate && <span className={`text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'text-red-500 font-medium' : 'text-slate-500'}`}>期限: {task.dueDate}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 ml-7 sm:ml-0">
                            {/* 時間情報 */}
                            {estimated > 0 && (
                              <div className="text-right mr-1 sm:mr-2">
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Clock className="w-3 h-3" />
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
                                onClick={(e) => { e.stopPropagation(); stopTimer() }}
                                className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200">
                                <Pause className="w-3 h-3" />
                                {timerDisplay}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); startTimer(task.id, task.title) }}
                                className="p-1.5 rounded-lg hover:bg-green-100 text-slate-400 hover:text-green-600"
                                title="タイマー開始">
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${priorityColors[task.priority]}`}>{priorityLabels[task.priority]}</span>
                          </div>
                        </div>
                        )})
                  )}
                </div>
              </div>

              {/* 今日のスケジュール（Googleカレンダー + AIスケジュール統合） */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 gap-2">
                  <h2 className="font-semibold text-slate-800">今日のスケジュール</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setScheduleModalOpen(true); runAiScheduling() }}
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
                    // Googleカレンダーイベント
                    const googleEvents = calendarEvents
                      .filter(e => e.startTime.startsWith(todayStr))
                      .map(e => ({ ...e, type: 'google' as const }))
                    // AIスケジュール（今日分）
                    const aiEvents = (aiSchedule?.schedule || [])
                      .filter(s => s.date === todayStr)
                      .map(s => ({
                        id: `ai-${s.taskId}`,
                        title: s.taskTitle,
                        startTime: `${s.date}T${s.startTime}`,
                        endTime: `${s.date}T${s.endTime}`,
                        allDay: false,
                        type: 'ai' as const,
                        reason: s.reason,
                        taskId: s.taskId
                      }))
                    // 統合してソート
                    const allEvents = [...googleEvents, ...aiEvents].sort((a, b) =>
                      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                    )

                    if (allEvents.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-500">
                          <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm">今日の予定はありません</p>
                          <div className="flex justify-center gap-2 mt-3">
                            {!integrations.googleCalendar && (
                              <button onClick={loadCalendarEvents} className="text-xs text-blue-600 hover:underline">
                                Googleカレンダー連携
                              </button>
                            )}
                            <button onClick={() => { setScheduleModalOpen(true); runAiScheduling() }} className="text-xs text-purple-600 hover:underline">
                              AIでスケジュール作成
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return allEvents.map(event => (
                      <div key={event.id} className={`px-3 sm:px-5 py-3 hover:bg-slate-50 ${event.type === 'ai' ? 'bg-purple-50/50' : ''}`}>
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="text-center min-w-[45px] sm:min-w-[50px]">
                            <p className={`text-sm font-medium ${event.type === 'ai' ? 'text-purple-600' : 'text-blue-600'}`}>
                              {event.allDay ? '終日' : new Date(event.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {!event.allDay && (
                              <p className="text-xs text-slate-400">
                                〜{new Date(event.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-800">{event.title}</p>
                              {event.type === 'ai' && (
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-xs rounded">AI</span>
                              )}
                            </div>
                            {event.type === 'google' && (event as any).location && (
                              <p className="text-xs text-slate-500 mt-0.5">{(event as any).location}</p>
                            )}
                            {event.type === 'ai' && (event as any).reason && (
                              <p className="text-xs text-purple-500 mt-0.5">{(event as any).reason}</p>
                            )}
                          </div>
                          {event.type === 'google' && (event as any).htmlLink && (
                            <a href={(event as any).htmlLink} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {event.type === 'ai' && (
                            <button
                              onClick={() => {
                                const task = tasks.find(t => t.id === (event as any).taskId)
                                if (task) openTaskDetail(task)
                              }}
                              className="text-slate-400 hover:text-purple-600">
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
          )}

          {/* タスク */}
          {activeMenu === 'tasks' && (
            <div className="space-y-4">
              {/* アクティブタスク */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">タスク一覧</h2>
                  <button onClick={() => { setNewTaskOpen(true); if (organizations.length > 0 && !newTaskOrgId) setNewTaskOrgId(organizations[0].id) }} className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                    <Plus className="w-4 h-4" /> 追加
                  </button>
                </div>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                  {filteredTasks.filter(t => t.status !== 'completed').map(task => (
                    <div key={task.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 cursor-pointer" onClick={() => openTaskDetail(task)}>
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); updateTaskAPI(task.id, { status: 'completed' }).then(() => loadData()) }}
                          className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center hover:border-green-500 hover:bg-green-50">
                        </button>
                        <div>
                          <p className="font-medium text-slate-800">{task.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{getOrgById(task.organizationId)?.name} {task.projectId && `/ ${getProjectById(task.projectId)?.name}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* タイマーボタン */}
                        {activeTimer?.taskId === task.id ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); stopTimer() }}
                            className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200">
                            <Pause className="w-3 h-3" />
                            {timerDisplay}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); startTimer(task.id, task.title) }}
                            className="p-1.5 hover:bg-blue-100 rounded-lg text-slate-400 hover:text-blue-600"
                            title="タイマー開始">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>{priorityLabels[task.priority]}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                  {filteredTasks.filter(t => t.status !== 'completed').length === 0 && (
                    <div className="text-center py-8 text-slate-500">タスクがありません</div>
                  )}
                </div>
              </div>

              {/* 完了フォルダ */}
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
                    {filteredTasks.filter(t => t.status === 'completed').map(task => (
                      <div key={task.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 cursor-pointer" onClick={() => openTaskDetail(task)}>
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); updateTaskAPI(task.id, { status: 'pending' }).then(() => loadData()) }}
                            className="w-5 h-5 rounded border-2 bg-green-500 border-green-500 flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </button>
                          <div>
                            <p className="font-medium line-through text-slate-400">{task.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{getOrgById(task.organizationId)?.name} {task.projectId && `/ ${getProjectById(task.projectId)?.name}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('このタスクを削除しますか？')) {
                                setTasks(tasks.filter(t => t.id !== task.id))
                              }
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredTasks.filter(t => t.status === 'completed').length === 0 && (
                      <div className="text-center py-8 text-slate-500">完了したタスクはありません</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* プロジェクト */}
          {activeMenu === 'projects' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => setNewProjectOpen(true)} className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  <Plus className="w-4 h-4" /> 新規プロジェクト
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {projects.filter(p => !selectedOrgId || p.organizationId === selectedOrgId).map(proj => (
                  <div key={proj.id} className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedProject(proj); setProjectDetailOpen(true) }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg ${proj.color || 'bg-blue-500'} flex items-center justify-center`}>
                        <FolderKanban className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{proj.name}</h3>
                        <p className="text-xs text-slate-500">{getOrgById(proj.organizationId)?.name}</p>
                      </div>
                    </div>
                    {proj.description && <p className="text-sm text-slate-600 line-clamp-2">{proj.description}</p>}
                    <div className="mt-3 text-xs text-slate-500">{tasks.filter(t => t.projectId === proj.id).length} タスク</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 目標 */}
          {activeMenu === 'goals' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => setNewGoalOpen(true)} className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  <Plus className="w-4 h-4" /> 新規目標
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {goals.map(goal => (
                  <div key={goal.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-800">{goal.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{goal.quarter}</span>
                        <button
                          onClick={() => {
                            if (confirm(`「${goal.title}」を削除しますか？`)) {
                              setGoals(goals.filter(g => g.id !== goal.id))
                            }
                          }}
                          className="p-1 hover:bg-red-50 rounded text-red-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                        <span className="font-medium text-blue-600">{goal.progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" style={{ width: `${goal.progress}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="進捗値"
                        className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement
                            const newValue = parseFloat(input.value)
                            if (!isNaN(newValue)) {
                              setGoals(goals.map(g =>
                                g.id === goal.id
                                  ? { ...g, currentValue: newValue, progress: Math.min(100, Math.round((newValue / g.targetValue) * 100)) }
                                  : g
                              ))
                              input.value = ''
                            }
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = (e.target as HTMLElement).previousSibling as HTMLInputElement
                          const newValue = parseFloat(input.value)
                          if (!isNaN(newValue)) {
                            setGoals(goals.map(g =>
                              g.id === goal.id
                                ? { ...g, currentValue: newValue, progress: Math.min(100, Math.round((newValue / g.targetValue) * 100)) }
                                : g
                            ))
                            input.value = ''
                          }
                        }}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                        更新
                      </button>
                    </div>
                  </div>
                ))}
                {goals.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-slate-500">
                    目標がありません。「新規目標」ボタンから作成してください。
                  </div>
                )}
              </div>
            </div>
          )}

          {/* タイムトラック */}
          {activeMenu === 'timetrack' && (
            <div className="space-y-4">
              {activeTimer && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 mb-1">現在計測中</p>
                      <p className="font-medium text-green-800">{activeTimer.taskTitle}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-mono text-green-800">{timerDisplay}</span>
                      <button onClick={stopTimer} className="px-4 py-2 bg-red-500 text-white rounded-lg">停止</button>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">今日の作業時間</h2>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{Math.floor(todayTotalMinutes / 60)}時間 {todayTotalMinutes % 60}分</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {timeEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{entry.taskTitle}</p>
                        <p className="text-xs text-slate-500">{new Date(entry.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - {entry.endTime ? new Date(entry.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '進行中'}</p>
                      </div>
                      <span className="font-medium text-slate-700">{entry.duration}分</span>
                    </div>
                  ))}
                  {timeEntries.length === 0 && <div className="p-5 text-center text-slate-500">まだ記録がありません</div>}
                </div>
              </div>
            </div>
          )}

          {/* AI */}
          {activeMenu === 'ai' && (
            <div className="bg-white rounded-xl border border-slate-200 h-[600px] flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">AI アシスタント</h2>
                <p className="text-sm text-slate-500">タスクの分解、優先度提案、レポート作成などをお手伝いします</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-3 rounded-xl ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 bg-slate-100 rounded-xl"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendAIMessage()}
                    placeholder="メッセージを入力..." className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
                  <button onClick={sendAIMessage} disabled={aiLoading} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* メンタル・体調 */}
          {activeMenu === 'health' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-800 mb-4">今日の体調を記録</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">気分 (1-5)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setTodayMood(n)} className={`w-10 h-10 rounded-lg ${todayMood === n ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">エネルギー (1-5)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setTodayEnergy(n)} className={`w-10 h-10 rounded-lg ${todayEnergy === n ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">メモ</label>
                    <textarea value={healthNote} onChange={(e) => setHealthNote(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" rows={3} />
                  </div>
                  <button onClick={saveHealthLog} className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">記録する</button>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-800 mb-4">記録履歴</h2>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {healthLogs.map((log, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{log.date}</span>
                        <span>気分: {log.mood} / エネルギー: {log.energy}</span>
                      </div>
                      {log.note && <p className="text-sm text-slate-600">{log.note}</p>}
                    </div>
                  ))}
                  {healthLogs.length === 0 && <p className="text-slate-500 text-center py-4">まだ記録がありません</p>}
                </div>
              </div>
            </div>
          )}

          {/* カレンダー（Googleカレンダー風UI） */}
          {activeMenu === 'calendar' && (() => {
            // カレンダーヘルパー関数
            const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            const getWeekDays = (date: Date) => {
              const start = new Date(date)
              start.setDate(start.getDate() - start.getDay())
              return Array.from({ length: 7 }, (_, i) => {
                const d = new Date(start)
                d.setDate(d.getDate() + i)
                return d
              })
            }
            const getMonthDays = (date: Date) => {
              const year = date.getFullYear()
              const month = date.getMonth()
              const firstDay = new Date(year, month, 1).getDay()
              const daysInMonth = new Date(year, month + 1, 0).getDate()
              const days: (Date | null)[] = []
              for (let i = 0; i < firstDay; i++) days.push(null)
              for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
              while (days.length < 42) days.push(null)
              return days
            }
            const hours = Array.from({ length: 24 }, (_, i) => i)
            const todayStr = formatDate(new Date())

            // イベント取得
            const getEventsForDate = (dateStr: string) => {
              const googleEvts = calendarEvents.filter(e => e.startTime.startsWith(dateStr))
              const aiEvts = (aiSchedule?.schedule || []).filter(s => s.date === dateStr)
              const taskEvts = tasks.filter(t => t.dueDate === dateStr)
              return { google: googleEvts, ai: aiEvts, tasks: taskEvts }
            }

            // ナビゲーション
            const navigate = (dir: number) => {
              const d = new Date(calendarDate)
              if (calendarView === 'day') d.setDate(d.getDate() + dir)
              else if (calendarView === 'week') d.setDate(d.getDate() + dir * 7)
              else d.setMonth(d.getMonth() + dir)
              setCalendarDate(d)
            }
            const goToToday = () => setCalendarDate(new Date())

            // ヘッダータイトル
            const getHeaderTitle = () => {
              if (calendarView === 'day') return `${calendarDate.getFullYear()}年${calendarDate.getMonth() + 1}月${calendarDate.getDate()}日`
              if (calendarView === 'week') {
                const week = getWeekDays(calendarDate)
                return `${week[0].getFullYear()}年${week[0].getMonth() + 1}月${week[0].getDate()}日 - ${week[6].getMonth() + 1}月${week[6].getDate()}日`
              }
              return `${calendarDate.getFullYear()}年${calendarDate.getMonth() + 1}月`
            }

            return (
            <div className="h-[calc(100vh-120px)] flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* ヘッダー */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-3">
                  <button onClick={goToToday} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">今日</button>
                  <div className="flex items-center">
                    <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                    <button onClick={() => navigate(1)} className="p-1.5 hover:bg-slate-100 rounded-full"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
                  </div>
                  <h2 className="text-xl font-medium text-slate-800">{getHeaderTitle()}</h2>
                </div>
                <div className="flex items-center gap-3">
                  {/* ビュー切替 */}
                  <div className="flex border border-slate-300 rounded-lg overflow-hidden">
                    {(['day', 'week', 'month'] as const).map(v => (
                      <button key={v} onClick={() => setCalendarView(v)}
                        className={`px-3 py-1.5 text-sm ${calendarView === v ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        {v === 'day' ? '日' : v === 'week' ? '週' : '月'}
                      </button>
                    ))}
                  </div>
                  <button onClick={loadCalendarEvents} className="p-2 hover:bg-slate-100 rounded-lg" disabled={calendarLoading}>
                    <RefreshCw className={`w-4 h-4 text-slate-600 ${calendarLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => { setScheduleModalOpen(true); runAiScheduling() }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
                    <Sparkles className="w-4 h-4" /> AI
                  </button>
                </div>
              </div>

              {/* 日ビュー */}
              {calendarView === 'day' && (
                <div className="flex-1 overflow-auto">
                  <div className="min-h-full">
                    {hours.map(hour => {
                      const dateStr = formatDate(calendarDate)
                      const evts = getEventsForDate(dateStr)
                      const hourEvents = evts.google.filter(e => !e.allDay && new Date(e.startTime).getHours() === hour)
                      const hourAi = evts.ai.filter(s => parseInt(s.startTime.split(':')[0]) === hour)
                      return (
                        <div key={hour} className="flex border-b border-slate-100 min-h-[60px]">
                          <div className="w-16 py-2 pr-2 text-right text-xs text-slate-500 border-r border-slate-100">
                            {hour.toString().padStart(2, '0')}:00
                          </div>
                          <div className="flex-1 p-1 relative">
                            {hourEvents.map(e => (
                              <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer"
                                className="block mb-1 px-2 py-1 bg-green-100 border-l-4 border-green-500 rounded text-sm hover:bg-green-200">
                                <span className="font-medium">{e.title}</span>
                                <span className="text-xs text-slate-500 ml-2">
                                  {new Date(e.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} -
                                  {new Date(e.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </a>
                            ))}
                            {hourAi.map(s => (
                              <div key={s.taskId} onClick={() => { const t = tasks.find(t => t.id === s.taskId); if (t) openTaskDetail(t) }}
                                className="mb-1 px-2 py-1 bg-purple-100 border-l-4 border-purple-500 rounded text-sm cursor-pointer hover:bg-purple-200">
                                <div className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-purple-500" />
                                  <span className="font-medium">{s.taskTitle}</span>
                                </div>
                                <span className="text-xs text-slate-500">{s.startTime} - {s.endTime}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 週ビュー */}
              {calendarView === 'week' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* 曜日ヘッダー */}
                  <div className="flex border-b border-slate-200 bg-slate-50">
                    <div className="w-16 border-r border-slate-200" />
                    {getWeekDays(calendarDate).map((d, i) => {
                      const isToday = formatDate(d) === todayStr
                      return (
                        <div key={i} className="flex-1 py-2 text-center border-r border-slate-100">
                          <div className="text-xs text-slate-500">{['日', '月', '火', '水', '木', '金', '土'][i]}</div>
                          <div className={`text-lg font-medium ${isToday ? 'w-8 h-8 mx-auto rounded-full bg-blue-500 text-white flex items-center justify-center' : 'text-slate-800'}`}>
                            {d.getDate()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* 終日イベント */}
                  <div className="flex border-b border-slate-200 bg-white min-h-[40px]">
                    <div className="w-16 border-r border-slate-200 text-xs text-slate-500 p-1">終日</div>
                    {getWeekDays(calendarDate).map((d, i) => {
                      const dateStr = formatDate(d)
                      const allDayEvts = calendarEvents.filter(e => e.startTime.startsWith(dateStr) && e.allDay)
                      const dayTasks = tasks.filter(t => t.dueDate === dateStr)
                      return (
                        <div key={i} className="flex-1 p-0.5 border-r border-slate-100 overflow-hidden">
                          {allDayEvts.slice(0, 2).map(e => (
                            <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer"
                              className="block text-xs px-1 py-0.5 mb-0.5 bg-green-100 text-green-800 rounded truncate hover:bg-green-200">{e.title}</a>
                          ))}
                          {dayTasks.slice(0, 2).map(t => (
                            <div key={t.id} onClick={() => openTaskDetail(t)}
                              className="text-xs px-1 py-0.5 mb-0.5 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200">{t.title}</div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                  {/* 時間グリッド */}
                  <div className="flex-1 overflow-auto">
                    <div className="min-h-full">
                      {hours.map(hour => (
                        <div key={hour} className="flex border-b border-slate-100" style={{ height: '48px' }}>
                          <div className="w-16 py-1 pr-2 text-right text-xs text-slate-400 border-r border-slate-100">
                            {hour.toString().padStart(2, '0')}:00
                          </div>
                          {getWeekDays(calendarDate).map((d, i) => {
                            const dateStr = formatDate(d)
                            const evts = getEventsForDate(dateStr)
                            const hourEvents = evts.google.filter(e => !e.allDay && new Date(e.startTime).getHours() === hour)
                            const hourAi = evts.ai.filter(s => parseInt(s.startTime.split(':')[0]) === hour)
                            return (
                              <div key={i} className="flex-1 border-r border-slate-100 p-0.5 relative overflow-hidden">
                                {hourEvents.map(e => (
                                  <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer"
                                    className="block text-xs px-1 py-0.5 bg-green-200 border-l-2 border-green-500 rounded-sm truncate hover:bg-green-300">
                                    {e.title}
                                  </a>
                                ))}
                                {hourAi.map(s => (
                                  <div key={s.taskId} onClick={() => { const t = tasks.find(t => t.id === s.taskId); if (t) openTaskDetail(t) }}
                                    className="text-xs px-1 py-0.5 bg-purple-200 border-l-2 border-purple-500 rounded-sm truncate cursor-pointer hover:bg-purple-300">
                                    {s.taskTitle}
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 月ビュー */}
              {calendarView === 'month' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* 曜日ヘッダー */}
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                      <div key={day} className={`py-2 text-center text-sm font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600'}`}>{day}</div>
                    ))}
                  </div>
                  {/* 日付グリッド */}
                  <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
                    {getMonthDays(calendarDate).map((d, i) => {
                      if (!d) return <div key={i} className="border-r border-b border-slate-100 bg-slate-50" />
                      const dateStr = formatDate(d)
                      const isToday = dateStr === todayStr
                      const isCurrentMonth = d.getMonth() === calendarDate.getMonth()
                      const evts = getEventsForDate(dateStr)
                      const dayOfWeek = d.getDay()
                      return (
                        <div key={i} className={`border-r border-b border-slate-100 p-1 overflow-hidden ${isToday ? 'bg-blue-50' : ''}`}>
                          <div className={`text-sm mb-1 ${isToday ? 'w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center mx-auto' : dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : isCurrentMonth ? 'text-slate-800' : 'text-slate-400'}`}>
                            {d.getDate()}
                          </div>
                          <div className="space-y-0.5 overflow-hidden" style={{ maxHeight: 'calc(100% - 28px)' }}>
                            {evts.google.slice(0, 2).map(e => (
                              <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer"
                                className="block text-xs px-1 py-0.5 bg-green-100 text-green-800 rounded truncate hover:bg-green-200">
                                {!e.allDay && <span className="text-green-600">{new Date(e.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} </span>}
                                {e.title}
                              </a>
                            ))}
                            {evts.ai.slice(0, 1).map(s => (
                              <div key={s.taskId} onClick={() => { const t = tasks.find(t => t.id === s.taskId); if (t) openTaskDetail(t) }}
                                className="text-xs px-1 py-0.5 bg-purple-100 text-purple-800 rounded truncate cursor-pointer hover:bg-purple-200">
                                <Sparkles className="w-2 h-2 inline mr-0.5" />{s.taskTitle}
                              </div>
                            ))}
                            {evts.tasks.slice(0, 1).map(t => (
                              <div key={t.id} onClick={() => openTaskDetail(t)}
                                className="text-xs px-1 py-0.5 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200">{t.title}</div>
                            ))}
                            {(evts.google.length + evts.ai.length + evts.tasks.length) > 3 && (
                              <div className="text-xs text-slate-500 px-1">+{evts.google.length + evts.ai.length + evts.tasks.length - 3}件</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            )
          })()}

          {/* 分析・レポート */}
          {activeMenu === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
                    <span className="text-sm text-slate-600">完了率</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%</p>
                  <p className="text-xs text-slate-500 mt-1">{completedCount}/{tasks.length} タスク完了</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Clock className="w-5 h-5 text-blue-600" /></div>
                    <span className="text-sm text-slate-600">総作業時間</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{Math.floor(todayTotalMinutes / 60)}h {todayTotalMinutes % 60}m</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Target className="w-5 h-5 text-purple-600" /></div>
                    <span className="text-sm text-slate-600">目標達成度</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0}%</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                    <span className="text-sm text-slate-600">期限超過</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-800">{overdueCount}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-800 mb-4">優先度別タスク</h3>
                  <div className="space-y-3">
                    {(['high', 'medium', 'low'] as const).map(p => {
                      const total = tasks.filter(t => t.priority === p).length
                      const done = tasks.filter(t => t.priority === p && t.status === 'completed').length
                      const rate = total > 0 ? Math.round((done / total) * 100) : 0
                      return (
                        <div key={p} className="flex items-center gap-3">
                          <span className={`w-16 text-sm ${p === 'high' ? 'text-red-600' : p === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>{priorityLabels[p]}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-sm text-slate-500">{done}/{total}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-800 mb-4">プロジェクト別進捗</h3>
                  <div className="space-y-3">
                    {projects.slice(0, 5).map(proj => {
                      const projTasks = tasks.filter(t => t.projectId === proj.id)
                      const projDone = projTasks.filter(t => t.status === 'completed').length
                      const rate = projTasks.length > 0 ? Math.round((projDone / projTasks.length) * 100) : 0
                      return (
                        <div key={proj.id} className="flex items-center gap-3">
                          <span className="w-24 text-sm text-slate-700 truncate">{proj.name}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-sm text-slate-500">{rate}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 設定 */}
          {activeMenu === 'settings' && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="flex border-b border-slate-100">
                {[{ id: 'profile', name: 'プロフィール', icon: User }, { id: 'organization', name: '組織設計', icon: Building2 }, { id: 'notifications', name: '通知', icon: Bell }, { id: 'integrations', name: '外部連携', icon: Link2 }].map(tab => (
                  <button key={tab.id} onClick={() => setSettingsTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${settingsTab === tab.id ? 'text-blue-600 border-blue-600' : 'text-slate-600 hover:text-slate-800 border-transparent'}`}>
                    <tab.icon className="w-4 h-4" />{tab.name}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {/* プロフィールタブ */}
                {settingsTab === 'profile' && (
                  <div className="max-w-lg space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">プロフィール画像</label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-8 h-8 text-slate-400" /></div>
                        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">画像を変更</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">表示名</label>
                      <input type="text" defaultValue={session?.user?.name || ''} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">メールアドレス</label>
                      <input type="email" defaultValue={session?.user?.email || ''} disabled className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500" />
                    </div>
                    <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">保存</button>
                  </div>
                )}

                {/* 組織設計タブ */}
                {settingsTab === 'organization' && (
                  <div className="space-y-8">
                    {/* 組織一覧 */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-800">組織一覧</h3>
                        <button
                          onClick={() => {
                            const name = prompt('新しい組織名を入力してください')
                            if (name) {
                              const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500']
                              const newOrg: Organization = {
                                id: `org-${Date.now()}`,
                                name,
                                initial: name.charAt(0).toUpperCase(),
                                color: colors[organizations.length % colors.length]
                              }
                              setOrganizations([...organizations, newOrg])
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                          <Plus className="w-4 h-4" />新規組織
                        </button>
                      </div>
                      <div className="space-y-3">
                        {organizations.map(org => (
                          <div key={org.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${org.color} flex items-center justify-center text-white font-bold`}>
                                {org.initial}
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={org.name}
                                  onChange={(e) => {
                                    setOrganizations(organizations.map(o =>
                                      o.id === org.id ? { ...o, name: e.target.value, initial: e.target.value.charAt(0).toUpperCase() } : o
                                    ))
                                  }}
                                  className="font-medium text-slate-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                                />
                                <p className="text-sm text-slate-500">
                                  {projects.filter(p => p.organizationId === org.id).length} プロジェクト・
                                  {tasks.filter(t => t.organizationId === org.id).length} タスク
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={org.color}
                                onChange={(e) => {
                                  setOrganizations(organizations.map(o =>
                                    o.id === org.id ? { ...o, color: e.target.value } : o
                                  ))
                                }}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                                <option value="bg-blue-500">青</option>
                                <option value="bg-green-500">緑</option>
                                <option value="bg-purple-500">紫</option>
                                <option value="bg-orange-500">オレンジ</option>
                                <option value="bg-pink-500">ピンク</option>
                                <option value="bg-cyan-500">シアン</option>
                                <option value="bg-red-500">赤</option>
                                <option value="bg-yellow-500">黄</option>
                              </select>
                              <button
                                onClick={() => {
                                  if (confirm(`「${org.name}」を削除しますか？`)) {
                                    setOrganizations(organizations.filter(o => o.id !== org.id))
                                  }
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {organizations.length === 0 && (
                          <div className="text-center py-8 text-slate-500">
                            組織がありません。「新規組織」ボタンから作成してください。
                          </div>
                        )}
                      </div>
                    </div>

                    {/* プロジェクト管理 */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-800">プロジェクト管理</h3>
                        <button
                          onClick={() => setNewProjectOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                          <Plus className="w-4 h-4" />新規プロジェクト
                        </button>
                      </div>
                      <div className="space-y-3">
                        {projects.map(project => {
                          const org = organizations.find(o => o.id === project.organizationId)
                          return (
                            <div key={project.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${project.color || 'bg-slate-400'}`} />
                                <div>
                                  <input
                                    type="text"
                                    value={project.name}
                                    onChange={(e) => {
                                      setProjects(projects.map(p =>
                                        p.id === project.id ? { ...p, name: e.target.value } : p
                                      ))
                                    }}
                                    className="font-medium text-slate-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                                  />
                                  <p className="text-sm text-slate-500">
                                    {org?.name || '未割当'} ・ {tasks.filter(t => t.projectId === project.id).length} タスク
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  value={project.organizationId}
                                  onChange={(e) => {
                                    setProjects(projects.map(p =>
                                      p.id === project.id ? { ...p, organizationId: e.target.value } : p
                                    ))
                                  }}
                                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                                  {organizations.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    if (confirm(`「${project.name}」を削除しますか？`)) {
                                      setProjects(projects.filter(p => p.id !== project.id))
                                    }
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                        {projects.length === 0 && (
                          <div className="text-center py-8 text-slate-500">
                            プロジェクトがありません。「新規プロジェクト」ボタンから作成してください。
                          </div>
                        )}
                      </div>
                    </div>

                    {/* デフォルト設定 */}
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-4">デフォルト設定</h3>
                      <div className="space-y-4 bg-slate-50 p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-700">デフォルト組織</p>
                            <p className="text-sm text-slate-500">新規タスク作成時に選択される組織</p>
                          </div>
                          <select
                            value={selectedOrgId || ''}
                            onChange={(e) => setSelectedOrgId(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-lg">
                            {organizations.map(o => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-700">タスク自動アーカイブ</p>
                            <p className="text-sm text-slate-500">完了後30日でアーカイブ</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 通知タブ */}
                {settingsTab === 'notifications' && (
                  <div className="max-w-lg space-y-4">
                    {[
                      { id: 'email', title: 'メール通知', desc: '重要な更新をメールで受け取る' },
                      { id: 'deadline', title: '期限リマインダー', desc: 'タスク期限の24時間前に通知' },
                      { id: 'weekly', title: '週間サマリー', desc: '毎週月曜日に週間レポートを送信' }
                    ].map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-700">{item.title}</p>
                          <p className="text-sm text-slate-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* 外部連携タブ */}
                {settingsTab === 'integrations' && (
                  <div className="max-w-lg space-y-4">
                    <p className="text-sm text-slate-500 mb-4">外部サービスと連携して、タスク管理をより便利に。</p>
                    {[
                      { id: 'googleCalendar', name: 'Google カレンダー', desc: '予定をカレンダーと同期', icon: Calendar, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
                      { id: 'slack', name: 'Slack', desc: 'タスク更新をSlackに通知', icon: MessageSquare, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
                      { id: 'gmail', name: 'Gmail', desc: 'メールからタスクを作成', icon: Mail, bgColor: 'bg-red-100', iconColor: 'text-red-600' }
                    ].map(int => (
                      <div key={int.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${int.bgColor} flex items-center justify-center`}>
                            <int.icon className={`w-5 h-5 ${int.iconColor}`} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-700">{int.name}</p>
                            <p className="text-sm text-slate-500">{int.desc}</p>
                          </div>
                        </div>
                        {integrations[int.id] ? (
                          <button
                            onClick={() => toggleIntegration(int.id)}
                            disabled={connectingService === int.id}
                            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">
                            {connectingService === int.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '連携解除'}
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleIntegration(int.id)}
                            disabled={connectingService === int.id}
                            className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50">
                            {connectingService === int.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '連携する'}
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">
                        <strong>ヒント:</strong> 連携すると、カレンダーの予定やSlackのメッセージからタスクを自動作成できます。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* タスク詳細モーダル */}
      {taskDetailOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setTaskDetailOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 固定ヘッダー */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-white rounded-t-2xl sticky top-0 z-10 gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-800 text-sm sm:text-base truncate">{selectedTask.title}</h2>
                <p className="text-xs sm:text-sm text-slate-500 truncate">{getOrgById(selectedTask.organizationId)?.name} {selectedTask.projectId && `/ ${projects.find(p => p.id === selectedTask.projectId)?.name}`}</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {editingTask ? (
                  <button onClick={saveTaskDetail} className="px-2 sm:px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs sm:text-sm"><Save className="w-4 h-4 inline mr-1" />保存</button>
                ) : (
                  <button onClick={() => setEditingTask(true)} className="px-2 sm:px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs sm:text-sm"><Edit3 className="w-4 h-4 inline mr-1" />編集</button>
                )}
                {selectedTask.status !== 'completed' && (
                  <button onClick={() => {
                    const updated = { ...selectedTask, status: 'completed' }
                    setTasks(tasks.map(t => t.id === selectedTask.id ? updated : t))
                    setTaskDetailOpen(false)
                  }} className="px-2 sm:px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs sm:text-sm"><CheckCircle2 className="w-4 h-4 inline mr-1" /><span className="hidden sm:inline">完了</span></button>
                )}
                <button onClick={() => setTaskDetailOpen(false)} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
              </div>
            </div>
            {/* スクロール可能なコンテンツ */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              {/* タイトル編集 */}
              {editingTask && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">タイトル</label>
                  <input type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                </div>
              )}
              {/* 説明 */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">説明</label>
                {editingTask ? (
                  <textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" rows={3} />
                ) : (
                  <p className="text-slate-700">{selectedTask.description || '説明なし'}</p>
                )}
              </div>
              {/* 進捗 */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">進捗 ({editedProgress}%)</label>
                {editingTask ? (
                  <input type="range" min={0} max={100} value={editedProgress} onChange={(e) => setEditedProgress(parseInt(e.target.value))} className="w-full" />
                ) : (
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedTask.progress || 0}%` }} />
                  </div>
                )}
              </div>
              {/* ブロッカー */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">ブロッカー</label>
                {editingTask ? (
                  <textarea value={editedBlockers} onChange={(e) => setEditedBlockers(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" rows={2} placeholder="進捗を妨げている要因..." />
                ) : (
                  <p className="text-slate-700">{selectedTask.blockers || 'なし'}</p>
                )}
              </div>
              {/* 次のアクション */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">次のアクション</label>
                {editingTask ? (
                  <textarea value={editedNextActions} onChange={(e) => setEditedNextActions(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" rows={2} placeholder="次に取るべきアクション..." />
                ) : (
                  <p className="text-slate-700">{selectedTask.nextActions || 'なし'}</p>
                )}
              </div>
              {/* サブタスク */}
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
                  <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
                ) : (
                  <div className="space-y-2">
                    {subtasks.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleSubtaskStatus(sub)} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${sub.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                            {sub.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </button>
                          <span className={sub.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}>{sub.title}</span>
                        </div>
                        {sub.estimatedMinutes && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{sub.estimatedMinutes}分
                          </span>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input type="text" value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                        placeholder="サブタスクを追加（AIが所要時間を見積もります）" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <button onClick={addSubtask} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />追加
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* リンク */}
              <div className="space-y-4">
                {/* Slackリンク */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Slackリンク</label>
                  {selectedTask.slackLink ? (
                    <div className="flex items-center gap-2">
                      <a href={selectedTask.slackLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" /> Slackを開く
                      </a>
                      <button onClick={() => {
                        setEditedSlackLink('')
                        updateTaskAPI(selectedTask.id, { slackLink: '' }).then(updated => {
                          setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
                          setSelectedTask(updated)
                        })
                      }} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" value={editedSlackLink} onChange={(e) => setEditedSlackLink(e.target.value)}
                        placeholder="https://slack.com/..." className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <button onClick={() => {
                        if (editedSlackLink.trim()) {
                          updateTaskAPI(selectedTask.id, { slackLink: editedSlackLink.trim() }).then(updated => {
                            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
                            setSelectedTask(updated)
                            setEditedSlackLink('')
                          })
                        }
                      }} className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">追加</button>
                    </div>
                  )}
                </div>

                {/* ドキュメントリンク */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ドキュメント</label>
                  <div className="space-y-2">
                    {taskDocLinks.map((link, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <a href={link} target="_blank" rel="noopener noreferrer" className="flex-1 text-blue-600 hover:underline flex items-center gap-1 text-sm truncate">
                          <FileText className="w-4 h-4 flex-shrink-0" /> {link.length > 40 ? link.substring(0, 40) + '...' : link}
                        </a>
                        <button onClick={() => {
                          const newLinks = taskDocLinks.filter((_, idx) => idx !== i)
                          setTaskDocLinks(newLinks)
                          updateTaskAPI(selectedTask.id, { docLinks: newLinks }).then(updated => {
                            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
                            setSelectedTask(updated)
                          })
                        }} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input type="text" value={newDocLink} onChange={(e) => setNewDocLink(e.target.value)}
                        placeholder="https://docs.google.com/..." className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <button onClick={() => {
                        if (newDocLink.trim()) {
                          const newLinks = [...taskDocLinks, newDocLink.trim()]
                          setTaskDocLinks(newLinks)
                          updateTaskAPI(selectedTask.id, { docLinks: newLinks }).then(updated => {
                            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
                            setSelectedTask(updated)
                          })
                          setNewDocLink('')
                        }
                      }} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">追加</button>
                    </div>
                  </div>
                </div>

                {/* Google Driveリンク */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Google Driveリンク</label>
                  <div className="space-y-2">
                    {taskDriveLinks.map((link, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <a href={link} target="_blank" rel="noopener noreferrer" className="flex-1 text-blue-600 hover:underline flex items-center gap-1 text-sm truncate">
                          <ExternalLink className="w-4 h-4 flex-shrink-0" /> {link.length > 40 ? link.substring(0, 40) + '...' : link}
                        </a>
                        <button onClick={() => {
                          const newLinks = taskDriveLinks.filter((_, idx) => idx !== i)
                          setTaskDriveLinks(newLinks)
                          updateTaskAPI(selectedTask.id, { driveLinks: newLinks }).then(updated => {
                            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
                            setSelectedTask(updated)
                          })
                        }} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input type="text" value={newDriveLink} onChange={(e) => setNewDriveLink(e.target.value)}
                        placeholder="https://drive.google.com/..." className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <button onClick={() => {
                        if (newDriveLink.trim()) {
                          const newLinks = [...taskDriveLinks, newDriveLink.trim()]
                          setTaskDriveLinks(newLinks)
                          updateTaskAPI(selectedTask.id, { driveLinks: newLinks }).then(updated => {
                            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
                            setSelectedTask(updated)
                          })
                          setNewDriveLink('')
                        }
                      }} className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">追加</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新規タスクモーダル */}
      {newTaskOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => { setNewTaskOpen(false); setShowInlineProjectInput(false); setNewProjectInline('') }}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-semibold text-slate-800">新規タスク</h2>
              <button onClick={() => { setNewTaskOpen(false); setShowInlineProjectInput(false); setNewProjectInline('') }} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">タスク名 <span className="text-red-500">*</span></label>
                <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="タスク名を入力..." className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">組織 <span className="text-red-500">*</span></label>
                <select value={newTaskOrgId} onChange={(e) => setNewTaskOrgId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                  {!newTaskOrgId && <option value="">組織を選択してください</option>}
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              {/* プロジェクト選択 */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">プロジェクト</label>
                {!showInlineProjectInput ? (
                  <div className="flex gap-2">
                    <select value={newTaskProjectId} onChange={(e) => setNewTaskProjectId(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg">
                      <option value="">プロジェクトなし</option>
                      {projects.filter(p => p.organizationId === newTaskOrgId).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowInlineProjectInput(true)}
                      className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                      title="新規プロジェクト作成">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newProjectInline}
                      onChange={(e) => setNewProjectInline(e.target.value)}
                      placeholder="新規プロジェクト名..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newProjectInline.trim()) {
                          const colors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400', 'bg-pink-400']
                          const newProj: Project = {
                            id: `proj-${Date.now()}`,
                            name: newProjectInline.trim(),
                            organizationId: newTaskOrgId,
                            color: colors[projects.length % colors.length],
                            status: 'active'
                          }
                          setProjects([...projects, newProj])
                          setNewTaskProjectId(newProj.id)
                          setNewProjectInline('')
                          setShowInlineProjectInput(false)
                        }
                      }}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">
                      作成
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowInlineProjectInput(false); setNewProjectInline('') }}
                      className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
              <input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              <input type="number" value={newTaskEstimate} onChange={(e) => setNewTaskEstimate(e.target.value)} placeholder="予定時間（分）" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              <button
                onClick={createNewTask}
                disabled={!newTaskTitle.trim() || !newTaskOrgId}
                className={`w-full py-2 rounded-lg ${!newTaskTitle.trim() || !newTaskOrgId ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                作成
              </button>
              {(!newTaskTitle.trim() || !newTaskOrgId) && (
                <p className="text-xs text-red-500 text-center">タスク名と組織は必須です</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* プロジェクト詳細モーダル */}
      {projectDetailOpen && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setProjectDetailOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${selectedProject.color || 'bg-blue-500'} flex items-center justify-center`}>
                  <FolderKanban className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">{selectedProject.name}</h2>
                  <p className="text-sm text-slate-500">{getOrgById(selectedProject.organizationId)?.name}</p>
                </div>
              </div>
              <button onClick={() => setProjectDetailOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* 説明 */}
              <div>
                <label className="block text-sm text-slate-600 mb-2">説明</label>
                <textarea
                  value={selectedProject.description || ''}
                  onChange={(e) => setProjects(projects.map(p => p.id === selectedProject.id ? { ...p, description: e.target.value } : p))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  rows={3}
                  placeholder="プロジェクトの説明..."
                />
              </div>
              {/* プロジェクトのタスク一覧 */}
              <div>
                <h3 className="font-medium text-slate-700 mb-3">タスク一覧</h3>
                <div className="space-y-2">
                  {tasks.filter(t => t.projectId === selectedProject.id).map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                        <span className={task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-700'}>{task.title}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${priorityColors[task.priority]}`}>{priorityLabels[task.priority]}</span>
                    </div>
                  ))}
                  {tasks.filter(t => t.projectId === selectedProject.id).length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">このプロジェクトにはタスクがありません</p>
                  )}
                </div>
              </div>
              {/* 統計 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{tasks.filter(t => t.projectId === selectedProject.id).length}</p>
                  <p className="text-sm text-slate-500">全タスク</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{tasks.filter(t => t.projectId === selectedProject.id && t.status === 'completed').length}</p>
                  <p className="text-sm text-slate-500">完了</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.projectId === selectedProject.id && t.status === 'in_progress').length}</p>
                  <p className="text-sm text-slate-500">進行中</p>
                </div>
              </div>
              {/* アクション */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setNewTaskOpen(true)
                    setProjectDetailOpen(false)
                    if (organizations.length > 0 && !newTaskOrgId) setNewTaskOrgId(organizations[0].id)
                  }}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  <Plus className="w-4 h-4 inline mr-1" />タスクを追加
                </button>
                <button
                  onClick={() => {
                    if (confirm(`「${selectedProject.name}」を削除しますか？関連するタスクも削除されます。`)) {
                      setProjects(projects.filter(p => p.id !== selectedProject.id))
                      setTasks(tasks.filter(t => t.projectId !== selectedProject.id))
                      setProjectDetailOpen(false)
                    }
                  }}
                  className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-4 h-4 inline mr-1" />削除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新規プロジェクトモーダル */}
      {newProjectOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setNewProjectOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">新規プロジェクト</h2>
              <button onClick={() => setNewProjectOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="プロジェクト名..." className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              <textarea value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} placeholder="説明..." className="w-full px-3 py-2 border border-slate-200 rounded-lg" rows={3} />
              <select value={newProjectOrgId} onChange={(e) => setNewProjectOrgId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg">
                {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <button onClick={() => {
                if (!newProjectName.trim()) return
                const colors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400', 'bg-pink-400']
                const newProject: Project = {
                  id: `proj-${Date.now()}`,
                  name: newProjectName,
                  organizationId: newProjectOrgId,
                  color: colors[projects.length % colors.length],
                  description: newProjectDesc,
                  status: 'active'
                }
                setProjects([...projects, newProject])
                setNewProjectOpen(false)
                setNewProjectName('')
                setNewProjectDesc('')
              }} className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">作成</button>
            </div>
          </div>
        </div>
      )}

      {/* 新規目標モーダル */}
      {newGoalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setNewGoalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">新規目標</h2>
              <button onClick={() => setNewGoalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} placeholder="目標名..." className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              <input type="number" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} placeholder="目標値" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              <input type="text" value={newGoalUnit} onChange={(e) => setNewGoalUnit(e.target.value)} placeholder="単位（件、万円など）" className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              <select id="goalQuarter" className="w-full px-3 py-2 border border-slate-200 rounded-lg" defaultValue={`Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`}>
                <option value={`Q1 ${new Date().getFullYear()}`}>Q1 {new Date().getFullYear()}</option>
                <option value={`Q2 ${new Date().getFullYear()}`}>Q2 {new Date().getFullYear()}</option>
                <option value={`Q3 ${new Date().getFullYear()}`}>Q3 {new Date().getFullYear()}</option>
                <option value={`Q4 ${new Date().getFullYear()}`}>Q4 {new Date().getFullYear()}</option>
              </select>
              <button onClick={() => {
                const quarter = (document.getElementById('goalQuarter') as HTMLSelectElement)?.value || `Q1 ${new Date().getFullYear()}`
                setGoals(prev => [...prev, { id: Date.now().toString(), title: newGoalTitle, progress: 0, targetValue: parseInt(newGoalTarget) || 0, currentValue: 0, unit: newGoalUnit, quarter }])
                setNewGoalOpen(false); setNewGoalTitle(''); setNewGoalTarget(''); setNewGoalUnit('')
              }} className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">作成</button>
            </div>
          </div>
        </div>
      )}

      {/* 週間レビューモーダル */}
      {weeklyReviewOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setWeeklyReviewOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">週間レビュー</h2>
              <button onClick={() => setWeeklyReviewOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-medium text-slate-700 mb-2">今週の成果</h3>
                <p className="text-slate-600">完了タスク: {completedCount}件 / 作業時間: {Math.floor(todayTotalMinutes / 60)}時間</p>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">振り返り</label>
                <textarea value={weekReflection} onChange={(e) => setWeekReflection(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" rows={3} placeholder="今週うまくいったこと、改善点..." />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">来週のフォーカス</label>
                <textarea value={nextWeekFocus} onChange={(e) => setNextWeekFocus(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" rows={3} placeholder="来週集中すること..." />
              </div>
              <button onClick={() => setWeeklyReviewOpen(false)} className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">保存して閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* AI分析モーダル（タスク作成後に表示） */}
      {aiAnalysisOpen && analyzingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setAiAnalysisOpen(false); setAiAnalysisResult(null); setAnalyzingTask(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h2 className="font-semibold text-slate-800">AI タスク分析</h2>
              </div>
              <button onClick={() => { setAiAnalysisOpen(false); setAiAnalysisResult(null); setAnalyzingTask(null) }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6">
              {aiAnalyzing ? (
                <div className="text-center py-10">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-purple-500 mb-4" />
                  <p className="text-slate-600">「{analyzingTask.title}」を分析中...</p>
                  <p className="text-sm text-slate-500 mt-2">所要時間とサブタスクを提案します</p>
                </div>
              ) : aiAnalysisResult ? (
                <div className="space-y-6">
                  {/* タスク名 */}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">対象タスク</p>
                    <p className="font-medium text-slate-800">{analyzingTask.title}</p>
                  </div>

                  {/* 見積もり時間 */}
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">予想所要時間</p>
                      <p className="text-2xl font-bold text-blue-800">
                        {Math.floor(aiAnalysisResult.estimatedMinutes / 60)}時間 {aiAnalysisResult.estimatedMinutes % 60}分
                      </p>
                    </div>
                  </div>

                  {/* サブタスク提案 */}
                  <div>
                    <h3 className="font-medium text-slate-700 mb-3">推奨サブタスク</h3>
                    <div className="space-y-2">
                      {aiAnalysisResult.subtasks.map((st, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center">{i + 1}</span>
                            <span className="text-slate-700">{st.title}</span>
                          </div>
                          {st.canAutomate && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> AI実行可能
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* アドバイス */}
                  {aiAnalysisResult.suggestions.length > 0 && (
                    <div className="p-4 bg-yellow-50 rounded-xl">
                      <p className="text-sm font-medium text-yellow-800 mb-2">💡 アドバイス</p>
                      <ul className="space-y-1">
                        {aiAnalysisResult.suggestions.map((s, i) => (
                          <li key={i} className="text-sm text-yellow-700">・{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* アクションボタン */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setAiAnalysisOpen(false); setAiAnalysisResult(null); setAnalyzingTask(null) }}
                      className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                      スキップ
                    </button>
                    <button
                      onClick={() => addAISubtasks(aiAnalysisResult.subtasks)}
                      className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> サブタスクを追加
                    </button>
                  </div>

                  {/* AI実行可能なタスクがある場合 */}
                  {aiAnalysisResult.subtasks.some(st => st.canAutomate) && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <p className="font-medium text-purple-800">AIに任せる</p>
                      </div>
                      <p className="text-sm text-purple-700 mb-3">
                        「AI実行可能」マークのタスクはAIが代わりに実行できます。
                      </p>
                      <button
                        onClick={() => { addAISubtasks(aiAnalysisResult.subtasks); setActiveMenu('ai') }}
                        className="w-full py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600">
                        AIアシスタントで開始
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* AIスケジューリングモーダル */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setScheduleModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h2 className="font-semibold text-slate-800">AIスケジューリング</h2>
              </div>
              <button onClick={() => setScheduleModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {schedulingLoading ? (
                <div className="text-center py-16">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-500 mb-4" />
                  <p className="text-slate-600">カレンダーとタスクを分析中...</p>
                  <p className="text-sm text-slate-500 mt-2">最適なスケジュールを作成しています</p>
                </div>
              ) : aiSchedule ? (
                <div className="space-y-6">
                  {/* 警告 */}
                  {aiSchedule.warnings && aiSchedule.warnings.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <p className="font-medium text-yellow-800">注意点</p>
                      </div>
                      <ul className="space-y-1">
                        {aiSchedule.warnings.map((w, i) => (
                          <li key={i} className="text-sm text-yellow-700">・{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* スケジュール提案 */}
                  <div>
                    <h3 className="font-medium text-slate-700 mb-4">推奨スケジュール</h3>
                    <div className="space-y-3">
                      {aiSchedule.schedule.map((item, i) => (
                        <div key={i} className="p-4 border border-slate-200 rounded-xl hover:border-purple-300 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                  {item.date}
                                </span>
                                <span className="text-sm text-slate-500">
                                  {item.startTime} 〜 {item.endTime}
                                </span>
                              </div>
                              <p className="font-medium text-slate-800">{item.taskTitle}</p>
                              <p className="text-sm text-slate-500 mt-1">{item.reason}</p>
                            </div>
                            <button
                              onClick={() => {
                                applySchedule(item)
                              }}
                              className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
                              適用
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 改善提案 */}
                  {aiSchedule.suggestions && aiSchedule.suggestions.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <p className="font-medium text-blue-800 mb-2">💡 改善提案</p>
                      <ul className="space-y-1">
                        {aiSchedule.suggestions.map((s, i) => (
                          <li key={i} className="text-sm text-blue-700">・{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 一括適用ボタン */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setScheduleModalOpen(false)}
                      className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                      閉じる
                    </button>
                    <button
                      onClick={() => {
                        aiSchedule.schedule.forEach(item => applySchedule(item))
                        setScheduleModalOpen(false)
                      }}
                      className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> すべて適用
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500">
                  <p>スケジュールの提案がありません</p>
                  <button
                    onClick={runAiScheduling}
                    className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                    再実行
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
