// API Client for Aide
// 型定義のエクスポート（コンポーネントから参照される場合用）

const API_BASE = '/api';

// 汎用フェッチ関数
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }

  return res.json();
}

// 型定義
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  timezone: string;
}

export interface Organization {
  id: string;
  name: string;
  initial: string;
  color: string;
  ownerId?: string;
  projects?: Project[];
  taskCount?: number;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  color?: string;
  status: string;
  organization?: Organization;
}

export interface Task {
  id: string;
  organizationId: string;
  projectId?: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdBy?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  subtasks?: Task[];
  project?: Project;
  organization?: Organization;
  meetings?: Meeting[];
  sharedLinks?: SharedLink[];
}

export interface Meeting {
  id: string;
  organizationId: string;
  taskId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingUrl?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface SharedLink {
  id: string;
  taskId?: string;
  title: string;
  url: string;
  linkType?: string;
  fileType?: string;
  permission: 'view' | 'edit';
}

// API関数
export const organizationsAPI = {
  getAll: () => fetchAPI<Organization[]>('/organizations'),
  getById: (id: string) => fetchAPI<Organization>(`/organizations/${id}`),
  create: (data: Partial<Organization>) =>
    fetchAPI<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Organization>) =>
    fetchAPI<Organization>(`/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI(`/organizations/${id}`, { method: 'DELETE' }),
};

export const projectsAPI = {
  getAll: (organizationId?: string) => {
    const query = organizationId ? `?organizationId=${organizationId}` : '';
    return fetchAPI<Project[]>(`/projects${query}`);
  },
  getById: (id: string) => fetchAPI<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) =>
    fetchAPI<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Project>) =>
    fetchAPI<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI(`/projects/${id}`, { method: 'DELETE' }),
};

export const tasksAPI = {
  getAll: (params?: { organizationId?: string; projectId?: string; parentOnly?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.organizationId) searchParams.set('organizationId', params.organizationId);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.parentOnly) searchParams.set('parentOnly', 'true');
    const query = searchParams.toString() ? `?${searchParams}` : '';
    return fetchAPI<Task[]>(`/tasks${query}`);
  },
  getById: (id: string) => fetchAPI<Task>(`/tasks/${id}`),
  create: (data: Partial<Task>) =>
    fetchAPI<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Task>) =>
    fetchAPI<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI(`/tasks/${id}`, { method: 'DELETE' }),
  getSubtasks: (id: string) => fetchAPI<Task[]>(`/tasks/${id}/subtasks`),
  addSharedLink: (taskId: string, data: Partial<SharedLink>) =>
    fetchAPI<SharedLink>(`/tasks/${taskId}/shared-links`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const meetingsAPI = {
  getAll: (params?: { organizationId?: string; taskId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.organizationId) searchParams.set('organizationId', params.organizationId);
    if (params?.taskId) searchParams.set('taskId', params.taskId);
    const query = searchParams.toString() ? `?${searchParams}` : '';
    return fetchAPI<Meeting[]>(`/meetings${query}`);
  },
  getById: (id: string) => fetchAPI<Meeting>(`/meetings/${id}`),
  create: (data: Partial<Meeting>) =>
    fetchAPI<Meeting>('/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Meeting>) =>
    fetchAPI<Meeting>(`/meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI(`/meetings/${id}`, { method: 'DELETE' }),
};
