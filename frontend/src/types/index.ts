// 共通型定義
export interface Organization {
  id: string
  name: string
  initial: string
  color: string
}

export interface Project {
  id: string
  name: string
  organizationId: string
  color?: string
  description?: string
  status?: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  organizationId: string
  projectId?: string
  estimatedMinutes?: number
  actualMinutes?: number
  parentTaskId?: string
  progress?: number
  blockers?: string
  nextActions?: string
  slackLink?: string
  docLinks?: string[]
}

export interface Comment {
  id: string
  content: string
  createdAt: string
  author: string
}

export interface Goal {
  id: string
  title: string
  progress: number
  targetValue: number
  currentValue: number
  unit: string
  quarter: string
}

export interface TimeEntry {
  id: string
  taskId: string
  taskTitle: string
  startTime: string
  endTime?: string
  duration: number
}

export interface Notification {
  id: string
  type: string
  message: string
  createdAt: string
  read: boolean
  taskId?: string
}

export interface Meeting {
  id: string
  title: string
  startTime: string
  endTime: string
  organizationId: string
}
