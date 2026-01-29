'use client';

import { useState, useEffect } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Flag,
  Folder,
  Building2,
  CheckCircle2,
  Circle,
  Plus,
  ExternalLink,
  FileText,
  Video,
  MoreHorizontal,
  Edit3,
  Trash2,
  Link2,
  MessageSquare,
} from 'lucide-react';
import { Task, Meeting, SharedLink, tasksAPI } from '@/lib/api';

interface TaskDetailProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (task: Task) => void;
}

// 優先度設定
const priorities = {
  urgent: { label: '緊急', color: 'text-red-600 bg-red-100 border-red-200' },
  high: { label: '高', color: 'text-orange-600 bg-orange-100 border-orange-200' },
  medium: { label: '中', color: 'text-yellow-600 bg-yellow-100 border-yellow-200' },
  low: { label: '低', color: 'text-slate-500 bg-slate-100 border-slate-200' },
};

// ステータス設定
const statuses = {
  pending: { label: '未着手', color: 'text-slate-500' },
  in_progress: { label: '進行中', color: 'text-blue-600' },
  completed: { label: '完了', color: 'text-green-600' },
  cancelled: { label: 'キャンセル', color: 'text-red-600' },
};

// 組織カラー
const orgColors: Record<string, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
};

export default function TaskDetail({ task, isOpen, onClose, onUpdate }: TaskDetailProps) {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    subtasks: true,
    meetings: true,
    links: true,
    notes: false,
  });
  const [loading, setLoading] = useState(false);

  // サブタスク取得
  useEffect(() => {
    if (task && isOpen) {
      loadSubtasks();
    }
  }, [task?.id, isOpen]);

  const loadSubtasks = async () => {
    if (!task) return;
    try {
      setLoading(true);
      const data = await tasksAPI.getSubtasks(task.id);
      setSubtasks(data);
    } catch (err) {
      console.error('Failed to load subtasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleSubtaskStatus = async (subtask: Task) => {
    const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';
    try {
      await tasksAPI.update(subtask.id, { status: newStatus });
      setSubtasks(prev =>
        prev.map(st =>
          st.id === subtask.id ? { ...st, status: newStatus } : st
        )
      );
    } catch (err) {
      console.error('Failed to update subtask:', err);
    }
  };

  if (!isOpen || !task) return null;

  const priority = priorities[task.priority];
  const status = statuses[task.status];
  const completedSubtasks = subtasks.filter(st => st.status === 'completed').length;
  const progress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* スライドパネル */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-xl bg-white border-l border-slate-200 z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              {task.organization && (
                <div className={`w-3 h-3 rounded-full ${orgColors[task.organization.color] || 'bg-slate-400'}`} />
              )}
              <span className="text-sm text-slate-500">{task.organization?.name || '組織'}</span>
              {task.project && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500">{task.project.name}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Edit3 className="w-4 h-4 text-slate-500" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <MoreHorizontal className="w-4 h-4 text-slate-500" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {/* タイトル */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">{task.title}</h2>
              {task.description && (
                <p className="text-slate-600 text-sm">{task.description}</p>
              )}
            </div>

            {/* メタ情報 */}
            <div className="grid grid-cols-2 gap-4">
              {/* ステータス */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className={`w-2 h-2 rounded-full ${status.color.replace('text-', 'bg-')}`} />
                <div>
                  <p className="text-xs text-slate-500">ステータス</p>
                  <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
                </div>
              </div>

              {/* 優先度 */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Flag className={`w-4 h-4 ${priority.color.split(' ')[0]}`} />
                <div>
                  <p className="text-xs text-slate-500">優先度</p>
                  <p className={`text-sm font-medium ${priority.color.split(' ')[0]}`}>{priority.label}</p>
                </div>
              </div>

              {/* 期限 */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Calendar className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">期限</p>
                  <p className="text-sm font-medium text-slate-700">{formatDate(task.dueDate)}</p>
                </div>
              </div>

              {/* 見積時間 */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Clock className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">見積時間</p>
                  <p className="text-sm font-medium text-slate-700">
                    {task.estimatedMinutes ? `${Math.floor(task.estimatedMinutes / 60)}時間${task.estimatedMinutes % 60}分` : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* 進捗 */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">進捗</span>
                <span className="text-sm font-medium text-slate-900">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                サブタスク: {completedSubtasks} / {subtasks.length} 完了
              </p>
            </div>

            {/* サブタスク */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('subtasks')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-slate-500" />
                  <span className="font-medium text-slate-900">サブタスク</span>
                  <span className="text-sm text-slate-500">({subtasks.length})</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.subtasks ? 'rotate-180' : ''}`} />
              </button>

              {expandedSections.subtasks && (
                <div className="p-4 pt-0 space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
                    </div>
                  ) : subtasks.length > 0 ? (
                    subtasks.map(subtask => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <button
                          onClick={() => toggleSubtaskStatus(subtask)}
                          className={`transition-colors ${
                            subtask.status === 'completed' ? 'text-green-500' : 'text-slate-400 hover:text-primary-500'
                          }`}
                        >
                          {subtask.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <span className={`flex-1 text-sm ${subtask.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {subtask.title}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-2">サブタスクはありません</p>
                  )}

                  <button className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:text-primary-600 hover:border-primary-400 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>サブタスクを追加</span>
                  </button>
                </div>
              )}
            </div>

            {/* 打ち合わせ */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('meetings')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-slate-500" />
                  <span className="font-medium text-slate-900">関連する打ち合わせ</span>
                  <span className="text-sm text-slate-500">({task.meetings?.length || 0})</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.meetings ? 'rotate-180' : ''}`} />
              </button>

              {expandedSections.meetings && (
                <div className="p-4 pt-0 space-y-2">
                  {task.meetings && task.meetings.length > 0 ? (
                    task.meetings.map(meeting => (
                      <div
                        key={meeting.id}
                        className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-slate-900">{meeting.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            meeting.status === 'completed' ? 'bg-green-100 text-green-600' :
                            meeting.status === 'scheduled' ? 'bg-blue-100 text-blue-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {meeting.status === 'completed' ? '完了' :
                             meeting.status === 'scheduled' ? '予定' : meeting.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(meeting.startTime)}
                          </span>
                          {meeting.location && (
                            <span>{meeting.location}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-2">打ち合わせはありません</p>
                  )}

                  <button className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:text-primary-600 hover:border-primary-400 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>打ち合わせを追加</span>
                  </button>
                </div>
              )}
            </div>

            {/* Google Drive共有リンク */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('links')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-slate-500" />
                  <span className="font-medium text-slate-900">共有リンク</span>
                  <span className="text-sm text-slate-500">({task.sharedLinks?.length || 0})</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.links ? 'rotate-180' : ''}`} />
              </button>

              {expandedSections.links && (
                <div className="p-4 pt-0 space-y-2">
                  {task.sharedLinks && task.sharedLinks.length > 0 ? (
                    task.sharedLinks.map(link => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
                      >
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          {link.fileType === 'folder' ? (
                            <Folder className="w-4 h-4 text-yellow-500" />
                          ) : link.fileType === 'spreadsheet' ? (
                            <FileText className="w-4 h-4 text-green-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700 group-hover:text-primary-600 transition-colors">
                            {link.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {link.permission === 'edit' ? '編集可' : '閲覧のみ'}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-primary-600 transition-colors" />
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-2">共有リンクはありません</p>
                  )}

                  <button className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:text-primary-600 hover:border-primary-400 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>リンクを追加</span>
                  </button>
                </div>
              )}
            </div>

            {/* 議事録・メモ */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('notes')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-slate-500" />
                  <span className="font-medium text-slate-900">議事録・メモ</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.notes ? 'rotate-180' : ''}`} />
              </button>

              {expandedSections.notes && (
                <div className="p-4 pt-0">
                  <textarea
                    placeholder="メモを追加..."
                    className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-primary-500 resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* フッター */}
          <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
            <div className="text-xs text-slate-500">
              作成: {formatDate(task.createdAt)}
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost text-sm flex items-center gap-2 text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
                削除
              </button>
              <button className="btn-primary text-sm">
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
