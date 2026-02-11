'use client'

import { useState } from 'react'
import { X, Sparkles, Loader2, AlertTriangle } from 'lucide-react'

interface ScheduleItem {
  taskId: string
  taskTitle: string
  date: string
  startTime: string
  endTime: string
  reason: string
}

interface AISchedule {
  schedule: ScheduleItem[]
  warnings?: string[]
  suggestions?: string[]
}

interface ScheduleModalProps {
  open: boolean
  onClose: () => void
  loading: boolean
  schedule: AISchedule | null
  onApplySchedule?: (item: ScheduleItem) => void
  onApplyAll?: () => void
}

export default function ScheduleModal({
  open,
  onClose,
  loading,
  schedule,
  onApplySchedule,
  onApplyAll,
}: ScheduleModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold text-slate-800">AIスケジューリング</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-500 mb-4" />
              <p className="text-slate-600">カレンダーとタスクを分析中...</p>
              <p className="text-sm text-slate-500 mt-2">最適なスケジュールを作成しています</p>
            </div>
          ) : schedule ? (
            <div className="space-y-6">
              {/* Warnings */}
              {schedule.warnings && schedule.warnings.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <p className="font-medium text-yellow-800">注意点</p>
                  </div>
                  <ul className="space-y-1">
                    {schedule.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-yellow-700">
                        ・{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Schedule proposals */}
              <div>
                <h3 className="font-medium text-slate-700 mb-4">推奨スケジュール</h3>
                <div className="space-y-3">
                  {schedule.schedule.map((item, i) => (
                    <div
                      key={i}
                      className="p-4 border border-slate-200 rounded-xl hover:border-purple-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              {item.date}
                            </span>
                            <span className="text-sm text-slate-500">
                              {item.startTime} 〜 {item.endTime}
                            </span>
                          </div>
                          <p className="font-medium text-slate-800">{item.taskTitle}</p>
                          <p className="text-sm text-slate-500 mt-1">{item.reason}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (onApplySchedule) {
                              onApplySchedule(item)
                            }
                          }}
                          className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 flex-shrink-0 ml-4"
                        >
                          適用
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              {schedule.suggestions && schedule.suggestions.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="font-medium text-blue-800 mb-2">💡 改善提案</p>
                  <ul className="space-y-1">
                    {schedule.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-blue-700">
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
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    if (onApplyAll) {
                      onApplyAll()
                    }
                    onClose()
                  }}
                  className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  全て適用
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
