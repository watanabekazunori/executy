'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

interface Task {
  id: string; title: string; dueDate?: string; status: string; priority: string
}

interface Meeting {
  id: string; title: string; startTime: string; endTime: string; organizationId: string
}

interface CalendarViewProps {
  tasks: Task[]
  meetings: Meeting[]
  onTaskClick: (task: Task) => void
  onNewTask: () => void
}

export default function CalendarView({ tasks, meetings, onTaskClick, onNewTask }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']

  const getTasksForDate = (date: string) => tasks.filter(t => t.dueDate === date)
  const getMeetingsForDate = (date: string) => meetings.filter(m => m.startTime.split('T')[0] === date)

  const formatDate = (d: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return dateStr
  }

  const isToday = (d: number) => {
    const today = new Date()
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === d
  }

  const priorityDot: Record<string, string> = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  }

  const days = []
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-28 bg-slate-50 border border-slate-100" />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDate(d)
    const dayTasks = getTasksForDate(dateStr)
    const dayMeetings = getMeetingsForDate(dateStr)

    days.push(
      <div key={d} className={`h-28 border border-slate-100 p-1 overflow-hidden ${isToday(d) ? 'bg-blue-50' : 'bg-white'}`}>
        <div className={`text-sm font-medium mb-1 ${isToday(d) ? 'text-blue-600' : 'text-slate-700'}`}>
          {d}
        </div>
        <div className="space-y-0.5 overflow-y-auto max-h-20">
          {dayMeetings.slice(0, 2).map(m => (
            <div key={m.id} className="text-xs px-1 py-0.5 bg-purple-100 text-purple-700 rounded truncate">
              {new Date(m.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} {m.title}
            </div>
          ))}
          {dayTasks.slice(0, 2).map(t => (
            <div key={t.id} onClick={() => onTaskClick(t)} className="text-xs px-1 py-0.5 bg-slate-100 rounded truncate cursor-pointer hover:bg-slate-200 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[t.priority]}`} />
              {t.title}
            </div>
          ))}
          {(dayTasks.length + dayMeetings.length) > 4 && (
            <div className="text-xs text-slate-500">+{dayTasks.length + dayMeetings.length - 4}件</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-800">{year}年 {monthNames[month]}</h2>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button onClick={goToday} className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">今日</button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setView('month')} className={`px-3 py-1 text-sm rounded-md ${view === 'month' ? 'bg-white shadow-sm' : ''}`}>月</button>
            <button onClick={() => setView('week')} className={`px-3 py-1 text-sm rounded-md ${view === 'week' ? 'bg-white shadow-sm' : ''}`}>週</button>
          </div>
          <button onClick={onNewTask} className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
            <Plus className="w-4 h-4" /> 予定追加
          </button>
        </div>
      </div>

      {/* カレンダーグリッド */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-0">
          {dayNames.map(day => (
            <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-slate-600 bg-slate-50 border border-slate-100">
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    </div>
  )
}
