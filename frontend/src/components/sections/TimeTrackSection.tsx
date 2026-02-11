'use client'

import React from 'react'
import { Pause } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface TimeEntry {
  id: string
  taskId: string
  taskTitle: string
  startTime: string
  endTime?: string
  duration: number
}

const TimeTrackSection: React.FC = () => {
  const {
    activeTimer,
    timerDisplay,
    stopTimer,
    timeEntries,
    todayTotalMinutes
  } = useDashboard()

  return (
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
          {timeEntries && timeEntries.length > 0 ? (
            timeEntries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-slate-800">{entry.taskTitle}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(entry.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - {entry.endTime ? new Date(entry.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '進行中'}
                  </p>
                </div>
                <span className="font-medium text-slate-700">{entry.duration}分</span>
              </div>
            ))
          ) : (
            <div className="p-5 text-center text-slate-500">まだ記録がありません</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default React.memo(TimeTrackSection)
