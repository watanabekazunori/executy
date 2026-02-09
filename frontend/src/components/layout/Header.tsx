'use client'

import { useState, useEffect } from 'react'
import {
  Menu,
  Search,
  Bell,
  Plus,
  Mic,
  Sparkles,
  Calendar
} from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications] = useState(3)
  const [formattedDate, setFormattedDate] = useState('')

  useEffect(() => {
    const today = new Date()
    setFormattedDate(today.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }))
  }, [])

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200">
      <div className="flex items-center justify-between px-3 sm:px-6 py-4 gap-2 sm:gap-4">
        {/* 左側 */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors lg:hidden flex-shrink-0"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-xl font-semibold text-slate-900 truncate">おはようございます、渡邊さん</h2>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* 中央: 検索 */}
        <div className="hidden md:flex items-center flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="タスク、プロジェクト、クライアントを検索..."
              className="input pl-12 pr-12"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 transition-colors">
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 右側 */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* AI Quick Action */}
          <button className="btn-accent flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AIに相談</span>
          </button>

          {/* 新規タスク */}
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">新規タスク</span>
          </button>

          {/* 通知 */}
          <button className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <Bell className="w-5 h-5 text-slate-600" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 rounded-full text-xs flex items-center justify-center font-medium text-white">
                {notifications}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
