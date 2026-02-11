'use client'

import { useState } from 'react'
import { X, Plus, Sparkles, Loader2, AlertTriangle } from 'lucide-react'

interface Subtask {
  title: string
  canAutomate?: boolean
}

interface AIAnalysisResult {
  estimatedMinutes: number
  subtasks: Subtask[]
  suggestions: string[]
}

interface AIAnalysisModalProps {
  open: boolean
  onClose: () => void
  analyzing: boolean
  result: AIAnalysisResult | null
  analyzingTask: any
  onAddSubtasks?: (subtasks: Subtask[]) => void
  onOpenAIAssistant?: () => void
}

export default function AIAnalysisModal({
  open,
  onClose,
  analyzing,
  result,
  analyzingTask,
  onAddSubtasks,
  onOpenAIAssistant,
}: AIAnalysisModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold text-slate-800">AI分析結果</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {analyzing ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500 mb-3" />
              <p className="text-slate-600">タスクを分析中...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Estimated time */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-600 mb-1">予測所要時間</p>
                <p className="text-2xl font-bold text-blue-800">{result.estimatedMinutes}分</p>
              </div>

              {/* Suggested subtasks */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">提案サブタスク</p>
                <div className="space-y-2">
                  {result.subtasks.map((st, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-700">{st.title}</span>
                      {st.canAutomate && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-xs rounded">
                          AI実行可能
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-xl">
                  <p className="text-sm font-medium text-yellow-800 mb-2">💡 アドバイス</p>
                  <ul className="space-y-1">
                    {result.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-yellow-700">
                        ・{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  スキップ
                </button>
                <button
                  onClick={() => {
                    if (onAddSubtasks) {
                      onAddSubtasks(result.subtasks)
                    }
                    onClose()
                  }}
                  className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> サブタスクを追加
                </button>
              </div>

              {/* AI automation section */}
              {result.subtasks.some(st => st.canAutomate) && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <p className="font-medium text-purple-800">AIに任せる</p>
                  </div>
                  <p className="text-sm text-purple-700 mb-3">
                    「AI実行可能」マークのタスクはAIが代わりに実行できます。
                  </p>
                  <button
                    onClick={() => {
                      if (onAddSubtasks) {
                        onAddSubtasks(result.subtasks)
                      }
                      if (onOpenAIAssistant) {
                        onOpenAIAssistant()
                      }
                      onClose()
                    }}
                    className="w-full py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600"
                  >
                    AIアシスタントで開始
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
