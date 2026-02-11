'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Sparkles, RefreshCw, Loader2, Upload, GripVertical, X, Check } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  htmlLink: string
  allDay?: boolean
}

interface AIScheduleItem {
  taskId: string
  taskTitle: string
  date: string
  startTime: string
  endTime: string
}

interface Task {
  id: string
  title: string
  dueDate?: string
  status: string
  estimatedMinutes?: number
}

interface GoogleCalendar {
  id: string
  name: string
  primary: boolean
  backgroundColor: string
}

interface DragState {
  active: boolean
  type: 'task' | 'event' | null
  itemId: string | null
  itemTitle: string
  startY: number
  currentY: number
  originHour: number
  originDate: string
}

interface CalendarSectionProps {
  onOpenTaskDetail?: (task: any) => void
  onOpenScheduleModal?: () => void
}

export default function CalendarSection({
  onOpenTaskDetail,
  onOpenScheduleModal,
}: CalendarSectionProps) {
  const {
    tasks,
    calendarEvents,
    calendarLoading,
    loadCalendarEvents,
    setCalendarEvents,
    updateTaskAPI,
    setTasks,
    showToast,
  } = useDashboard()

  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [aiSchedule] = useState<any>(null)

  // ドラッグ&ドロップ
  const [dragState, setDragState] = useState<DragState>({
    active: false, type: null, itemId: null, itemTitle: '', startY: 0, currentY: 0, originHour: 0, originDate: ''
  })
  const gridRef = useRef<HTMLDivElement>(null)
  const hourHeight = 48

  // Google Calendar同期モーダル
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary')
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncTasks, setSyncTasks] = useState<Set<string>>(new Set())

  // Helper functions
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

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

  const getEventsForDate = (dateStr: string) => {
    const googleEvts = calendarEvents.filter(e => e.startTime.startsWith(dateStr))
    const aiEvts = (aiSchedule?.schedule || []).filter((s: AIScheduleItem) => s.date === dateStr)
    const taskEvts = tasks.filter(t => t.dueDate === dateStr)
    return { google: googleEvts, ai: aiEvts, tasks: taskEvts }
  }

  const navigate = (dir: number) => {
    const d = new Date(calendarDate)
    if (calendarView === 'day') d.setDate(d.getDate() + dir)
    else if (calendarView === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCalendarDate(d)
  }

  const goToToday = () => setCalendarDate(new Date())

  const getHeaderTitle = () => {
    if (calendarView === 'day')
      return `${calendarDate.getFullYear()}年${calendarDate.getMonth() + 1}月${calendarDate.getDate()}日`
    if (calendarView === 'week') {
      const week = getWeekDays(calendarDate)
      return `${week[0].getFullYear()}年${week[0].getMonth() + 1}月${week[0].getDate()}日 - ${week[6].getMonth() + 1}月${week[6].getDate()}日`
    }
    return `${calendarDate.getFullYear()}年${calendarDate.getMonth() + 1}月`
  }

  // ===== ドラッグ&ドロップ機能 =====
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, type: 'task' | 'event', itemId: string, itemTitle: string, hour: number, dateStr: string) => {
    e.preventDefault()
    e.stopPropagation()
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setDragState({
      active: true,
      type,
      itemId: itemId,
      itemTitle: itemTitle,
      startY: clientY,
      currentY: clientY,
      originHour: hour,
      originDate: dateStr
    })
  }, [])

  useEffect(() => {
    if (!dragState.active) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      setDragState(prev => ({ ...prev, currentY: clientY }))
    }

    const handleEnd = async () => {
      if (!dragState.active || !dragState.itemId) {
        setDragState(prev => ({ ...prev, active: false }))
        return
      }

      const deltaY = dragState.currentY - dragState.startY
      const hourDelta = Math.round(deltaY / hourHeight)

      if (hourDelta === 0) {
        setDragState(prev => ({ ...prev, active: false }))
        return
      }

      const newHour = Math.max(0, Math.min(23, dragState.originHour + hourDelta))

      if (dragState.type === 'task') {
        // タスクの時間を更新（dueDateに時間を反映）
        const newDate = `${dragState.originDate}T${String(newHour).padStart(2, '0')}:00:00`
        try {
          await updateTaskAPI(dragState.itemId, { dueDate: dragState.originDate })
          setTasks(prev => prev.map(t =>
            t.id === dragState.itemId ? { ...t, dueDate: dragState.originDate } : t
          ))
          showToast(`${dragState.itemTitle}を${newHour}:00に移動しました`)
        } catch (e) {
          console.error('Failed to update task:', e)
          showToast('タスクの更新に失敗しました', 'error')
        }
      }

      setDragState({ active: false, type: null, itemId: null, itemTitle: '', startY: 0, currentY: 0, originHour: 0, originDate: '' })
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove)
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [dragState.active, dragState.currentY, dragState.startY, dragState.itemId, dragState.type, dragState.originHour, dragState.originDate, dragState.itemTitle])

  // ドラッグ中のオフセット計算
  const getDragOffset = () => {
    if (!dragState.active) return 0
    return dragState.currentY - dragState.startY
  }

  // ===== Google Calendar同期機能 =====
  const loadCalendars = async () => {
    try {
      const res = await fetch('/api/calendar/list')
      if (res.ok) {
        const data = await res.json()
        setCalendars(data.calendars || [])
        const primary = data.calendars?.find((c: GoogleCalendar) => c.primary)
        if (primary) setSelectedCalendarId(primary.id)
      }
    } catch (e) {
      console.error('Failed to load calendars:', e)
    }
  }

  const openSyncModal = async () => {
    setSyncModalOpen(true)
    await loadCalendars()
    // 今週の未完了タスクを対象に
    const weekTasks = tasks.filter(t => t.status !== 'completed' && t.dueDate)
    setSyncTasks(new Set(weekTasks.map(t => t.id)))
  }

  const toggleSyncTask = (taskId: string) => {
    setSyncTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const syncToGoogleCalendar = async () => {
    setSyncLoading(true)
    let successCount = 0

    const tasksToSync = tasks.filter(t => syncTasks.has(t.id) && t.dueDate)

    for (const task of tasksToSync) {
      try {
        const startHour = 10 // デフォルト開始時間
        const duration = task.estimatedMinutes || 60
        const startTime = `${task.dueDate}T${String(startHour).padStart(2, '0')}:00:00+09:00`
        const endHour = startHour + Math.ceil(duration / 60)
        const endTime = `${task.dueDate}T${String(Math.min(endHour, 23)).padStart(2, '0')}:00:00+09:00`

        const res = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: `[Aide] ${task.title}`,
            description: `Aideタスク: ${task.title}`,
            startTime,
            endTime,
            calendarId: selectedCalendarId
          })
        })

        if (res.ok) successCount++
      } catch (e) {
        console.error('Failed to sync task:', e)
      }
    }

    setSyncLoading(false)
    setSyncModalOpen(false)
    showToast(`${successCount}件のタスクをGoogleカレンダーに同期しました`)
    loadCalendarEvents()
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={goToToday} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
            今日
          </button>
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded-full">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 hover:bg-slate-100 rounded-full">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <h2 className="text-xl font-medium text-slate-800">{getHeaderTitle()}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-slate-300 rounded-lg overflow-hidden">
            {(['day', 'week', 'month'] as const).map(v => (
              <button
                key={v}
                onClick={() => setCalendarView(v)}
                className={`px-3 py-1.5 text-sm ${calendarView === v ? 'bg-blue-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {v === 'day' ? '日' : v === 'week' ? '週' : '月'}
              </button>
            ))}
          </div>
          <button onClick={loadCalendarEvents} className="p-2 hover:bg-slate-100 rounded-lg" disabled={calendarLoading}>
            <RefreshCw className={`w-4 h-4 text-slate-600 ${calendarLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openSyncModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
          >
            <Upload className="w-4 h-4" /> GCal同期
          </button>
          <button
            onClick={onOpenScheduleModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
          >
            <Sparkles className="w-4 h-4" /> AI
          </button>
        </div>
      </div>

      {/* ドラッグ中のヒント */}
      {dragState.active && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-sm text-blue-700 flex items-center gap-2">
          <GripVertical className="w-4 h-4" />
          「{dragState.itemTitle}」を移動中... ドロップして時間を変更
        </div>
      )}

      {/* Day view */}
      {calendarView === 'day' && (
        <div className="flex-1 overflow-auto" ref={gridRef}>
          <div className="min-h-full">
            {hours.map(hour => {
              const dateStr = formatDate(calendarDate)
              const evts = getEventsForDate(dateStr)
              const hourEvents = evts.google.filter(e => !e.allDay && new Date(e.startTime).getHours() === hour)
              const hourAi = evts.ai.filter((s: AIScheduleItem) => parseInt(s.startTime.split(':')[0]) === hour)
              const hourTasks = evts.tasks.filter(t => {
                if (!t.dueDate) return false
                return hour === 9 // タスクはデフォルト9時に表示
              })
              return (
                <div key={hour} className="flex border-b border-slate-100 min-h-[60px]" style={{ height: `${hourHeight}px` }}>
                  <div className="w-16 py-2 pr-2 text-right text-xs text-slate-500 border-r border-slate-100">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 p-1 relative">
                    {hourEvents.map(e => (
                      <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer"
                        className="block mb-1 px-2 py-1 bg-green-100 border-l-4 border-green-500 rounded text-sm hover:bg-green-200">
                        <span className="font-medium">{e.title}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          {new Date(e.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(e.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </a>
                    ))}
                    {hourAi.map((s: AIScheduleItem) => (
                      <div key={s.taskId}
                        onMouseDown={(e) => handleDragStart(e, 'task', s.taskId, s.taskTitle, hour, dateStr)}
                        onClick={() => { const t = tasks.find(t => t.id === s.taskId); if (t) onOpenTaskDetail?.(t) }}
                        className={`mb-1 px-2 py-1 bg-purple-100 border-l-4 border-purple-500 rounded text-sm cursor-grab hover:bg-purple-200 select-none ${
                          dragState.active && dragState.itemId === s.taskId ? 'opacity-50' : ''
                        }`}
                        style={dragState.active && dragState.itemId === s.taskId ? { transform: `translateY(${getDragOffset()}px)` } : {}}
                      >
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3 h-3 text-purple-400" />
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

      {/* Week view */}
      {calendarView === 'week' && (
        <div className="flex-1 flex flex-col overflow-hidden">
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
          {/* All-day events */}
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
                    <div key={t.id}
                      onMouseDown={(e) => handleDragStart(e, 'task', t.id, t.title, 9, dateStr)}
                      onClick={() => onOpenTaskDetail?.(t)}
                      className="text-xs px-1 py-0.5 mb-0.5 bg-blue-100 text-blue-800 rounded truncate cursor-grab hover:bg-blue-200 select-none">
                      <GripVertical className="w-2.5 h-2.5 inline mr-0.5 text-blue-400" />{t.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          {/* Time grid */}
          <div className="flex-1 overflow-auto" ref={gridRef}>
            <div className="min-h-full">
              {hours.map(hour => (
                <div key={hour} className="flex border-b border-slate-100" style={{ height: `${hourHeight}px` }}>
                  <div className="w-16 py-1 pr-2 text-right text-xs text-slate-400 border-r border-slate-100">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  {getWeekDays(calendarDate).map((d, i) => {
                    const dateStr = formatDate(d)
                    const evts = getEventsForDate(dateStr)
                    const hourEvents = evts.google.filter(e => !e.allDay && new Date(e.startTime).getHours() === hour)
                    const hourAi = evts.ai.filter((s: AIScheduleItem) => parseInt(s.startTime.split(':')[0]) === hour)
                    return (
                      <div key={i} className="flex-1 border-r border-slate-100 p-0.5 relative overflow-hidden">
                        {hourEvents.map(e => (
                          <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer"
                            className="block text-xs px-1 py-0.5 bg-green-200 border-l-2 border-green-500 rounded-sm truncate hover:bg-green-300">
                            {e.title}
                          </a>
                        ))}
                        {hourAi.map((s: AIScheduleItem) => (
                          <div key={s.taskId}
                            onMouseDown={(e) => handleDragStart(e, 'task', s.taskId, s.taskTitle, hour, dateStr)}
                            onClick={() => { const t = tasks.find(t => t.id === s.taskId); if (t) onOpenTaskDetail?.(t) }}
                            className={`text-xs px-1 py-0.5 bg-purple-200 border-l-2 border-purple-500 rounded-sm truncate cursor-grab hover:bg-purple-300 select-none ${
                              dragState.active && dragState.itemId === s.taskId ? 'opacity-50' : ''
                            }`}
                            style={dragState.active && dragState.itemId === s.taskId ? { transform: `translateY(${getDragOffset()}px)` } : {}}
                          >
                            <GripVertical className="w-2.5 h-2.5 inline mr-0.5" />{s.taskTitle}
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

      {/* Month view */}
      {calendarView === 'month' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
              <div key={day} className={`py-2 text-center text-sm font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600'}`}>
                {day}
              </div>
            ))}
          </div>
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
                  <div className={`text-sm mb-1 ${
                    isToday ? 'w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center mx-auto' :
                    dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                  }`}>{d.getDate()}</div>
                  <div className="space-y-0.5 overflow-hidden" style={{ maxHeight: 'calc(100% - 28px)' }}>
                    {evts.google.slice(0, 2).map(e => (
                      <a key={e.id} href={e.htmlLink} target="_blank" rel="noopener noreferrer"
                        className="block text-xs px-1 py-0.5 bg-green-100 text-green-800 rounded truncate hover:bg-green-200">
                        {!e.allDay && <span className="text-green-600">{new Date(e.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} </span>}
                        {e.title}
                      </a>
                    ))}
                    {evts.ai.slice(0, 1).map((s: AIScheduleItem) => (
                      <div key={s.taskId}
                        onClick={() => { const t = tasks.find(t => t.id === s.taskId); if (t) onOpenTaskDetail?.(t) }}
                        className="text-xs px-1 py-0.5 bg-purple-100 text-purple-800 rounded truncate cursor-pointer hover:bg-purple-200">
                        <Sparkles className="w-2 h-2 inline mr-0.5" />{s.taskTitle}
                      </div>
                    ))}
                    {evts.tasks.slice(0, 1).map(t => (
                      <div key={t.id} onClick={() => onOpenTaskDetail?.(t)}
                        className="text-xs px-1 py-0.5 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200">{t.title}</div>
                    ))}
                    {evts.google.length + evts.ai.length + evts.tasks.length > 3 && (
                      <div className="text-xs text-slate-500 px-1">+{evts.google.length + evts.ai.length + evts.tasks.length - 3}件</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Google Calendar同期モーダル */}
      {syncModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSyncModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Google Calendar に同期</h3>
              <button onClick={() => setSyncModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* カレンダー選択 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">同期先カレンダー</label>
                <select
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name} {cal.primary ? '(メイン)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* タスク選択 */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  同期するタスク ({syncTasks.size}件選択中)
                </label>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                  {tasks.filter(t => t.status !== 'completed' && t.dueDate).map(task => (
                    <button
                      key={task.id}
                      onClick={() => toggleSyncTask(task.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                        syncTasks.has(task.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                      }`}>
                        {syncTasks.has(task.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate">{task.title}</p>
                        <p className="text-xs text-slate-500">{task.dueDate} · {task.estimatedMinutes || 60}分</p>
                      </div>
                    </button>
                  ))}
                  {tasks.filter(t => t.status !== 'completed' && t.dueDate).length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      期限付きの未完了タスクがありません
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button onClick={() => setSyncModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                キャンセル
              </button>
              <button
                onClick={syncToGoogleCalendar}
                disabled={syncTasks.size === 0 || syncLoading}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {syncLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {syncLoading ? '同期中...' : `${syncTasks.size}件を同期`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
