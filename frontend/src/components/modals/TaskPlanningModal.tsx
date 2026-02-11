'use client'

import React, { useState, useEffect } from 'react'
import { X, Loader2, ChevronDown, ChevronRight, Flag, Clock, Sparkles, AlertTriangle, Lightbulb, CheckCircle2, Calendar, Target } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface PlanTask {
  title: string
  estimatedMinutes: number
  canAutomate: boolean
  priority: 'high' | 'medium' | 'low'
}

interface Milestone {
  name: string
  day: number
  description: string
}

interface Phase {
  name: string
  description: string
  startDay: number
  endDay: number
  milestones: Milestone[]
  tasks: PlanTask[]
}

interface TaskPlan {
  phases: Phase[]
  totalDays: number
  totalMinutes: number
  risks: string[]
  suggestions: string[]
}

interface TaskPlanningModalProps {
  open: boolean
  onClose: () => void
  task: {
    id: string
    title: string
    description?: string
    estimatedMinutes?: number
    organizationId: string
    projectId?: string
  } | null
}

const priorityConfig = {
  high: { label: '高', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  low: { label: '低', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
}

export default function TaskPlanningModal({ open, onClose, task }: TaskPlanningModalProps) {
  const { createTaskAPI, setTasks, showToast } = useDashboard()
  const [plan, setPlan] = useState<TaskPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0]))
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open && task) {
      generatePlan()
    }
    if (!open) {
      setPlan(null)
      setExpandedPhases(new Set([0]))
      setSelectedTasks(new Set())
    }
  }, [open, task])

  const generatePlan = async () => {
    if (!task) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai/plan-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description,
          estimatedMinutes: task.estimatedMinutes
        })
      })
      if (res.ok) {
        const data = await res.json()
        setPlan(data)
        // 全タスクをデフォルト選択
        const allIds = new Set<string>()
        data.phases.forEach((phase: Phase, pi: number) => {
          phase.tasks.forEach((_: PlanTask, ti: number) => {
            allIds.add(`${pi}-${ti}`)
          })
        })
        setSelectedTasks(allIds)
      }
    } catch (e) {
      console.error('Failed to generate plan:', e)
      showToast('計画の生成に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  const togglePhase = (index: number) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const toggleTask = (id: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 計画をサブタスクとして適用
  const applyPlan = async () => {
    if (!task || !plan) return
    setApplying(true)

    try {
      let created = 0
      for (let pi = 0; pi < plan.phases.length; pi++) {
        const phase = plan.phases[pi]
        for (let ti = 0; ti < phase.tasks.length; ti++) {
          const id = `${pi}-${ti}`
          if (!selectedTasks.has(id)) continue

          const planTask = phase.tasks[ti]
          await fetch(`/api/tasks/${task.id}/subtasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `[${phase.name}] ${planTask.title}${planTask.canAutomate ? ' 🤖' : ''}`,
              organizationId: task.organizationId,
              projectId: task.projectId,
              estimatedMinutes: planTask.estimatedMinutes,
              priority: planTask.priority
            })
          })
          created++
        }
      }

      showToast(`${created}個のサブタスクを作成しました`)
      onClose()
    } catch (e) {
      console.error('Failed to apply plan:', e)
      showToast('サブタスクの作成に失敗しました', 'error')
    } finally {
      setApplying(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              タスク計画表
            </h3>
            {task && <p className="text-sm text-slate-500 mt-0.5">{task.title}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
              <p className="text-sm text-slate-600">AIが計画を作成中...</p>
            </div>
          ) : plan ? (
            <div className="p-6 space-y-4">
              {/* サマリー */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <Calendar className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-purple-700">{plan.totalDays}日</p>
                  <p className="text-xs text-purple-500">推定期間</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-blue-700">{Math.round(plan.totalMinutes / 60)}h</p>
                  <p className="text-xs text-blue-500">推定工数</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <Flag className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-green-700">{plan.phases.reduce((s, p) => s + p.milestones.length, 0)}</p>
                  <p className="text-xs text-green-500">マイルストーン</p>
                </div>
              </div>

              {/* ビュー切り替え */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                >
                  リスト
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'timeline' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                >
                  タイムライン
                </button>
              </div>

              {/* リストビュー */}
              {viewMode === 'list' && (
                <div className="space-y-3">
                  {plan.phases.map((phase, pi) => (
                    <div key={pi} className="border border-slate-200 rounded-xl overflow-hidden">
                      {/* フェーズヘッダー */}
                      <button
                        onClick={() => togglePhase(pi)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                      >
                        {expandedPhases.has(pi)
                          ? <ChevronDown className="w-4 h-4 text-slate-500" />
                          : <ChevronRight className="w-4 h-4 text-slate-500" />
                        }
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-800">{phase.name}</h4>
                          <p className="text-xs text-slate-500">{phase.description} · Day {phase.startDay}-{phase.endDay}</p>
                        </div>
                        <span className="text-xs text-slate-400">{phase.tasks.length}タスク</span>
                      </button>

                      {expandedPhases.has(pi) && (
                        <div>
                          {/* マイルストーン */}
                          {phase.milestones.map((ms, mi) => (
                            <div key={mi} className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-t border-amber-100">
                              <Flag className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-amber-800">{ms.name}</span>
                                <span className="text-xs text-amber-600 ml-2">Day {ms.day}</span>
                              </div>
                              <span className="text-xs text-amber-500">{ms.description}</span>
                            </div>
                          ))}

                          {/* タスクリスト */}
                          <div className="divide-y divide-slate-100">
                            {phase.tasks.map((t, ti) => {
                              const id = `${pi}-${ti}`
                              const isSelected = selectedTasks.has(id)
                              const pc = priorityConfig[t.priority]
                              return (
                                <button
                                  key={ti}
                                  onClick={() => toggleTask(id)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                                >
                                  <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                                  }`}>
                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                  </div>
                                  <div className={`w-2 h-2 rounded-full ${pc.dot} flex-shrink-0`} />
                                  <span className={`text-sm flex-1 ${isSelected ? 'text-slate-800' : 'text-slate-500 line-through'}`}>
                                    {t.title}
                                  </span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {t.canAutomate && (
                                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">AI</span>
                                    )}
                                    <span className="text-xs text-slate-400">{t.estimatedMinutes}分</span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* タイムラインビュー */}
              {viewMode === 'timeline' && (
                <div className="relative">
                  {/* タイムラインバー */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

                  <div className="space-y-6">
                    {plan.phases.map((phase, pi) => (
                      <div key={pi} className="relative">
                        {/* フェーズノード */}
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm z-10 flex-shrink-0">
                            P{pi + 1}
                          </div>
                          <div className="flex-1 pt-1">
                            <h4 className="font-semibold text-slate-800">{phase.name}</h4>
                            <p className="text-xs text-slate-500 mb-2">{phase.description} · Day {phase.startDay}-{phase.endDay}</p>

                            {/* 進捗バー */}
                            <div className="flex gap-1 mb-3">
                              {Array.from({ length: phase.endDay - phase.startDay + 1 }, (_, i) => {
                                const day = phase.startDay + i
                                const hasMilestone = phase.milestones.some(m => m.day === day)
                                return (
                                  <div key={i} className="flex-1 flex flex-col items-center">
                                    <div className={`w-full h-2 rounded-full ${
                                      hasMilestone ? 'bg-amber-400' : 'bg-blue-200'
                                    }`} />
                                    <span className="text-[9px] text-slate-400 mt-0.5">D{day}</span>
                                  </div>
                                )
                              })}
                            </div>

                            {/* マイルストーン */}
                            {phase.milestones.map((ms, mi) => (
                              <div key={mi} className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                                <Flag className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-medium text-amber-800">{ms.name} (Day {ms.day})</span>
                              </div>
                            ))}

                            {/* タスクチップ */}
                            <div className="flex flex-wrap gap-1.5">
                              {phase.tasks.map((t, ti) => {
                                const pc = priorityConfig[t.priority]
                                return (
                                  <span key={ti} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${pc.color}`}>
                                    {t.canAutomate && <Sparkles className="w-3 h-3" />}
                                    {t.title}
                                    <span className="opacity-60">({t.estimatedMinutes}分)</span>
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* リスクと提案 */}
              {(plan.risks.length > 0 || plan.suggestions.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {plan.risks.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-4">
                      <h5 className="flex items-center gap-1.5 text-sm font-medium text-red-800 mb-2">
                        <AlertTriangle className="w-4 h-4" /> リスク
                      </h5>
                      <ul className="space-y-1">
                        {plan.risks.map((r, i) => (
                          <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                            <span className="text-red-400 mt-0.5">•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {plan.suggestions.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h5 className="flex items-center gap-1.5 text-sm font-medium text-blue-800 mb-2">
                        <Lightbulb className="w-4 h-4" /> 改善提案
                      </h5>
                      <ul className="space-y-1">
                        {plan.suggestions.map((s, i) => (
                          <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                            <span className="text-blue-400 mt-0.5">•</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Target className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">計画を生成するタスクを選択してください</p>
            </div>
          )}
        </div>

        {/* フッター */}
        {plan && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {selectedTasks.size}個のサブタスクを選択中
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
                キャンセル
              </button>
              <button onClick={generatePlan} disabled={loading} className="px-4 py-2 border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-50">
                再生成
              </button>
              <button
                onClick={applyPlan}
                disabled={selectedTasks.size === 0 || applying}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 flex items-center gap-2"
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {applying ? '適用中...' : 'サブタスクとして追加'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
