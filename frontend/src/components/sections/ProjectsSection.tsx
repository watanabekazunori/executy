'use client'

import React from 'react'
import { Plus, FolderKanban } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

interface Project {
  id: string
  name: string
  organizationId: string
  color?: string
  description?: string
  status?: string
}

type ProjectsSectionProps = {
  onNewProject?: () => void
  onSelectProject?: (project: Project) => void
}

const ProjectsSection: React.FC<ProjectsSectionProps> = ({ onNewProject, onSelectProject }) => {
  const { projects, tasks, selectedOrgId, getOrgById } = useDashboard()

  const filteredProjects = React.useMemo(() => {
    return projects.filter(p => !selectedOrgId || p.organizationId === selectedOrgId)
  }, [projects, selectedOrgId])

  const handleSelectProject = (project: Project) => {
    if (onSelectProject) {
      onSelectProject(project)
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={onNewProject}
          className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          <Plus className="w-4 h-4" /> 新規プロジェクト
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {filteredProjects.map(proj => (
          <div
            key={proj.id}
            className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow min-w-0"
            onClick={() => handleSelectProject(proj)}>
            <div className="flex items-center gap-3 mb-3 min-w-0">
              <div className={`w-10 h-10 rounded-lg ${proj.color || 'bg-blue-500'} flex items-center justify-center flex-shrink-0`}>
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800 truncate">{proj.name}</h3>
                <p className="text-xs text-slate-500 truncate">{getOrgById(proj.organizationId)?.name}</p>
              </div>
            </div>
            {proj.description && <p className="text-sm text-slate-600 line-clamp-2">{proj.description}</p>}
            <div className="mt-3 text-xs text-slate-500">{tasks.filter(t => t.projectId === proj.id).length} タスク</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default React.memo(ProjectsSection)
