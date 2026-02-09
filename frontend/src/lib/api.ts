// API Client for Aide

// Vercel統合構成: フロントエンドと同じドメインのAPI Routesを使用
const API_BASE = '/api';

// モックデータを使用するかどうか（バックエンド未起動時はtrue）
const USE_MOCK = false;

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

// ==================== モックデータ（空） ====================

const mockOrganizations: Organization[] = [];

const mockProjects: Project[] = [];

const mockTasks: Task[] = [];

const mockMeetings: Meeting[] = [];

// ==================== API関数（モック対応） ====================

// 組織
export const organizationsAPI = {
  getAll: async (): Promise<Organization[]> => {
    if (USE_MOCK) {
      await delay(300);
      return mockOrganizations;
    }
    return fetchAPI<Organization[]>('/organizations');
  },
  getById: async (id: string): Promise<Organization> => {
    if (USE_MOCK) {
      await delay(200);
      const org = mockOrganizations.find(o => o.id === id);
      if (!org) throw new Error('Organization not found');
      return org;
    }
    return fetchAPI<Organization>(`/organizations/${id}`);
  },
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

// プロジェクト
export const projectsAPI = {
  getAll: async (organizationId?: string): Promise<Project[]> => {
    if (USE_MOCK) {
      await delay(200);
      if (organizationId) {
        return mockProjects.filter(p => p.organizationId === organizationId);
      }
      return mockProjects;
    }
    const query = organizationId ? `?organizationId=${organizationId}` : '';
    return fetchAPI<Project[]>(`/projects${query}`);
  },
  getById: async (id: string): Promise<Project> => {
    if (USE_MOCK) {
      await delay(200);
      const project = mockProjects.find(p => p.id === id);
      if (!project) throw new Error('Project not found');
      return project;
    }
    return fetchAPI<Project>(`/projects/${id}`);
  },
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

// タスク
export const tasksAPI = {
  getAll: async (params?: { organizationId?: string; projectId?: string; parentOnly?: boolean }): Promise<Task[]> => {
    if (USE_MOCK) {
      await delay(400);
      let result = mockTasks.filter(t => !t.parentTaskId);
      if (params?.organizationId) {
        result = result.filter(t => t.organizationId === params.organizationId);
      }
      if (params?.projectId) {
        result = result.filter(t => t.projectId === params.projectId);
      }
      return result;
    }
    const searchParams = new URLSearchParams();
    if (params?.organizationId) searchParams.set('organizationId', params.organizationId);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.parentOnly) searchParams.set('parentOnly', 'true');
    const query = searchParams.toString() ? `?${searchParams}` : '';
    return fetchAPI<Task[]>(`/tasks${query}`);
  },
  getById: async (id: string): Promise<Task> => {
    if (USE_MOCK) {
      await delay(300);
      const task = mockTasks.find(t => t.id === id);
      if (!task) throw new Error('Task not found');
      return task;
    }
    return fetchAPI<Task>(`/tasks/${id}`);
  },
  create: (data: Partial<Task>) =>
    fetchAPI<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: async (id: string, data: Partial<Task>): Promise<Task> => {
    if (USE_MOCK) {
      await delay(300);
      const idx = mockTasks.findIndex(t => t.id === id);
      if (idx === -1) throw new Error('Task not found');
      mockTasks[idx] = { ...mockTasks[idx], ...data, updatedAt: new Date().toISOString() };
      return mockTasks[idx];
    }
    return fetchAPI<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  delete: (id: string) =>
    fetchAPI(`/tasks/${id}`, { method: 'DELETE' }),
  getSubtasks: async (id: string): Promise<Task[]> => {
    if (USE_MOCK) {
      await delay(200);
      const task = mockTasks.find(t => t.id === id);
      return task?.subtasks || [];
    }
    return fetchAPI<Task[]>(`/tasks/${id}/subtasks`);
  },
  addSharedLink: (taskId: string, data: Partial<SharedLink>) =>
    fetchAPI<SharedLink>(`/tasks/${taskId}/shared-links`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// 打ち合わせ
export const meetingsAPI = {
  getAll: async (params?: { organizationId?: string; taskId?: string }): Promise<Meeting[]> => {
    if (USE_MOCK) {
      await delay(200);
      let result = mockMeetings;
      if (params?.organizationId) {
        result = result.filter(m => m.organizationId === params.organizationId);
      }
      if (params?.taskId) {
        result = result.filter(m => m.taskId === params.taskId);
      }
      return result;
    }
    const searchParams = new URLSearchParams();
    if (params?.organizationId) searchParams.set('organizationId', params.organizationId);
    if (params?.taskId) searchParams.set('taskId', params.taskId);
    const query = searchParams.toString() ? `?${searchParams}` : '';
    return fetchAPI<Meeting[]>(`/meetings${query}`);
  },
  getById: async (id: string): Promise<Meeting> => {
    if (USE_MOCK) {
      await delay(200);
      const meeting = mockMeetings.find(m => m.id === id);
      if (!meeting) throw new Error('Meeting not found');
      return meeting;
    }
    return fetchAPI<Meeting>(`/meetings/${id}`);
  },
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

// ユーティリティ
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}