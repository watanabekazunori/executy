'use client';

import { useState, useEffect, useCallback } from 'react';
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

// 組織データ取得
export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await organizationsAPI.getAll();
      setOrganizations(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { organizations, loading, error, refetch: fetchData };
}

// プロジェクトデータ取得
export function useProjects(organizationId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectsAPI.getAll(organizationId);
      setProjects(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { projects, loading, error, refetch: fetchData };
}

// タスクデータ取得
export function useTasks(organizationId?: string, parentOnly = true) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tasksAPI.getAll({ organizationId, parentOnly });
      setTasks(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, parentOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { tasks, loading, error, refetch: fetchData };
}

// タスク詳細取得
export function useTask(taskId: string) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const data = await tasksAPI.getById(taskId);
      setTask(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { task, loading, error, refetch: fetchData };
}

// 打ち合わせ取得
export function useMeetings(organizationId?: string, taskId?: string) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await meetingsAPI.getAll({ organizationId, taskId });
      setMeetings(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, taskId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { meetings, loading, error, refetch: fetchData };
}

// 選択中の組織を管理
export function useSelectedOrganization() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const selectOrganization = (orgId: string | null) => {
    setSelectedOrgId(orgId);
  };

  return { selectedOrgId, selectOrganization };
}
