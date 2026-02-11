'use client'

import { useState } from 'react'
import {
  User,
  Building2,
  Bell,
  Link2,
  Plus,
  Trash2,
  Settings,
  Calendar,
  MessageSquare,
  Mail,
  Loader2,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useDashboard } from '@/contexts/DashboardContext'

interface Organization {
  id: string
  name: string
  initial: string
  color: string
}

interface Project {
  id: string
  name: string
  organizationId: string
  color?: string
  description?: string
}

interface SettingsSectionProps {
  onNewProjectOpen: () => void
}

export default function SettingsSection({
  onNewProjectOpen,
}: SettingsSectionProps) {
  const { data: session } = useSession()
  const {
    organizations, setOrganizations,
    projects, setProjects,
    integrations, setIntegrations,
    showConfirm, showToast,
    selectedOrgId, setSelectedOrgId,
    loadCalendarEvents,
  } = useDashboard()
  const [connectingService, setConnectingService] = useState<string | null>(null)
  const [settingsTab, setSettingsTab] = useState<
    'profile' | 'organization' | 'notifications' | 'integrations'
  >('profile')
  const [newOrgDialogOpen, setNewOrgDialogOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')

  const tabs = [
    { id: 'profile', name: 'プロフィール', icon: User },
    { id: 'organization', name: '組織設計', icon: Building2 },
    { id: 'notifications', name: '通知', icon: Bell },
    { id: 'integrations', name: '外部連携', icon: Link2 },
  ]

  const integrationOptions = [
    {
      id: 'googleCalendar',
      name: 'Google カレンダー',
      desc: '予定をカレンダーと同期',
      icon: Calendar,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'slack',
      name: 'Slack',
      desc: 'タスク更新をSlackに通知',
      icon: MessageSquare,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      id: 'gmail',
      name: 'Gmail',
      desc: 'メールからタスクを作成',
      icon: Mail,
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
    },
  ]

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return
    try {
      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrgName.trim(),
          initial: newOrgName.charAt(0).toUpperCase(),
          color: colors[organizations.length % colors.length],
        }),
      })
      if (res.ok) {
        const newOrg = await res.json()
        setOrganizations([...organizations, newOrg])
        setNewOrgName('')
        setNewOrgDialogOpen(false)
        showToast('組織を作成しました')
      }
    } catch (e) {
      console.error(e)
      showToast('作成に失敗しました', 'error')
    }
  }

  const handleToggleIntegration = async (serviceId: string) => {
    setConnectingService(serviceId)
    try {
      if (serviceId === 'googleCalendar') {
        if (integrations.googleCalendar) {
          setIntegrations(prev => ({ ...prev, googleCalendar: false }))
        } else {
          await loadCalendarEvents()
        }
      }
      // For other services, just toggle the state
      if (serviceId !== 'googleCalendar') {
        setIntegrations(prev => ({ ...prev, [serviceId]: !prev[serviceId] }))
      }
    } catch (e) {
      console.error(e)
      showToast('連携に失敗しました', 'error')
    } finally {
      setConnectingService(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex border-b border-slate-100">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSettingsTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              settingsTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-600 hover:text-slate-800 border-transparent'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Profile Tab */}
        {settingsTab === 'profile' && (
          <div className="max-w-lg space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                プロフィール画像
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="w-8 h-8 text-slate-400" />
                </div>
                <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
                  画像を変更
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">表示名</label>
              <input
                type="text"
                defaultValue={session?.user?.name || ''}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                defaultValue={session?.user?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
              />
            </div>
            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              保存
            </button>
          </div>
        )}

        {/* Organization Tab */}
        {settingsTab === 'organization' && (
          <div className="space-y-8">
            {/* Organization List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">組織一覧</h3>
                <button
                  onClick={() => {
                    setNewOrgName('')
                    setNewOrgDialogOpen(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  新規組織
                </button>
              </div>
              <div className="space-y-3">
                {organizations.map(org => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg ${org.color} flex items-center justify-center text-white font-bold`}
                      >
                        {org.initial}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={org.name}
                          onChange={e => {
                            const newName = e.target.value
                            setOrganizations(
                              organizations.map(o =>
                                o.id === org.id
                                  ? {
                                      ...o,
                                      name: newName,
                                      initial: newName.charAt(0).toUpperCase(),
                                    }
                                  : o
                              )
                            )
                          }}
                          onBlur={e => {
                            fetch(`/api/organizations/${org.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                name: e.target.value,
                                initial: e.target.value.charAt(0).toUpperCase(),
                              }),
                            }).catch(console.error)
                          }}
                          className="font-medium text-slate-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                        />
                        <p className="text-sm text-slate-500">
                          {projects.filter(p => p.organizationId === org.id).length} プロジェクト
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={org.color}
                        onChange={e => {
                          const newColor = e.target.value
                          setOrganizations(
                            organizations.map(o =>
                              o.id === org.id ? { ...o, color: newColor } : o
                            )
                          )
                          fetch(`/api/organizations/${org.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ color: newColor }),
                          }).catch(console.error)
                        }}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                      >
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
                          const orgId = org.id
                          showConfirm(`「${org.name}」を削除しますか？`, async () => {
                            try {
                              await fetch(`/api/organizations/${orgId}`, { method: 'DELETE' })
                              setOrganizations(organizations.filter(o => o.id !== orgId))
                              showToast('組織を削除しました')
                            } catch (e) {
                              console.error(e)
                              showToast('削除に失敗しました', 'error')
                            }
                          })
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
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

            {/* Project Management */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">プロジェクト管理</h3>
                <button
                  onClick={onNewProjectOpen}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                >
                  <Plus className="w-4 h-4" />
                  新規プロジェクト
                </button>
              </div>
              <div className="space-y-3">
                {projects.map(project => {
                  const org = organizations.find(o => o.id === project.organizationId)
                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${project.color || 'bg-slate-400'}`} />
                        <div>
                          <input
                            type="text"
                            value={project.name}
                            onChange={e => {
                              const newName = e.target.value
                              setProjects(
                                projects.map(p =>
                                  p.id === project.id ? { ...p, name: newName } : p
                                )
                              )
                            }}
                            onBlur={e => {
                              fetch(`/api/projects/${project.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: e.target.value }),
                              }).catch(console.error)
                            }}
                            className="font-medium text-slate-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                          />
                          <p className="text-sm text-slate-500">{org?.name || '未割当'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={project.organizationId}
                          onChange={e => {
                            const newOrgId = e.target.value
                            setProjects(
                              projects.map(p =>
                                p.id === project.id ? { ...p, organizationId: newOrgId } : p
                              )
                            )
                            fetch(`/api/projects/${project.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ organizationId: newOrgId }),
                            }).catch(console.error)
                          }}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                        >
                          {organizations.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const projId = project.id
                            showConfirm(`「${project.name}」を削除しますか？`, async () => {
                              try {
                                await fetch(`/api/projects/${projId}`, { method: 'DELETE' })
                                setProjects(projects.filter(p => p.id !== projId))
                                showToast('プロジェクトを削除しました')
                              } catch (e) {
                                console.error(e)
                                showToast('削除に失敗しました', 'error')
                              }
                            })
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
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

            {/* Default Settings */}
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
                    onChange={e => setSelectedOrgId(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg"
                  >
                    {organizations.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
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

        {/* Notifications Tab */}
        {settingsTab === 'notifications' && (
          <div className="max-w-lg space-y-4">
            {[
              {
                id: 'email',
                title: 'メール通知',
                desc: '重要な更新をメールで受け取る',
              },
              {
                id: 'deadline',
                title: '期限リマインダー',
                desc: 'タスク期限の24時間前に通知',
              },
              {
                id: 'weekly',
                title: '週間サマリー',
                desc: '毎週月曜日に週間レポートを送信',
              },
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

        {/* Integrations Tab */}
        {settingsTab === 'integrations' && (
          <div className="max-w-lg space-y-4">
            <p className="text-sm text-slate-500 mb-4">
              外部サービスと連携して、タスク管理をより便利に。
            </p>
            {integrationOptions.map(int => (
              <div
                key={int.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-xl"
              >
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
                    onClick={() => handleToggleIntegration(int.id)}
                    disabled={connectingService === int.id}
                    className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    {connectingService === int.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      '連携解除'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleIntegration(int.id)}
                    disabled={connectingService === int.id}
                    className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {connectingService === int.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      '連携する'
                    )}
                  </button>
                )}
              </div>
            ))}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                <strong>ヒント:</strong>{' '}
                連携すると、カレンダーの予定やSlackのメッセージからタスクを自動作成できます。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Organization Dialog */}
      {newOrgDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="font-semibold text-slate-800 mb-4">新規組織</h2>
            <input
              type="text"
              value={newOrgName}
              onChange={e => setNewOrgName(e.target.value)}
              placeholder="組織名..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setNewOrgDialogOpen(false)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateOrg}
                disabled={!newOrgName.trim()}
                className={`flex-1 py-2 rounded-lg ${
                  !newOrgName.trim()
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
