'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  ListTodo,
  Target,
  Calendar,
  Building2,
  Sparkles,
  Settings,
  ChevronDown,
  FolderKanban,
  Users,
  BarChart3,
  Clock,
  Briefcase,
  User,
  PanelLeftClose,
  PanelLeft,
  Loader2
} from 'lucide-react'
import { Organization, organizationsAPI } from '@/lib/api'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  selectedOrgId?: string | null
  onSelectOrg?: (orgId: string | null) => void
}

const menuItems = [
  { id: 'dashboard', name: 'ダッシュボード', icon: LayoutDashboard, href: '/' },
  { id: 'tasks', name: 'タスク', icon: ListTodo, href: '/tasks', badge: null },
  { id: 'projects', name: 'プロジェクト', icon: FolderKanban, href: '/projects' },
  { id: 'goals', name: '四半期目標', icon: Target, href: '/goals' },
  { id: 'calendar', name: 'カレンダー', icon: Calendar, href: '/calendar' },
  { id: 'clients', name: 'クライアント', icon: Users, href: '/clients' },
  { id: 'analytics', name: '分析・レポート', icon: BarChart3, href: '/analytics' },
  { id: 'timetrack', name: 'タイムトラック', icon: Clock, href: '/timetrack' },
]

const bottomMenuItems = [
  { id: 'ai', name: 'AI アシスタント', icon: Sparkles, href: '/ai' },
  { id: 'settings', name: '設定', icon: Settings, href: '/settings' },
]

// 組織カラー
const orgColorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
}

export default function Sidebar({ isOpen, onToggle, selectedOrgId, onSelectOrg }: SidebarProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [activeItem, setActiveItem] = useState('dashboard')

  // 組織データ取得
  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const data = await organizationsAPI.getAll()
      setOrganizations(data)
    } catch (err) {
      console.error('Failed to load organizations:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSelectedOrg = () => {
    if (!selectedOrgId) return null
    return organizations.find(org => org.id === selectedOrgId)
  }

  const selectedOrg = getSelectedOrg()

  const handleSelectOrg = (orgId: string | null) => {
    if (onSelectOrg) {
      onSelectOrg(orgId)
    }
    setOrgDropdownOpen(false)
  }

  // タスク数をカウント
  const getTaskBadge = () => {
    // TODO: 実際のタスク数を取得
    return organizations.reduce((sum, org) => sum + (org.taskCount || 0), 0) || null
  }

  return (
    <>
      <aside className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 z-40 transition-all duration-300 ${isOpen ? 'w-64' : 'w-0 -translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* ロゴ */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">EXECUTY</h1>
                <p className="text-xs text-slate-500">Executive Task Manager</p>
              </div>
            </div>
            <button onClick={onToggle} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors hidden lg:block">
              <PanelLeftClose className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* 組織セレクター */}
          <div className="px-4 py-4">
            <div className="relative">
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : !selectedOrgId ? (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-green-500 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className={`w-8 h-8 rounded-lg ${orgColorMap[selectedOrg?.color || 'blue']} flex items-center justify-center`}>
                      {selectedOrg?.initial === '個' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Building2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {loading ? '読み込み中...' : selectedOrg?.name || '全組織'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* ドロップダウン */}
              {orgDropdownOpen && !loading && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                  {/* 全組織 */}
                  <button
                    onClick={() => handleSelectOrg(null)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${!selectedOrgId ? 'bg-slate-50' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-green-500 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm text-slate-700">全組織</span>
                  </button>

                  {/* 各組織 */}
                  {organizations.map(org => (
                    <button
                      key={org.id}
                      onClick={() => handleSelectOrg(org.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${selectedOrgId === org.id ? 'bg-slate-50' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${orgColorMap[org.color]} flex items-center justify-center`}>
                        {org.initial === '個' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Building2 className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-sm text-slate-700 truncate">{org.name}</span>
                        {org.taskCount !== undefined && org.taskCount > 0 && (
                          <span className="ml-2 text-xs text-slate-500">{org.taskCount}タスク</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* メインメニュー */}
          <nav className="flex-1 px-4 py-2 overflow-y-auto scrollbar-thin">
            <ul className="space-y-1">
              {menuItems.map(item => {
                const badge = item.id === 'tasks' ? getTaskBadge() : item.badge
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveItem(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                        activeItem === item.id
                          ? 'bg-primary-50 text-primary-600'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      {badge && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-600 rounded-full text-xs font-medium">
                          {badge}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* 下部メニュー */}
          <div className="px-4 py-4 border-t border-slate-200">
            <ul className="space-y-1">
              {bottomMenuItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveItem(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeItem === item.id
                        ? 'bg-primary-50 text-primary-600'
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* 閉じている時のトグルボタン */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-4 z-50 p-2 bg-white hover:bg-slate-50 rounded-xl shadow-lg transition-colors hidden lg:flex"
        >
          <PanelLeft className="w-5 h-5 text-slate-600" />
        </button>
      )}
    </>
  )
}
