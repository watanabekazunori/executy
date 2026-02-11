'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Sparkles, RefreshCw, Loader2 } from 'lucide-react'
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
    projects,
  } = useDashboard()

  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [aiSchedule] = useState<any>(null)

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

  // Get events for specific date
  const getEventsForDate = (dateStr: string) => {
    const googleEvts = calendarEvents.filter(e => e.startTime.startsWith(dateStr))
    const aiEvts = (aiSchedule?.schedule || []).filter((s: AIScheduleItem) => s.date === dateStr)
    const taskEvts = tasks.filter(t => t.dueDate === dateStr)
    return { google: googleEvts, ai: aiEvts, tasks: taskEvts }
  }

  // Navigation
  const navigate = (dir: number) => {
    const d = new Date(calendarDate)
    if (calendarView === 'day') d.setDate(d.getDate() + dir)
    else if (calendarView === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCalendarDate(d)
  }

  const goToToday = () => setCalendarDate(new Date())

  // Header title
  const getHeaderTitle = () => {
    if (calendarView === 'day')
      return `${calendarDate.getFullYear()}年${calendarDate.getMonth() + 1}月${calendarDate.getDate()}日`
    if (calendarView === 'week') {
      const week = getWeekDays(calendarDate)
      return `${week[0].getFullYear()}年${week[0].getMonth() + 1}月${week[0].getDate()}日 - ${week[6].getMonth() + 1}月${week[6].getDate()}日`
    }
    return `${calendarDate.getFullYear()}年${calendarDate.getMonth() + 1}月`
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
          >
            今日
          </button>
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 hover:bg-slate-100 rounded-full"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={() => navigate(1)}
              className="p-1.5 hover:bg-slate-100 rounded-full"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <h2 className="text-xl font-medium text-slate-800">{getHeaderTitle()}</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="flex border border-slate-300 rounded-lg overflow-hidden">
            {(['day', 'week', 'month'] as const).map(v => (
              <button
                key={v}
                onClick={() => setCalendarView(v)}
                className={`px-3 py-1.5 text-sm ${
                  calendarView === v
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {v === 'day' ? '日' : v === 'week' ? '週' : '月'}
              </button>
            ))}
          </div>
          <button
            onClick={loadCalendarEvents}
            className="p-2 hover:bg-slate-100 rounded-lg"
            disabled={calendarLoading}
          >
            <RefreshCw
              className={`w-4 h-4 text-slate-600 ${calendarLoading ? 'animate-spin' : ''}`}
            />
          </button>
          <button
            onClick={onOpenScheduleModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
          >
            <Sparkles className="w-4 h-4" /> AI
          </button>
        </div>
      </div>

      {/* Day view */}
      {calendarView === 'day' && (
        <div className="flex-1 overflow-auto">
          <div className="min-h-full">
            {hours.map(hour => {
              const dateStr = formatDate(calendarDate)
              const evts = getEventsForDate(dateStr)
              const hourEvents = evts.google.filter(
                e => !e.allDay && new Date(e.startTime).getHours() === hour
              )
              const hourAi = evts.ai.filter((s: AIScheduleItem) => parseInt(s.startTime.split(':')[0]) === hour)
              return (
                <div key={hour} className="flex border-b border-slate-100 min-h-[60px]">
                  <div className="w-16 py-2 pr-2 text-right text-xs text-slate-500 border-r border-slate-100">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 p-1 relative">
                    {hourEvents.map(e => (
                      <a
                        key={e.id}
                        href={e.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mb-1 px-2 py-1 bg-green-100 border-l-4 border-green-500 rounded text-sm hover:bg-green-200"
                      >
                        <span className="font-medium">{e.title}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          {new Date(e.startTime).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{new Date(e.endTime).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </a>
                    ))}
                    {hourAi.map((s: AIScheduleItem) => (
                      <div
                        key={s.taskId}
                        onClick={() => {
                          const t = tasks.find(t => t.id === s.taskId)
                          if (t) onOpenTaskDetail?.(t)
                        }}
                        className="mb-1 px-2 py-1 bg-purple-100 border-l-4 border-purple-500 rounded text-sm cursor-pointer hover:bg-purple-200"
                      >
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          <span className="font-medium">{s.taskTitle}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {s.startTime} - {s.endTime}
                        </span>
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
          {/* Day header */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div className="w-16 border-r border-slate-200" />
            {getWeekDays(calendarDate).map((d, i) => {
              const isToday = formatDate(d) === todayStr
              return (
                <div key={i} className="flex-1 py-2 text-center border-r border-slate-100">
                  <div className="text-xs text-slate-500">
                    {['日', '月', '火', '水', '木', '金', '土'][i]}
                  </div>
                  <div
                    className={`text-lg font-medium ${
                      isToday
                        ? 'w-8 h-8 mx-auto rounded-full bg-blue-500 text-white flex items-center justify-center'
                        : 'text-slate-800'
                    }`}
                  >
                    {d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
          {/* All-day events */}
          <div className="flex border-b border-slate-200 bg-white min-h-[40px]">
            <div className="w-16 border-r border-slate-200 text-xs text-slate-500 p-1">
              終日
            </div>
            {getWeekDays(calendarDate).map((d, i) => {
              const dateStr = formatDate(d)
              const allDayEvts = calendarEvents.filter(
                e => e.startTime.startsWith(dateStr) && e.allDay
              )
              const dayTasks = tasks.filter(t => t.dueDate === dateStr)
              return (
                <div key={i} className="flex-1 p-0.5 border-r border-slate-100 overflow-hidden">
                  {allDayEvts.slice(0, 2).map(e => (
                    <a
                      key={e.id}
                      href={e.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs px-1 py-0.5 mb-0.5 bg-green-100 text-green-800 rounded truncate hover:bg-green-200"
                    >
                      {e.title}
                    </a>
                  ))}
                  {dayTasks.slice(0, 2).map(t => (
                    <div
                      key={t.id}
                      onClick={() => onOpenTaskDetail?.(t)}
                      className="text-xs px-1 py-0.5 mb-0.5 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200"
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          {/* Time grid */}
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
                    const hourEvents = evts.google.filter(
                      e => !e.allDay && new Date(e.startTime).getHours() === hour
                    )
                    const hourAi = evts.ai.filter(
                      (s: AIScheduleItem) => parseInt(s.startTime.split(':')[0]) === hour
                    )
                    return (
                      <div
                        key={i}
                        className="flex-1 border-r border-slate-100 p-0.5 relative overflow-hidden"
                      >
                        {hourEvents.map(e => (
                          <a
                            key={e.id}
                            href={e.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs px-1 py-0.5 bg-green-200 border-l-2 border-green-500 rounded-sm truncate hover:bg-green-300"
                          >
                            {e.title}
                          </a>
                        ))}
                        {hourAi.map((s: AIScheduleItem) => (
                          <div
                            key={s.taskId}
                            onClick={() => {
                              const t = tasks.find(t => t.id === s.taskId)
                              if (t) onOpenTaskDetail?.(t)
                            }}
                            className="text-xs px-1 py-0.5 bg-purple-200 border-l-2 border-purple-500 rounded-sm truncate cursor-pointer hover:bg-purple-300"
                          >
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

      {/* Month view */}
      {calendarView === 'month' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
              <div
                key={day}
                className={`py-2 text-center text-sm font-medium ${
                  i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          {/* Date grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
            {getMonthDays(calendarDate).map((d, i) => {
              if (!d)
                return <div key={i} className="border-r border-b border-slate-100 bg-slate-50" />
              const dateStr = formatDate(d)
              const isToday = dateStr === todayStr
              const isCurrentMonth = d.getMonth() === calendarDate.getMonth()
              const evts = getEventsForDate(dateStr)
              const dayOfWeek = d.getDay()
              return (
                <div
                  key={i}
                  className={`border-r border-b border-slate-100 p-1 overflow-hidden ${
                    isToday ? 'bg-blue-50' : ''
                  }`}
                >
                  <div
                    className={`text-sm mb-1 ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center mx-auto'
                        : dayOfWeek === 0
                          ? 'text-red-500'
                          : dayOfWeek === 6
                            ? 'text-blue-500'
                            : isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                    }`}
                  >
                    {d.getDate()}
                  </div>
                  <div className="space-y-0.5 overflow-hidden" style={{ maxHeight: 'calc(100% - 28px)' }}>
                    {evts.google.slice(0, 2).map(e => (
                      <a
                        key={e.id}
                        href={e.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs px-1 py-0.5 bg-green-100 text-green-800 rounded truncate hover:bg-green-200"
                      >
                        {!e.allDay && (
                          <span className="text-green-600">
                            {new Date(e.startTime).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                          </span>
                        )}
                        {e.title}
                      </a>
                    ))}
                    {evts.ai.slice(0, 1).map((s: AIScheduleItem) => (
                      <div
                        key={s.taskId}
                        onClick={() => {
                          const t = tasks.find(t => t.id === s.taskId)
                          if (t) onOpenTaskDetail?.(t)
                        }}
                        className="text-xs px-1 py-0.5 bg-purple-100 text-purple-800 rounded truncate cursor-pointer hover:bg-purple-200"
                      >
                        <Sparkles className="w-2 h-2 inline mr-0.5" />
                        {s.taskTitle}
                      </div>
                    ))}
                    {evts.tasks.slice(0, 1).map(t => (
                      <div
                        key={t.id}
                        onClick={() => onOpenTaskDetail?.(t)}
                        className="text-xs px-1 py-0.5 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200"
                      >
                        {t.title}
                      </div>
                    ))}
                    {evts.google.length + evts.ai.length + evts.tasks.length > 3 && (
                      <div className="text-xs text-slate-500 px-1">
                        +{evts.google.length + evts.ai.length + evts.tasks.length - 3}件
                      </div>
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
}
