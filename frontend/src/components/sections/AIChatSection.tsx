'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Sparkles, CheckCircle2, Plus, MessageCircle, ChevronRight } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

// メッセージタイプ定義
interface ChatOption {
  id: string
  label: string
  description?: string
  selected?: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type: 'text' | 'options' | 'task_summary' | 'subtask_select'
  options?: ChatOption[]
  taskData?: {
    title: string
    subtasks: { title: string; canAutomate: boolean }[]
    priority: string
    estimatedMinutes: number
  }
}

interface ConversationState {
  phase: 'idle' | 'refining' | 'subtasks' | 'complete'
  taskTitle: string
  refinedData: Record<string, string>
}

const AIChatSection: React.FC = () => {
  const { tasks, createTaskAPI, setTasks, showToast } = useDashboard()
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'こんにちは！タスクの深掘りをお手伝いします。\n\n新しいタスクを作成したい場合は、タスク名を入力してください。既存タスクについて相談することもできます。',
      timestamp: new Date(),
      type: 'text'
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [conversationState, setConversationState] = useState<ConversationState>({
    phase: 'idle',
    taskTitle: '',
    refinedData: {}
  })
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  // オプション選択ハンドラ
  const handleOptionSelect = useCallback(async (messageId: string, option: ChatOption) => {
    // ユーザーの選択をメッセージとして追加
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: option.label,
      timestamp: new Date(),
      type: 'text'
    }
    setChatMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, options: msg.options?.map(o => ({ ...o, selected: o.id === option.id })) }
        : msg
    ))
    setChatMessages(prev => [...prev, userMsg])

    // AIに選択結果を送信
    await sendToAI(option.label, option.id)
  }, [])

  // サブタスクの選択切り替え
  const toggleSubtask = (subtaskId: string) => {
    setSelectedSubtasks(prev => {
      const next = new Set(prev)
      if (next.has(subtaskId)) {
        next.delete(subtaskId)
      } else {
        next.add(subtaskId)
      }
      return next
    })
  }

  // サブタスク確定
  const confirmSubtasks = async () => {
    const lastSummaryMsg = [...chatMessages].reverse().find(m => m.type === 'subtask_select')
    if (!lastSummaryMsg?.taskData) return

    setAiLoading(true)

    const selectedItems = lastSummaryMsg.taskData.subtasks.filter((_, i) =>
      selectedSubtasks.has(`subtask-${i}`)
    )

    // ユーザーの確認メッセージ
    const confirmMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `${selectedItems.length}個のサブタスクを選択しました`,
      timestamp: new Date(),
      type: 'text'
    }
    setChatMessages(prev => [...prev, confirmMsg])

    try {
      // タスク作成
      const newTask = await createTaskAPI({
        title: lastSummaryMsg.taskData.title,
        priority: lastSummaryMsg.taskData.priority,
        estimatedMinutes: lastSummaryMsg.taskData.estimatedMinutes,
        status: 'pending',
        organizationId: tasks[0]?.organizationId || ''
      })

      // サブタスク作成
      for (const st of selectedItems) {
        await fetch(`/api/tasks/${newTask.id}/subtasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: st.title + (st.canAutomate ? ' 🤖' : ''),
            organizationId: newTask.organizationId
          })
        })
      }

      setTasks(prev => [...prev, newTask])

      const completeMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `✅ タスク「${newTask.title}」を作成し、${selectedItems.length}個のサブタスクを追加しました！\n\nタスク一覧から確認できます。他のタスクについても相談できますよ。`,
        timestamp: new Date(),
        type: 'text'
      }
      setChatMessages(prev => [...prev, completeMsg])
      setConversationState({ phase: 'idle', taskTitle: '', refinedData: {} })
      setSelectedSubtasks(new Set())
      showToast('タスクを作成しました')
    } catch (error) {
      console.error('Failed to create task:', error)
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'タスクの作成に失敗しました。もう一度お試しください。',
        timestamp: new Date(),
        type: 'text'
      }
      setChatMessages(prev => [...prev, errorMsg])
    } finally {
      setAiLoading(false)
    }
  }

  // AI送信
  const sendToAI = async (message: string, optionId?: string) => {
    setAiLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          mode: 'task_refine',
          conversationState,
          conversationHistory: chatMessages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })),
          optionId,
          context: {
            existingTasks: tasks.slice(0, 10).map(t => ({ title: t.title, status: t.status }))
          }
        })
      })

      if (response.ok) {
        const data = await response.json()

        // レスポンスタイプに応じてメッセージを作成
        if (data.type === 'options') {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            type: 'options',
            options: data.options?.map((o: any, i: number) => ({
              id: `opt-${i}`,
              label: o.label,
              description: o.description
            }))
          }
          setChatMessages(prev => [...prev, aiMsg])
          if (data.conversationState) {
            setConversationState(prev => ({ ...prev, ...data.conversationState }))
          }
        } else if (data.type === 'subtask_select') {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            type: 'subtask_select',
            taskData: data.taskData
          }
          setChatMessages(prev => [...prev, aiMsg])
          // 全サブタスクをデフォルト選択
          const allIds = new Set<string>(data.taskData.subtasks.map((_: any, i: number) => `subtask-${i}`))
          setSelectedSubtasks(allIds)
          setConversationState(prev => ({ ...prev, phase: 'subtasks' }))
        } else {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.response || 'すみません、応答を生成できませんでした。',
            timestamp: new Date(),
            type: 'text'
          }
          setChatMessages(prev => [...prev, aiMsg])
          if (data.conversationState) {
            setConversationState(prev => ({ ...prev, ...data.conversationState }))
          }
        }
      } else {
        throw new Error('API error')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
        type: 'text'
      }
      setChatMessages(prev => [...prev, errorMsg])
    } finally {
      setAiLoading(false)
    }
  }

  // メッセージ送信
  const sendMessage = async () => {
    if (!chatInput.trim() || aiLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
      type: 'text'
    }

    setChatMessages(prev => [...prev, userMessage])
    const input = chatInput
    setChatInput('')

    await sendToAI(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      sendMessage()
    }
  }

  // クイックアクションボタン
  const quickActions = [
    { label: '新規タスク作成', icon: Plus, action: () => { setChatInput('新しいタスクを作成したい'); setTimeout(sendMessage, 100) } },
    { label: 'タスク整理', icon: CheckCircle2, action: () => { setChatInput('タスクを整理したい'); setTimeout(sendMessage, 100) } },
  ]

  return (
    <div className="bg-white rounded-xl border border-slate-200 h-[calc(100vh-180px)] flex flex-col overflow-hidden">
      {/* ヘッダー - LINE風 */}
      <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-500 to-purple-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">AI タスクアシスタント</h2>
            <p className="text-xs text-white/80">タスクの深掘り・分解をお手伝いします</p>
          </div>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#e8e6df]">
        {chatMessages.map((msg) => (
          <div key={msg.id}>
            {/* 日付区切り（最初のメッセージのみ） */}
            {msg.id === chatMessages[0]?.id && (
              <div className="flex justify-center mb-4">
                <span className="px-3 py-1 bg-black/10 rounded-full text-xs text-slate-600">
                  {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                </span>
              </div>
            )}

            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {/* AIアバター */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                {/* テキストメッセージ */}
                <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[#5b9bd5] text-white rounded-br-md'
                    : 'bg-white text-slate-800 rounded-bl-md'
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>

                {/* 選択肢（options タイプ） */}
                {msg.type === 'options' && msg.options && (
                  <div className="mt-2 space-y-1.5 w-full">
                    {msg.options.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => !option.selected && handleOptionSelect(msg.id, option)}
                        disabled={msg.options?.some(o => o.selected) || aiLoading}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border transition-all text-sm ${
                          option.selected
                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                            : msg.options?.some(o => o.selected)
                              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`w-4 h-4 flex-shrink-0 ${option.selected ? 'text-blue-500' : 'text-slate-400'}`} />
                          <div>
                            <span className="font-medium">{option.label}</span>
                            {option.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* サブタスク選択（subtask_select タイプ） */}
                {msg.type === 'subtask_select' && msg.taskData && (
                  <div className="mt-3 w-full">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      {/* タスクサマリー */}
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-100">
                        <h4 className="font-semibold text-slate-800 text-sm">{msg.taskData.title}</h4>
                        <div className="flex gap-3 mt-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            msg.taskData.priority === 'high' ? 'bg-red-100 text-red-700' :
                            msg.taskData.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {msg.taskData.priority === 'high' ? '高' : msg.taskData.priority === 'medium' ? '中' : '低'}優先度
                          </span>
                          <span className="text-xs text-slate-500">⏱ 約{msg.taskData.estimatedMinutes}分</span>
                        </div>
                      </div>

                      {/* サブタスクリスト */}
                      <div className="divide-y divide-slate-100">
                        {msg.taskData.subtasks.map((subtask, i) => {
                          const id = `subtask-${i}`
                          const isSelected = selectedSubtasks.has(id)
                          return (
                            <button
                              key={id}
                              onClick={() => toggleSubtask(id)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                              }`}>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                              </div>
                              <span className={`text-sm ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                                {subtask.title}
                              </span>
                              {subtask.canAutomate && (
                                <span className="ml-auto text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">🤖 AI</span>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* 確定ボタン */}
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                        <button
                          onClick={confirmSubtasks}
                          disabled={selectedSubtasks.size === 0 || aiLoading}
                          className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {selectedSubtasks.size > 0
                            ? `${selectedSubtasks.size}個のサブタスクでタスクを作成`
                            : 'サブタスクを選択してください'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* タイムスタンプ */}
                <div className={`flex items-center gap-1 mt-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px] text-slate-500">{formatTime(msg.timestamp)}</span>
                  {msg.role === 'user' && (
                    <span className="text-[10px] text-blue-500">既読</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* ローディング表示 */}
        {aiLoading && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* クイックアクション（idle状態のとき） */}
      {conversationState.phase === 'idle' && chatMessages.length <= 1 && (
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={action.action}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-600 hover:bg-slate-200 whitespace-nowrap flex-shrink-0"
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* 入力エリア */}
      <div className="p-3 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={conversationState.phase === 'subtasks' ? 'サブタスクを選択してタスクを作成...' : 'タスクについて相談...'}
            className="flex-1 px-4 py-2.5 bg-slate-100 border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            disabled={aiLoading}
          />
          <button
            onClick={sendMessage}
            disabled={aiLoading || !chatInput.trim()}
            className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default React.memo(AIChatSection)
