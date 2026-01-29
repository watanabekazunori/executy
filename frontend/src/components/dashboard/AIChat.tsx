'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  ListTodo,
  Clock,
  Calendar,
  Mail,
  MessageSquare,
} from 'lucide-react';
import {
  chatWithAI,
  breakdownTaskWithAI,
  estimateTimeWithAI,
  suggestPriorityWithAI,
  summarizeMeetingWithAI,
  generateEmailDraftWithAI,
  summarizeSlackWithAI,
} from '@/lib/gemini';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'priority',
    label: '今日の優先タスク',
    icon: <ListTodo className="w-4 h-4" />,
    prompt: '今日優先的に取り組むべきタスクを教えてください',
  },
  {
    id: 'breakdown',
    label: 'タスク分解',
    icon: <Sparkles className="w-4 h-4" />,
    prompt: '「新規プロジェクト企画書作成」というタスクを分解してください',
  },
  {
    id: 'time',
    label: '時間見積もり',
    icon: <Clock className="w-4 h-4" />,
    prompt: '週次報告書作成にかかる時間を見積もってください',
  },
  {
    id: 'schedule',
    label: 'スケジュール提案',
    icon: <Calendar className="w-4 h-4" />,
    prompt: '今週のスケジュールを最適化する提案をしてください',
  },
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'こんにちは！EXECUTYのAIアシスタントです。タスク管理、スケジュール調整、優先順位付けについてお手伝いします。何かお聞きになりたいことはありますか？',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (prompt?: string) => {
    const message = prompt || input.trim();
    if (!message || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Gemini APIを使用
      const response = await chatWithAI(message);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.success
          ? response.text
          : `申し訳ございません。エラーが発生しました: ${response.error}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'すみません、応答の生成中にエラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSend(action.prompt);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-lg">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-medium text-slate-900 text-sm">AIアシスタント</h3>
          <p className="text-xs text-slate-500">Powered by Gemini</p>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-slate-200">
        {quickActions.map(action => (
          <button
            key={action.id}
            onClick={() => handleQuickAction(action)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-600 whitespace-nowrap transition-colors disabled:opacity-50"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] bg-slate-50">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-primary-500'
                  : 'bg-gradient-to-br from-primary-500 to-accent-500'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                message.role === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${message.role === 'user' ? 'opacity-70' : 'text-slate-400'}`}>
                {message.timestamp.toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="質問やリクエストを入力..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-primary-500 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 rounded-xl text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
