'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard, ListTodo, FolderKanban, Clock, Calendar, BarChart3,
  Sparkles, Plus, ChevronDown, Building2, User, LogOut, Zap, Settings, Loader2
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext'
import type { Project, Task } from '@/contexts/DashboardContext'

// セクション
import DashboardSection from '@/components/sections/DashboardSection'
import TasksSection from '@/components/sections/TasksSection'
import ProjectsSection from '@/components/sections/ProjectsSection'
import TimeTrackSection from '@/components/sections/TimeTrackSection'
import AIChatSection from '@/components/sections/AIChatSection'
import CalendarSection from '@/components/sections/CalendarSection'
import AnalyticsSection from '@/components/sections/AnalyticsSection'
import SettingsSection from '@/components/sections/SettingsSection'

// モーダル
import TaskDetailModal from '@/components/modals/TaskDetailModal'
import NewTaskModal from '@/components/modals/NewTaskModal'
import NewProjectModal from '@/components/modals/NewProjectModal'
import AIAnalysisModal from '@/components/modals/AIAnalysisModal'
import ScheduleModal from '@/components/modals/ScheduleModal'

const menuItems = [
  { id: 'ai', name: 'AI アシスタント', icon: Sparkles },
  { id: 'dashboard', name: 'ダッシュボード', icon: LayoutDashboard },
  { id: 'tasks', name: 'タスク', icon: ListTodo },
  { id: 'projects', name: 'プロジェクト', icon: FolderKanban },
  { id: 'calendar', name: 'カレンダー', icon: Calendar },
  { id: 'timetrack', name: 'タイムトラック', icon: Clock },
  { id: 'analytics', name: '分析・レポート', icon: BarChart3 },
  { id: 'settings', name: '設定', icon: Settings },
]

