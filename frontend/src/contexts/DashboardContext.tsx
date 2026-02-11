'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Type Definitions
export interface Organization {
  id: string
  name: string
  initial: string
  color: string
}

export interface Project {
  id: string
  name: string
  organizationId: string
  color?: string
  description?: string
  status?: string
}

export interface Comment {
  id: string
  content: string
  createdAt: string
  author: string
}

export interface Task {
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
  comments?: Comment[]
}

export interface TimeEntry {
  id: string
  taskId: string
  taskTitle: string
  startTime: string
  endTime?: string
  duration: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface Meeting {
  id: string
  title: string
  startTime: string
  endTime: string
  organizationId: string
}

export interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  allDay: boolean
  location?: string
  htmlLink?: string
}

// API Functions
async function fetchOrganizations(): Promise<Organization[]> {
  const res = await fetch('/api/organizations')
  return res.ok ? res.json() : []
}

async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects')
  return res.ok ? res.json() : []
}

async function fetchTasks(): Promise<Task[]> {
  const res = await fetch('/api/tasks?parentOnly=true')
  return res.ok ? res.json() : []
}

async function updateTaskAPI(id: string, data: Partial<Task>): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update task')
  return res.json()
}

async function createTaskAPI(data: Partial<Task>): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create task')
  return res.json()
}

// Constants
export const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200'
}

export const priorityLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低'
}

export const statusLabels: Record<string, string> = {
  pending: '未着手',
  in_progress: '進行中',
  completed: '完了',
  blocked: 'ブロック'
}

// Context Type
interface DashboardContextType {
  // Session and auth
  session: any
  status: string

  // Core data
  organizations: Organization[]
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>
  projects: Project[]
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  loading: boolean

  // Organization selection
  selectedOrgId: string | null
  setSelectedOrgId: (id: string | null) => void

  // Timer state
  timeEntries: TimeEntry[]
  setTimeEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>
  activeTimer: { taskId: string; taskTitle: string; startTime: Date } | null
  setActiveTimer: (timer: { taskId: string; taskTitle: string; startTime: Date } | null) => void
  timerDisplay: string
  setTimerDisplay: (display: string) => void
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>

  // Timer functions
  startTimer: (taskId: string, taskTitle: string) => void
  stopTimer: () => void

  // Calendar state
  calendarEvents: CalendarEvent[]
  setCalendarEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
  loadCalendarEvents: () => Promise<void>

  // Integration state
  integrations: Record<string, boolean>
  setIntegrations: React.Dispatch<React.SetStateAction<Record<string, boolean>>>

  // Toast notifications
  showToast: (message: string, type?: 'success' | 'error') => void

  // Confirm dialog
  showConfirm: (message: string, onConfirm: () => void) => void
  handleConfirmOk: () => void
  handleConfirmCancel: () => void
  confirmOpen: boolean
  confirmMessage: string

  // Data loading
  loadData: () => Promise<void>

  // API functions
  updateTaskAPI: (id: string, data: Partial<Task>) => Promise<Task>
  createTaskAPI: (data: Partial<Task>) => Promise<Task>

  // Constants
  priorityColors: Record<string, string>
  priorityLabels: Record<string, string>

  // Calendar loading
  calendarLoading: boolean

  // Toast state
  toast: { message: string; type: 'success' | 'error' } | null

