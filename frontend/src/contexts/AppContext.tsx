'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  organizationsAPI,
  projectsAPI,
  tasksAPI,
  meetingsAPI,
  Organization,
  Project,
  Task,
  Meeting,
} from '@/lib/api';

interface AppState {
  // データ
  organizations: Organization[];
  projects: Project[];
  tasks: Task[];
  meetings: Meeting[];

  // 選択状態
  selectedOrgId: string | null;
  selectedTask: Task | null;

  // UI状態
  isLoading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  taskDetailOpen: boolean;
}

interface AppContextType extends AppState {
  // アクション
  setSelectedOrgId: (id: string | null) => void;
  setSelectedTask: (task: Task | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setTaskDetailOpen: (open: boolean) => void;

  // データ操作
  refreshData: () => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;

  // フィルター済みデータ
  filteredProjects: Project[];
  filteredTasks: Task[];
  filteredMeetings: Meeting[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // データ状態
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // 選択状態
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // UI状態
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  // データ取得
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [orgsData, projectsData, tasksData, meetingsData] = await Promise.all([
        organizationsAPI.getAll(),
        projectsAPI.getAll(),
        tasksAPI.getAll({ parentOnly: true }),
        meetingsAPI.getAll(),
      ]);

      setOrganizations(orgsData);
      setProjects(projectsData);
      setTasks(tasksData);
      setMeetings(meetingsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初回データ取得
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // タスク作成
  const createTask = useCallback(async (data: Partial<Task>) => {
    const newTask = await tasksAPI.create(data);
    setTasks(prev => [...prev, newTask]);
    return newTask;
  }, []);

  // タスク更新
  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const updated = await tasksAPI.update(id, data);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    if (selectedTask?.id === id) {
      setSelectedTask(updated);
    }
    return updated;
  }, [selectedTask]);

  // タスク削除
  const deleteTask = useCallback(async (id: string) => {
    await tasksAPI.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTask?.id === id) {
      setSelectedTask(null);
      setTaskDetailOpen(false);
    }
  }, [selectedTask]);

  // フィルター済みデータ
  const filteredProjects = selectedOrgId
    ? projects.filter(p => p.organizationId === selectedOrgId)
    : projects;

  const filteredTasks = selectedOrgId
    ? tasks.filter(t => t.organizationId === selectedOrgId)
    : tasks;

  const filteredMeetings = selectedOrgId
    ? meetings.filter(m => m.organizationId === selectedOrgId)
    : meetings;

  // タスク選択時にパネルを開く
  const handleSetSelectedTask = useCallback((task: Task | null) => {
    setSelectedTask(task);
    setTaskDetailOpen(!!task);
  }, []);

  const value: AppContextType = {
    organizations,
    projects,
    tasks,
    meetings,
    selectedOrgId,
    selectedTask,
    isLoading,
    error,
    sidebarOpen,
    taskDetailOpen,
    setSelectedOrgId,
    setSelectedTask: handleSetSelectedTask,
    setSidebarOpen,
    setTaskDetailOpen,
    refreshData,
    createTask,
    updateTask,
    deleteTask,
    filteredProjects,
    filteredTasks,
    filteredMeetings,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
