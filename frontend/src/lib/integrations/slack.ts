// Slack API 統合

export interface SlackMessage {
  id: string;
  channel: string;
  author: string;
  authorId: string;
  text: string;
  timestamp: string;
  threadTs?: string;
  reactions?: { name: string; count: number }[];
}

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount: number;
}

export interface SlackConfig {
  botToken: string;
  userToken?: string;
}

const SLACK_API = 'https://slack.com/api';

// ヘルパー関数
async function slackRequest(
  endpoint: string,
  token: string,
  options?: RequestInit
): Promise<any> {
  const response = await fetch(`${SLACK_API}/${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
  return data;
}

// チャンネル一覧取得
export async function getChannels(config: SlackConfig): Promise<SlackChannel[]> {
  const data = await slackRequest(
    'conversations.list?types=public_channel,private_channel&limit=200',
    config.botToken
  );

  return data.channels.map((ch: any) => ({
    id: ch.id,
    name: ch.name,
    isPrivate: ch.is_private,
    memberCount: ch.num_members,
  }));
}

// チャンネルのメッセージ取得
export async function getChannelMessages(
  config: SlackConfig,
  channelId: string,
  options?: {
    limit?: number;
    oldest?: string;
    latest?: string;
  }
): Promise<SlackMessage[]> {
  const params = new URLSearchParams({
    channel: channelId,
    limit: String(options?.limit || 50),
  });
  if (options?.oldest) params.set('oldest', options.oldest);
  if (options?.latest) params.set('latest', options.latest);

  const data = await slackRequest(
    `conversations.history?${params}`,
    config.botToken
  );

  return data.messages.map((msg: any) => ({
    id: msg.ts,
    channel: channelId,
    author: msg.user,
    authorId: msg.user,
    text: msg.text,
    timestamp: new Date(Number(msg.ts) * 1000).toISOString(),
    threadTs: msg.thread_ts,
    reactions: msg.reactions,
  }));
}

// スレッドのメッセージ取得
export async function getThreadMessages(
  config: SlackConfig,
  channelId: string,
  threadTs: string,
  options?: { limit?: number }
): Promise<SlackMessage[]> {
  const params = new URLSearchParams({
    channel: channelId,
    ts: threadTs,
    limit: String(options?.limit || 100),
  });

  const data = await slackRequest(
    `conversations.replies?${params}`,
    config.botToken
  );

  return data.messages.map((msg: any) => ({
    id: msg.ts,
    channel: channelId,
    author: msg.user,
    authorId: msg.user,
    text: msg.text,
    timestamp: new Date(Number(msg.ts) * 1000).toISOString(),
    threadTs: msg.thread_ts,
    reactions: msg.reactions,
  }));
}

// メッセージ送信
export async function sendMessage(
  config: SlackConfig,
  channelId: string,
  text: string,
  options?: {
    threadTs?: string;
    blocks?: any[];
  }
): Promise<SlackMessage> {
  const body: any = {
    channel: channelId,
    text,
  };
  if (options?.threadTs) body.thread_ts = options.threadTs;
  if (options?.blocks) body.blocks = options.blocks;

  const data = await slackRequest('chat.postMessage', config.botToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return {
    id: data.ts,
    channel: channelId,
    author: 'bot',
    authorId: data.message.user,
    text: data.message.text,
    timestamp: new Date(Number(data.ts) * 1000).toISOString(),
  };
}

// タスク通知を送信
export async function sendTaskNotification(
  config: SlackConfig,
  channelId: string,
  task: {
    id: string;
    title: string;
    description?: string;
    dueDate?: string;
    status: string;
    assignee?: string;
  },
  notificationType: 'created' | 'updated' | 'completed' | 'overdue'
): Promise<SlackMessage> {
  const statusEmoji = {
    created: '📝',
    updated: '🔄',
    completed: '✅',
    overdue: '⚠️',
  };

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${statusEmoji[notificationType]} タスク${notificationType === 'created' ? '作成' : notificationType === 'updated' ? '更新' : notificationType === 'completed' ? '完了' : '期限超過'}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${task.title}*\n${task.description || ''}`,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📅 期限: ${task.dueDate || '未設定'} | 👤 担当: ${task.assignee || '未割当'} | 状態: ${task.status}`,
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'タスクを開く',
          },
          url: `https://aide.app/tasks/${task.id}`,
        },
      ],
    },
  ];

  return sendMessage(config, channelId, `タスク: ${task.title}`, { blocks });
}

// 会議リマインダーを送信
export async function sendMeetingReminder(
  config: SlackConfig,
  channelId: string,
  meeting: {
    id: string;
    title: string;
    startTime: string;
    meetingUrl?: string;
    participants?: string[];
  },
  minutesBefore: number
): Promise<SlackMessage> {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `⏰ 会議リマインダー（${minutesBefore}分前）`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${meeting.title}*\n開始: ${meeting.startTime}`,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `参加者: ${meeting.participants?.join(', ') || '未設定'}`,
        },
      ],
    },
    ...(meeting.meetingUrl ? [{
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '会議に参加',
          },
          url: meeting.meetingUrl,
          style: 'primary',
        },
      ],
    }] : []),
  ];

  return sendMessage(config, channelId, `会議リマインダー: ${meeting.title}`, { blocks });
}

// ユーザー情報取得
export async function getUserInfo(
  config: SlackConfig,
  userId: string
): Promise<{ id: string; name: string; email?: string; avatar?: string }> {
  const data = await slackRequest(
    `users.info?user=${userId}`,
    config.botToken
  );

  return {
    id: data.user.id,
    name: data.user.real_name || data.user.name,
    email: data.user.profile.email,
    avatar: data.user.profile.image_72,
  };
}

// メンション検索
export async function searchMentions(
  config: SlackConfig,
  query: string,
  options?: { count?: number }
): Promise<SlackMessage[]> {
  if (!config.userToken) {
    throw new Error('User token required for search');
  }

  const params = new URLSearchParams({
    query,
    count: String(options?.count || 20),
  });

  const data = await slackRequest(
    `search.messages?${params}`,
    config.userToken
  );

  return data.messages.matches.map((match: any) => ({
    id: match.ts,
    channel: match.channel.id,
    author: match.user,
    authorId: match.user,
    text: match.text,
    timestamp: new Date(Number(match.ts) * 1000).toISOString(),
  }));
}

// DM送信
export async function sendDirectMessage(
  config: SlackConfig,
  userId: string,
  text: string,
  options?: { blocks?: any[] }
): Promise<SlackMessage> {
  // DMチャンネルを開く
  const openData = await slackRequest('conversations.open', config.botToken, {
    method: 'POST',
    body: JSON.stringify({ users: userId }),
  });

  return sendMessage(config, openData.channel.id, text, options);
}