function DashboardContent() {
  const {
    organizations, projects, tasks, setTasks,
    loading, selectedOrgId, setSelectedOrgId,
    session, showToast, showConfirm, loadData,
    confirmOpen, confirmMessage, handleConfirmOk, handleConfirmCancel,
    toast, getOrgById, updateTaskAPI,
  } = useDashboard()

  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // モーダル state
  const [taskDetailOpen, setTaskDetailOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [projectDetailOpen, setProjectDetailOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // AI分析
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    estimatedMinutes: number; subtasks: { title: string; canAutomate: boolean }[];
    priority: string; suggestions: string[]
  } | null>(null)
  const [analyzingTask, setAnalyzingTask] = useState<Task | null>(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)

  // スケジュール
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [schedulingLoading, setSchedulingLoading] = useState(false)
  const [aiSchedule, setAiSchedule] = useState<{
    schedule: { taskId: string; taskTitle: string; date: string; startTime: string; endTime: string; reason: string }[];
    suggestions: string[]; warnings: string[]
  } | null>(null)

  // タスク詳細を開く
  const openTaskDetail = (task: Task) => {
    setSelectedTask(task)
    setTaskDetailOpen(true)
  }

  // AI分析後のサブタスク追加
  const addAISubtasks = async (subtasksToAdd: { title: string; canAutomate?: boolean }[]) => {
    if (!analyzingTask) return
    for (const st of subtasksToAdd) {
      try {
        await fetch(`/api/tasks/${analyzingTask.id}/subtasks`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: st.title + (st.canAutomate ? ' 🤖' : ''),
            organizationId: analyzingTask.organizationId,
            projectId: analyzingTask.projectId
          })
        })
      } catch (e) { console.error(e) }
    }
    setAiAnalysisOpen(false)
    setAiAnalysisResult(null)
    setAnalyzingTask(null)
  }

  // AIスケジューリング
  const runAiScheduling = async () => {
    setSchedulingLoading(true)
    setAiSchedule(null)
    try {
      const res = await fetch('/api/ai/schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.filter((t: Task) => t.status !== 'completed'),
          calendarEvents: [],
          workingHours: { start: '09:00', end: '18:00' }
        })
      })
      if (res.ok) setAiSchedule(await res.json())
    } catch (e) { console.error(e) }
    setSchedulingLoading(false)
  }

  const applySchedule = async (item: { taskId: string; date: string }) => {
    try {
      await updateTaskAPI(item.taskId, { dueDate: item.date })
      setTasks((prev: Task[]) => prev.map(t => t.id === item.taskId ? { ...t, dueDate: item.date } : t))
    } catch (e) { console.error(e) }
  }

  // タスク作成後のコールバック
  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev: Task[]) => [...prev, newTask])
    // AI分析開始
    setAnalyzingTask(newTask)
    setAiAnalysisOpen(true)
    setAiAnalyzing(true)
    fetch('/api/ai/analyze-task', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskTitle: newTask.title, taskDescription: '' })
    }).then(res => res.ok ? res.json() : null)
      .then(analysis => { if (analysis) setAiAnalysisResult(analysis) })
      .catch(console.error)
      .finally(() => setAiAnalyzing(false))
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* モバイルオーバーレイ */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* サイドバー */}
      <aside className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 z-40 transition-all duration-300
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-16 lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              {sidebarOpen && <span className="font-bold text-slate-800">Aide</span>}
            </div>
          </div>

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

          <nav className="flex-1 px-3 py-3 overflow-y-auto">
            {menuItems.map(item => (
              <button key={item.id} onClick={() => { setActiveMenu(item.id); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${activeMenu === item.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                <item.icon className="w-5 h-5" />
                {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
              </button>
            ))}
          </nav>

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
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg lg:text-xl font-bold text-slate-800">{menuItems.find(m => m.id === activeMenu)?.name || 'ダッシュボード'}</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              <button onClick={() => setActiveMenu('ai')} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600">
                <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">AI</span>
              </button>
              <button onClick={() => setNewTaskOpen(true)} className="flex items-center gap-1 px-2 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline text-sm font-medium">新規タスク</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-4 lg:p-6">
          {activeMenu === 'dashboard' && <DashboardSection onOpenTaskDetail={openTaskDetail} onOpenScheduleModal={() => { setScheduleModalOpen(true); runAiScheduling() }} />}
          {activeMenu === 'tasks' && <TasksSection onOpenTaskDetail={openTaskDetail} />}
          {activeMenu === 'projects' && <ProjectsSection onNewProject={() => setNewProjectOpen(true)} onSelectProject={(p) => { setSelectedProject(p); setProjectDetailOpen(true) }} />}
          {activeMenu === 'timetrack' && <TimeTrackSection />}
          {activeMenu === 'ai' && <AIChatSection />}
          {activeMenu === 'calendar' && <CalendarSection onOpenTaskDetail={openTaskDetail} onOpenScheduleModal={() => { setScheduleModalOpen(true); runAiScheduling() }} />}
          {activeMenu === 'analytics' && <AnalyticsSection />}
          {activeMenu === 'settings' && <SettingsSection onNewProjectOpen={() => setNewProjectOpen(true)} />}
        </div>
      </main>

      {/* プロジェクト詳細モーダル */}
      {projectDetailOpen && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setProjectDetailOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">{selectedProject.name}</h2>
              {selectedProject.description && <p className="text-slate-600">{selectedProject.description}</p>}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{tasks.filter((t: Task) => t.projectId === selectedProject.id).length}</p>
                  <p className="text-sm text-slate-500">タスク</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{tasks.filter((t: Task) => t.projectId === selectedProject.id && t.status === 'completed').length}</p>
                  <p className="text-sm text-slate-500">完了</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{tasks.filter((t: Task) => t.projectId === selectedProject.id && t.status === 'in_progress').length}</p>
                  <p className="text-sm text-slate-500">進行中</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setNewTaskOpen(true); setProjectDetailOpen(false) }} className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  <Plus className="w-4 h-4 inline mr-1" />タスクを追加
                </button>
                <button onClick={() => {
                  const projId = selectedProject.id
                  showConfirm(`「${selectedProject.name}」を削除しますか？`, async () => {
                    try {
                      await fetch(`/api/projects/${projId}`, { method: 'DELETE' })
                      setTasks((prev: Task[]) => prev.filter(t => t.projectId !== projId))
                      setProjectDetailOpen(false)
                      loadData()
                      showToast('プロジェクトを削除しました')
                    } catch (e) { console.error(e); showToast('削除に失敗しました', 'error') }
                  })
                }} className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">削除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* モーダル群 */}
      <TaskDetailModal open={taskDetailOpen} onClose={() => setTaskDetailOpen(false)} task={selectedTask} />
      <NewTaskModal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} onTaskCreated={handleTaskCreated} />
      <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)} organizations={organizations} onProjectCreated={() => loadData()} />
      <AIAnalysisModal
        open={aiAnalysisOpen} onClose={() => { setAiAnalysisOpen(false); setAiAnalysisResult(null); setAnalyzingTask(null) }}
        analyzing={aiAnalyzing} result={aiAnalysisResult} analyzingTask={analyzingTask}
        onAddSubtasks={addAISubtasks} onOpenAIAssistant={() => { addAISubtasks(aiAnalysisResult?.subtasks || []); setActiveMenu('ai') }}
      />
      <ScheduleModal
        open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)}
        loading={schedulingLoading} schedule={aiSchedule}
        onApplySchedule={applySchedule} onApplyAll={() => { aiSchedule?.schedule.forEach(s => applySchedule(s)); setScheduleModalOpen(false) }}
      />

      {/* トースト通知 */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[200] px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* 確認ダイアログ */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={handleConfirmCancel}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <p className="text-slate-800 mb-6">{confirmMessage}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleConfirmCancel} className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">キャンセル</button>
              <button onClick={handleConfirmOk} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">削除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { status } = useSession()

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
  }
  if (status === 'unauthenticated') return null

  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}
