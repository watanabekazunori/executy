'use client';

import React, { useState } from 'react';
import {
  Calendar,
  MessageSquare,
  Mail,
  Check,
  X,
  RefreshCw,
  Settings,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { useIntegrations } from '@/contexts/IntegrationsContext';

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error';
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh?: () => void;
}

function IntegrationCard({
  name,
  description,
  icon,
  status,
  onConnect,
  onDisconnect,
  onRefresh,
}: IntegrationCardProps) {
  const statusColors = {
    connected: 'bg-green-100 text-green-600 border-green-200',
    disconnected: 'bg-slate-100 text-slate-500 border-slate-200',
    error: 'bg-red-100 text-red-600 border-red-200',
  };

  const statusLabels = {
    connected: '接続済み',
    disconnected: '未接続',
    error: 'エラー',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="font-medium text-slate-900">{name}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-4">
        {status === 'connected' ? (
          <>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                更新
              </button>
            )}
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-sm text-red-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              切断
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-600 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            接続する
          </button>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPanel() {
  const {
    status,
    connectService,
    disconnectService,
    loadCalendarEvents,
    loadSlackChannels,
    loadEmails,
  } = useIntegrations();

  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">外部サービス連携</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <IntegrationCard
          name="Googleカレンダー"
          description="予定の同期・会議の自動作成"
          icon={<Calendar className="w-5 h-5 text-blue-500" />}
          status={status.googleCalendar}
          onConnect={() => connectService('googleCalendar')}
          onDisconnect={() => disconnectService('googleCalendar')}
          onRefresh={loadCalendarEvents}
        />

        <IntegrationCard
          name="Slack"
          description="通知・メッセージ要約"
          icon={<MessageSquare className="w-5 h-5 text-purple-500" />}
          status={status.slack}
          onConnect={() => connectService('slack')}
          onDisconnect={() => disconnectService('slack')}
          onRefresh={loadSlackChannels}
        />

        <IntegrationCard
          name="Gmail"
          description="メール確認・下書き作成"
          icon={<Mail className="w-5 h-5 text-red-500" />}
          status={status.gmail}
          onConnect={() => connectService('gmail')}
          onDisconnect={() => disconnectService('gmail')}
          onRefresh={() => loadEmails()}
        />
      </div>

      {/* API Key設定（開発用） */}
      {showSettings && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mt-4">
          <h3 className="text-sm font-medium text-slate-900 mb-3">開発用設定</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                defaultValue={process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Google Client ID</label>
              <input
                type="text"
                placeholder="xxxxx.apps.googleusercontent.com"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Slack Bot Token</label>
              <input
                type="password"
                placeholder="xoxb-..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            ※ 本番環境では.env.localに設定してください
          </p>
        </div>
      )}
    </div>
  );
}
