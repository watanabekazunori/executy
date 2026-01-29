// 統合サービス - エクスポート

export * from './google-calendar';
export * from './slack';
export * from './gmail';

// 統合設定の型
export interface IntegrationConfig {
  googleCalendar?: {
    enabled: boolean;
    accessToken?: string;
    calendarId?: string;
  };
  slack?: {
    enabled: boolean;
    botToken?: string;
    userToken?: string;
    defaultChannel?: string;
  };
  gmail?: {
    enabled: boolean;
    accessToken?: string;
  };
}

// 統合ステータス
export interface IntegrationStatus {
  googleCalendar: 'connected' | 'disconnected' | 'error';
  slack: 'connected' | 'disconnected' | 'error';
  gmail: 'connected' | 'disconnected' | 'error';
}

// デフォルト設定
export const defaultIntegrationConfig: IntegrationConfig = {
  googleCalendar: { enabled: false },
  slack: { enabled: false },
  gmail: { enabled: false },
};
