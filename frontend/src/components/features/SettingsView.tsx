'use client'

import { useState } from 'react'
import { User, Bell, Link2, Shield, Palette, Globe, Mail, MessageSquare, Calendar } from 'lucide-react'

interface SettingsViewProps {
  userEmail?: string
  userName?: string
}

export default function SettingsView({ userEmail, userName }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    deadline: true,
    mention: true,
    weekly: true
  })
  const [integrations, setIntegrations] = useState({
    googleCalendar: false,
    slack: false,
    gmail: false
  })

  const tabs = [
    { id: 'profile', name: 'プロフィール', icon: User },
    { id: 'notifications', name: '通知設定', icon: Bell },
    { id: 'integrations', name: '外部連携', icon: Link2 },
    { id: 'security', name: 'セキュリティ', icon: Shield },
  ]

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="flex border-b border-slate-100">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* プロフィール */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">プロフィール画像</label>
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
              <input type="text" defaultValue={userName || ''} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">メールアドレス</label>
              <input type="email" defaultValue={userEmail || ''} disabled className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">タイムゾーン</label>
              <select className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                <option>Asia/Tokyo (UTC+9)</option>
                <option>America/New_York (UTC-5)</option>
                <option>Europe/London (UTC+0)</option>
              </select>
            </div>
            <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">保存</button>
          </div>
        )}

        {/* 通知設定 */}
        {activeTab === 'notifications' && (
          <div className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-700">メール通知</p>
                  <p className="text-sm text-slate-500">重要な更新をメールで受け取る</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifications.email} onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-700">プッシュ通知</p>
                  <p className="text-sm text-slate-500">ブラウザ通知を受け取る</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifications.push} onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-700">期限リマインダー</p>
                  <p className="text-sm text-slate-500">タスク期限の24時間前に通知</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifications.deadline} onChange={(e) => setNotifications({ ...notifications, deadline: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-700">週間サマリー</p>
                  <p className="text-sm text-slate-500">毎週月曜日に週間レポートを送信</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifications.weekly} onChange={(e) => setNotifications({ ...notifications, weekly: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
          </div>
        )}

        {/* 外部連携 */}
        {activeTab === 'integrations' && (
          <div className="space-y-4 max-w-lg">
            <div className="p-4 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Google カレンダー</p>
                    <p className="text-sm text-slate-500">予定をカレンダーと同期</p>
                  </div>
                </div>
                {integrations.googleCalendar ? (
                  <button onClick={() => setIntegrations({ ...integrations, googleCalendar: false })} className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    連携解除
                  </button>
                ) : (
                  <button onClick={() => setIntegrations({ ...integrations, googleCalendar: true })} className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                    連携する
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Slack</p>
                    <p className="text-sm text-slate-500">タスク更新をSlackに通知</p>
                  </div>
                </div>
                {integrations.slack ? (
                  <button onClick={() => setIntegrations({ ...integrations, slack: false })} className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    連携解除
                  </button>
                ) : (
                  <button onClick={() => setIntegrations({ ...integrations, slack: true })} className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                    連携する
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Gmail</p>
                    <p className="text-sm text-slate-500">メールからタスクを作成</p>
                  </div>
                </div>
                {integrations.gmail ? (
                  <button onClick={() => setIntegrations({ ...integrations, gmail: false })} className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                    連携解除
                  </button>
                ) : (
                  <button onClick={() => setIntegrations({ ...integrations, gmail: true })} className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                    連携する
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* セキュリティ */}
        {activeTab === 'security' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <h3 className="font-medium text-slate-700 mb-3">パスワード変更</h3>
              <div className="space-y-3">
                <input type="password" placeholder="現在のパスワード" className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                <input type="password" placeholder="新しいパスワード" className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                <input type="password" placeholder="新しいパスワード（確認）" className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">パスワードを変更</button>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="font-medium text-slate-700 mb-3">二要素認証</h3>
              <p className="text-sm text-slate-500 mb-3">アカウントのセキュリティを強化するため、二要素認証を有効にすることをお勧めします。</p>
              <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">二要素認証を設定</button>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="font-medium text-red-600 mb-3">アカウント削除</h3>
              <p className="text-sm text-slate-500 mb-3">アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。</p>
              <button className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">アカウントを削除</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