  // Computed values
  getOrgById: (id: string) => Organization | undefined
  getProjectById: (id: string) => Project | undefined
  completedCount: number
  inProgressCount: number
  overdueCount: number
  todayTotalMinutes: number
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

// Provider Component
export function DashboardProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Core data
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Organization selection
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)

  // Timer state
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [activeTimer, setActiveTimer] = useState<{ taskId: string; taskTitle: string; startTime: Date } | null>(null)
  const [timerDisplay, setTimerDisplay] = useState('00:00:00')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)

  // Integration state
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({
    googleCalendar: false,
    slack: false,
    gmail: false
  })

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const confirmCallback = useRef<(() => void) | null>(null)
  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmMessage(message)
    confirmCallback.current = onConfirm
    setConfirmOpen(true)
  }
  const handleConfirmOk = () => {
    confirmCallback.current?.()
    setConfirmOpen(false)
  }
  const handleConfirmCancel = () => {
    setConfirmOpen(false)
  }

  // Initial mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Restore time entries from localStorage
  useEffect(() => {
    if (mounted) {
      try {
        const saved = localStorage.getItem('aide-time-entries')
        if (saved) setTimeEntries(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [mounted])

  // Save time entries to localStorage (keep latest 100 only)
  useEffect(() => {
    if (mounted && timeEntries.length > 0) {
      try {
        const entriesToSave = timeEntries.slice(-100)
        localStorage.setItem('aide-time-entries', JSON.stringify(entriesToSave))
      } catch (e) {
        console.error(e)
      }
    }
  }, [timeEntries, mounted])

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Load data when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  // Timer cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Load all data from API
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      let [orgs, projs, tsks] = await Promise.all([fetchOrganizations(), fetchProjects(), fetchTasks()])

      // Auto-create default organization on first login
      if (orgs.length === 0) {
        const res = await fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'ファンベスト',
            initial: 'F',
            color: 'bg-blue-500'
          })
        })
        if (res.ok) {
          const newOrg = await res.json()
          orgs = [newOrg]
        }
      }

      setOrganizations(orgs)
      setProjects(projs)
      setTasks(tsks)
      if (orgs.length > 0 && !selectedOrgId) setSelectedOrgId(orgs[0].id)

      // Load calendar events
      loadCalendarEvents()
    } catch (e) {
      console.error(e)
      showToast('データの読み込みに失敗しました', 'error')
    }
    setLoading(false)
  }, [selectedOrgId])

  // Load calendar events from API
  const loadCalendarEvents = useCallback(async () => {
    setCalendarLoading(true)
    try {
      const res = await fetch('/api/calendar')
      if (res.ok) {
        const data = await res.json()
        setCalendarEvents(data.events || [])
        setIntegrations(prev => ({ ...prev, googleCalendar: true }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCalendarLoading(false)
    }
  }, [])

  // Timer functions
  const startTimer = (taskId: string, taskTitle: string) => {
    if (activeTimer) stopTimer()
    const now = new Date()
    setActiveTimer({ taskId, taskTitle, startTime: now })
    timerRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - now.getTime()) / 1000)
      const h = Math.floor(diff / 3600)
        .toString()
        .padStart(2, '0')
      const m = Math.floor((diff % 3600) / 60)
        .toString()
        .padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setTimerDisplay(`${h}:${m}:${s}`)
    }, 1000)
  }

  const stopTimer = () => {
    if (!activeTimer) return
    if (timerRef.current) clearInterval(timerRef.current)
    const end = new Date()
    const dur = Math.floor((end.getTime() - activeTimer.startTime.getTime()) / 60000)
    setTimeEntries(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        taskId: activeTimer.taskId,
        taskTitle: activeTimer.taskTitle,
        startTime: activeTimer.startTime.toISOString(),
        endTime: end.toISOString(),
        duration: dur
      }
    ])
    setActiveTimer(null)
    setTimerDisplay('00:00:00')
  }

  // Helper functions to get data by ID
  const getOrgById = (id: string) => organizations.find(o => o.id === id)
  const getProjectById = (id: string) => projects.find(p => p.id === id)

  // Computed values
  const completedCount = useMemo(() => tasks.filter(t => t.status === 'completed').length, [tasks])
  const inProgressCount = useMemo(() => tasks.filter(t => t.status === 'in_progress').length, [tasks])
  const overdueCount = useMemo(
    () =>
      tasks.filter(
        t =>
          t.dueDate &&
          t.dueDate < new Date().toISOString().split('T')[0] &&
          t.status !== 'completed'
      ).length,
    [tasks]
  )
  const todayTotalMinutes = useMemo(() => timeEntries.reduce((s, e) => s + e.duration, 0), [timeEntries])

  const value: DashboardContextType = {
    session,
    status,
    organizations,
    setOrganizations,
    projects,
    setProjects,
    tasks,
    setTasks,
    loading,
    selectedOrgId,
    setSelectedOrgId,
    timeEntries,
    setTimeEntries,
    activeTimer,
    setActiveTimer,
    timerDisplay,
    setTimerDisplay,
    timerRef,
    startTimer,
    stopTimer,
    calendarEvents,
    setCalendarEvents,
    loadCalendarEvents,
    integrations,
    setIntegrations,
    showToast,
    showConfirm,
    handleConfirmOk,
    handleConfirmCancel,
    confirmOpen,
    confirmMessage,
    loadData,
    updateTaskAPI,
    createTaskAPI,
    priorityColors,
    priorityLabels,
    calendarLoading,
    toast,
    getOrgById,
    getProjectById,
    completedCount,
    inProgressCount,
    overdueCount,
    todayTotalMinutes
  }

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

// Hook to use the dashboard context
export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}

// Export API functions and constants for use in other files
export { fetchOrganizations, fetchProjects, fetchTasks, updateTaskAPI, createTaskAPI }
