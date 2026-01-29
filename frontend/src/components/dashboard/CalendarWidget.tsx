'use client'

import { useState } from 'react'
import { Calendar, Clock, MapPin, Users, Video, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

export default function CalendarWidget() {
  const [events, setEvents] = useState<any[]>([])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">今日の予定</h3>
            <p className="text-xs text-slate-500">{events.length}件のイベント</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
          <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 mb-4">予定がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="relative p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl overflow-hidden">
                <div className="h-full bg-blue-500" />
              </div>

              <div className="pl-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-slate-800">
                      {event.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {event.time}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    {event.isOnline ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    {event.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {event.attendees}名
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Google Calendar連携ボタン */}
      <button className="w-full mt-4 py-3 text-sm text-slate-500 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors border border-dashed border-slate-300 rounded-xl hover:border-blue-500">
        <Calendar className="w-4 h-4" />
        <span>Google Calendarと同期</span>
      </button>
    </div>
  )
}
