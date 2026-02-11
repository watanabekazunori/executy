'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface Organization {
  id: string
  name: string
}

interface NewProjectModalProps {
  open: boolean
  onClose: () => void
  organizations: Organization[]
  onProjectCreated?: (projectId: string) => void
}

export default function NewProjectModal({
  open,
  onClose,
  organizations,
  onProjectCreated,
}: NewProjectModalProps) {
  const { showToast } = useDashboard()

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newProjectOrgId, setNewProjectOrgId] = useState(organizations[0]?.id || '')

  const handleClose = () => {
    setNewProjectName('')
    setNewProjectDesc('')
    setNewProjectOrgId(organizations[0]?.id || '')
    onClose()
  }

  const handleCreate = async () => {
    if (!newProjectName.trim()) {
      showToast('プロジェクト名は必須です', 'error')
      return
    }

    try {
      const colors = [
        'bg-blue-400',
        'bg-green-400',
        'bg-purple-400',
        'bg-orange-400',
        'bg-pink-400',
      ]
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          organizationId: newProjectOrgId,
          color: colors[Math.floor(Math.random() * colors.length)],
          description: newProjectDesc,
          status: 'active',
        }),
      })

      if (res.ok) {
        const newProject = await res.json()
        showToast('プロジェクトを作成しました')

        if (onProjectCreated) {
          onProjectCreated(newProject.id)
        }

        handleClose()
      } else {
        showToast('プロジェクト作成に失敗しました', 'error')
      }
    } catch (e) {
      console.error(e)
      showToast('プロジェクト作成に失敗しました', 'error')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">新規プロジェクト</h2>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">プロジェクト名</label>
            <input
              type="text"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="プロジェクト名..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">説明</label>
            <textarea
              value={newProjectDesc}
              onChange={e => setNewProjectDesc(e.target.value)}
              placeholder="説明..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">組織</label>
            <select
              value={newProjectOrgId}
              onChange={e => setNewProjectOrgId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            >
              {organizations.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreate}
            disabled={!newProjectName.trim()}
            className={`w-full py-2 rounded-lg ${
              !newProjectName.trim()
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            作成
          </button>
        </div>
      </div>
    </div>
  )
}
