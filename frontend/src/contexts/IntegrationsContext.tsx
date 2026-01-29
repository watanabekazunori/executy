'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import {
  IntegrationConfig,
  IntegrationStatus,
  defaultIntegrationConfig,
  getCalendarEvents,
  CalendarEvent,
  getChannelMessages,
  SlackMessage,
  SlackChannel,
  getChannels,
  getEmails,
  Email,
} from '@/lib/integrations';

interface IntegrationsContextType {
  config: IntegrationConfig;
  status: IntegrationStatus;
  // Google Calendar
  calendarEvents: CalendarEvent[];
  loadCalendarEvents: () => Promise<void>;
  // Slack
  slackChannels: SlackChannel[];
  slackMessages: SlackMessage[];
  loadSlackChannels: () => Promise<void>;
  loadSlackMessages: (channelId: string) => Promise<void>;
  // Gmail
  emails: Email[];
  loadEmails: (query?: string) => Promise<void>;
  // 設定
  updateConfig: (config: Partial<IntegrationConfig>) => void;
  connectService: (service: keyof IntegrationConfig) => void;
  disconnectService: (service: keyof IntegrationConfig) => void;
}

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined);

export function IntegrationsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [config, setConfig] = useState<IntegrationConfig>(defaultIntegrationConfig);
  const [status, setStatus] = useState<IntegrationStatus>({
    googleCalendar: 'disconnected',
    slack: 'disconnected',
    gmail: 'disconnected',
  });

  // Google Calendar
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Slack
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [slackMessages, setSlackMessages] = useState<SlackMessage[]>([]);

  // Gmail
  const [emails, setEmails] = useState<Email[]>([]);

  // NextAuthセッションからGoogle認証状態を同期
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      if (user.provider === 'google' && user.accessToken) {
        // Google認証済みの場合、Calendar/Gmailを接続済みとする
        setConfig(prev => ({
          ...prev,
          googleCalendar: {
            ...prev.googleCalendar,
            enabled: true,
            accessToken: user.accessToken,
            calendarId: 'primary',
          },
          gmail: {
            ...prev.gmail,
            enabled: true,
            accessToken: user.accessToken,
          },
        }));
        setStatus(prev => ({
          ...prev,
          googleCalendar: 'connected',
          gmail: 'connected',
        }));
      }
    }
  }, [session]);

  // 設定をローカルストレージから読み込み（Slackのみ）
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('executy_integrations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Slack設定のみ復元
        if (parsed.slack?.botToken) {
          setConfig(prev => ({
            ...prev,
            slack: parsed.slack,
          }));
          setStatus(prev => ({
            ...prev,
            slack: 'connected',
          }));
        }
      } catch (e) {
        console.error('Failed to load integrations config:', e);
      }
    }
  }, []);

  // 設定を保存
  const updateConfig = useCallback((updates: Partial<IntegrationConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      // クライアントサイドでのみ保存
      if (typeof window !== 'undefined') {
        localStorage.setItem('executy_integrations', JSON.stringify(newConfig));
      }
      return newConfig;
    });
  }, []);

  // Google Calendar
  const loadCalendarEvents = useCallback(async () => {
    if (!config.googleCalendar?.accessToken) return;

    try {
      const events = await getCalendarEvents({
        accessToken: config.googleCalendar.accessToken,
        calendarId: config.googleCalendar.calendarId,
      });
      setCalendarEvents(events);
      setStatus(prev => ({ ...prev, googleCalendar: 'connected' }));
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      setStatus(prev => ({ ...prev, googleCalendar: 'error' }));
    }
  }, [config.googleCalendar]);

  // Slack
  const loadSlackChannels = useCallback(async () => {
    if (!config.slack?.botToken) return;

    try {
      const channels = await getChannels({ botToken: config.slack.botToken });
      setSlackChannels(channels);
      setStatus(prev => ({ ...prev, slack: 'connected' }));
    } catch (error) {
      console.error('Failed to load Slack channels:', error);
      setStatus(prev => ({ ...prev, slack: 'error' }));
    }
  }, [config.slack]);

  const loadSlackMessages = useCallback(async (channelId: string) => {
    if (!config.slack?.botToken) return;

    try {
      const messages = await getChannelMessages(
        { botToken: config.slack.botToken },
        channelId
      );
      setSlackMessages(messages);
    } catch (error) {
      console.error('Failed to load Slack messages:', error);
    }
  }, [config.slack]);

  // Gmail
  const loadEmails = useCallback(async (query?: string) => {
    if (!config.gmail?.accessToken) return;

    try {
      const { emails: loadedEmails } = await getEmails(
        { accessToken: config.gmail.accessToken },
        { query, maxResults: 20 }
      );
      setEmails(loadedEmails);
      setStatus(prev => ({ ...prev, gmail: 'connected' }));
    } catch (error) {
      console.error('Failed to load emails:', error);
      setStatus(prev => ({ ...prev, gmail: 'error' }));
    }
  }, [config.gmail]);

  // サービス接続（OAuth画面へリダイレクト）
  const connectService = useCallback((service: keyof IntegrationConfig) => {
    switch (service) {
      case 'googleCalendar':
      case 'gmail': {
        // NextAuthのGoogle認証を使用（Calendar/Gmailスコープ含む）
        signIn('google', { callbackUrl: window.location.href });
        break;
      }
      case 'slack': {
        const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
        if (!clientId) {
          alert('Slack Client IDが設定されていません。.env.localファイルを確認してください。');
          return;
        }
        const redirectUri = `${window.location.origin}/api/auth/callback/slack`;
        const scope = 'channels:read,chat:write,users:read';
        const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
        window.location.href = authUrl;
        break;
      }
    }
  }, []);

  // サービス切断
  const disconnectService = useCallback((service: keyof IntegrationConfig) => {
    updateConfig({
      [service]: { enabled: false },
    });
    setStatus(prev => ({ ...prev, [service]: 'disconnected' }));
  }, [updateConfig]);

  return (
    <IntegrationsContext.Provider
      value={{
        config,
        status,
        calendarEvents,
        loadCalendarEvents,
        slackChannels,
        slackMessages,
        loadSlackChannels,
        loadSlackMessages,
        emails,
        loadEmails,
        updateConfig,
        connectService,
        disconnectService,
      }}
    >
      {children}
    </IntegrationsContext.Provider>
  );
}

export function useIntegrations() {
  const context = useContext(IntegrationsContext);
  if (context === undefined) {
    throw new Error('useIntegrations must be used within an IntegrationsProvider');
  }
  return context;
}
