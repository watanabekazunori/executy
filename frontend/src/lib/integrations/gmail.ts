// Gmail API 統合

export interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  attachments?: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }[];
}

export interface EmailDraft {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}

export interface GmailConfig {
  accessToken: string;
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';

// ヘルパー関数
async function gmailRequest(
  endpoint: string,
  token: string,
  options?: RequestInit
): Promise<any> {
  const response = await fetch(`${GMAIL_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status}`);
  }

  return response.json();
}

// Base64エンコード（RFC 2045）
function encodeBase64(str: string): string {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// メッセージ本文をデコード
function decodeMessageBody(payload: any): { text: string; html?: string } {
  let text = '';
  let html = '';

  function extractParts(parts: any[]): void {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text += Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html += Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        extractParts(part.parts);
      }
    }
  }

  if (payload.body?.data) {
    text = Buffer.from(payload.body.data, 'base64').toString('utf-8');
  } else if (payload.parts) {
    extractParts(payload.parts);
  }

  return { text, html: html || undefined };
}

// ヘッダーから値を取得
function getHeader(headers: any[], name: string): string {
  const header = headers.find((h: any) =>
    h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value || '';
}

// メール一覧取得
export async function getEmails(
  config: GmailConfig,
  options?: {
    query?: string;
    maxResults?: number;
    labelIds?: string[];
    pageToken?: string;
  }
): Promise<{ emails: Email[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    maxResults: String(options?.maxResults || 20),
  });
  if (options?.query) params.set('q', options.query);
  if (options?.labelIds) params.set('labelIds', options.labelIds.join(','));
  if (options?.pageToken) params.set('pageToken', options.pageToken);

  const listData = await gmailRequest(
    `/users/me/messages?${params}`,
    config.accessToken
  );

  if (!listData.messages) {
    return { emails: [] };
  }

  // 各メッセージの詳細を取得
  const emails = await Promise.all(
    listData.messages.map(async (msg: { id: string }) => {
      const data = await gmailRequest(
        `/users/me/messages/${msg.id}?format=full`,
        config.accessToken
      );
      return parseEmail(data);
    })
  );

  return {
    emails,
    nextPageToken: listData.nextPageToken,
  };
}

// メール詳細取得
export async function getEmail(
  config: GmailConfig,
  messageId: string
): Promise<Email> {
  const data = await gmailRequest(
    `/users/me/messages/${messageId}?format=full`,
    config.accessToken
  );
  return parseEmail(data);
}

// メールをパース
function parseEmail(data: any): Email {
  const headers = data.payload.headers;
  const { text, html } = decodeMessageBody(data.payload);

  const attachments = data.payload.parts?.filter((p: any) =>
    p.filename && p.body?.attachmentId
  ).map((p: any) => ({
    id: p.body.attachmentId,
    filename: p.filename,
    mimeType: p.mimeType,
    size: p.body.size,
  }));

  return {
    id: data.id,
    threadId: data.threadId,
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To').split(',').map((e: string) => e.trim()),
    cc: getHeader(headers, 'Cc')?.split(',').map((e: string) => e.trim()).filter(Boolean),
    subject: getHeader(headers, 'Subject'),
    body: text,
    bodyHtml: html,
    date: new Date(getHeader(headers, 'Date')),
    isRead: !data.labelIds?.includes('UNREAD'),
    isStarred: data.labelIds?.includes('STARRED'),
    labels: data.labelIds || [],
    attachments,
  };
}

