'use client'

import { useState, useEffect } from 'react'
import { Target, ChevronRight, TrendingUp, Plus } from 'lucide-react'

// 空の状態（データがない時の表示）
export default function QuarterlyGoals() {
  const [goals, setGoals] = useState<any[]>([])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-50">
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Q1 2026 目標</h3>
            <p className="text-xs text-slate-500">2026年1月〜3月</p>
          </div>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
          すべて見る
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <Target className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 mb-4">目標が設定されていません</p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            目標を追加
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-slate-500 truncate">{goal.orgName}</span>
                  </div>
                  <h4 className="font-medium text-slate-800 truncate">{goal.title}</h4>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{goal.progress}%</p>
                </div>
              </div>

              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                <span>期限: {goal.dueDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