// メール送信
export async function sendEmail(
  config: GmailConfig,
  draft: EmailDraft
): Promise<{ id: string; threadId: string }> {
  const boundary = `boundary_${Date.now()}`;

  let message = [
    `To: ${draft.to.join(', ')}`,
    draft.cc ? `Cc: ${draft.cc.join(', ')}` : '',
    draft.bcc ? `Bcc: ${draft.bcc.join(', ')}` : '',
    `Subject: =?UTF-8?B?${Buffer.from(draft.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: ${draft.isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
    '',
    draft.body,
  ].filter(Boolean).join('\r\n');

  const data = await gmailRequest('/users/me/messages/send', config.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      raw: encodeBase64(message),
    }),
  });

  return {
    id: data.id,
    threadId: data.threadId,
  };
}

// 下書き作成
export async function createDraft(
  config: GmailConfig,
  draft: EmailDraft
): Promise<{ id: string; messageId: string }> {
  let message = [
    `To: ${draft.to.join(', ')}`,
    draft.cc ? `Cc: ${draft.cc.join(', ')}` : '',
    `Subject: =?UTF-8?B?${Buffer.from(draft.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: ${draft.isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
    '',
    draft.body,
  ].filter(Boolean).join('\r\n');

  const data = await gmailRequest('/users/me/drafts', config.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      message: {
        raw: encodeBase64(message),
      },
    }),
  });

  return {
    id: data.id,
    messageId: data.message.id,
  };
}

// 返信を送信
export async function replyToEmail(
  config: GmailConfig,
  originalEmail: Email,
  replyBody: string,
  options?: { replyAll?: boolean; isHtml?: boolean }
): Promise<{ id: string; threadId: string }> {
  const recipients = options?.replyAll
    ? [originalEmail.from, ...originalEmail.to.filter(e => e !== 'me')]
    : [originalEmail.from];

  let message = [
    `To: ${recipients.join(', ')}`,
    `Subject: Re: ${originalEmail.subject}`,
    `In-Reply-To: ${originalEmail.id}`,
    `References: ${originalEmail.id}`,
    'MIME-Version: 1.0',
    `Content-Type: ${options?.isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
    '',
    replyBody,
  ].join('\r\n');

  const data = await gmailRequest('/users/me/messages/send', config.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      raw: encodeBase64(message),
      threadId: originalEmail.threadId,
    }),
  });

  return {
    id: data.id,
    threadId: data.threadId,
  };
}

// メールを既読にする
export async function markAsRead(
  config: GmailConfig,
  messageId: string
): Promise<void> {
  await gmailRequest(`/users/me/messages/${messageId}/modify`, config.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      removeLabelIds: ['UNREAD'],
    }),
  });
}

// メールをスター付けする
export async function starEmail(
  config: GmailConfig,
  messageId: string,
  starred: boolean
): Promise<void> {
  await gmailRequest(`/users/me/messages/${messageId}/modify`, config.accessToken, {
    method: 'POST',
    body: JSON.stringify(starred
      ? { addLabelIds: ['STARRED'] }
      : { removeLabelIds: ['STARRED'] }
    ),
  });
}

// ラベル一覧取得
export async function getLabels(
  config: GmailConfig
): Promise<{ id: string; name: string; type: string }[]> {
  const data = await gmailRequest('/users/me/labels', config.accessToken);

  return data.labels.map((label: any) => ({
    id: label.id,
    name: label.name,
    type: label.type,
  }));
}

// メールをアーカイブ
export async function archiveEmail(
  config: GmailConfig,
  messageId: string
): Promise<void> {
  await gmailRequest(`/users/me/messages/${messageId}/modify`, config.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      removeLabelIds: ['INBOX'],
    }),
  });
}

// 重要メールを検索
export async function getImportantEmails(
  config: GmailConfig,
  options?: { maxResults?: number }
): Promise<Email[]> {
  const { emails } = await getEmails(config, {
    query: 'is:important is:unread',
    maxResults: options?.maxResults || 10,
  });
  return emails;
}

// タスク関連のメールを検索
export async function searchTaskRelatedEmails(
  config: GmailConfig,
  taskTitle: string,
  options?: { maxResults?: number }
): Promise<Email[]> {
  const { emails } = await getEmails(config, {
    query: `subject:${taskTitle} OR ${taskTitle}`,
    maxResults: options?.maxResults || 10,
  });
  return emails;
}
