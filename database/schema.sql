-- EXECUTY Database Schema
-- PostgreSQL / Supabase
-- Created: 2026-01-25

-- ============================================
-- ユーザー管理
-- ============================================

-- ユーザーテーブル
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 組織管理
-- ============================================

-- 組織テーブル
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    initial CHAR(2) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT 'blue',
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 組織メンバーテーブル
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- owner, admin, member
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- ============================================
-- プロジェクト管理
-- ============================================

-- プロジェクトテーブル
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active', -- active, archived, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- タスク管理
-- ============================================

-- タスクテーブル（大タスク・小タスク両方）
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- NULL = 大タスク、設定あり = 小タスク

    title VARCHAR(255) NOT NULL,
    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent

    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    due_date TIMESTAMP WITH TIME ZONE,
    estimated_minutes INT, -- AI予測時間（分）
    actual_minutes INT, -- 実際にかかった時間

    sort_order INT DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- タスクタグ
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT 'gray',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE task_tags (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- ============================================
-- 打ち合わせ管理
-- ============================================

-- 打ち合わせテーブル
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- タスクに紐づく場合

    title VARCHAR(255) NOT NULL,
    description TEXT,

    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,

    location VARCHAR(255), -- 会議室名 or Zoom等
    meeting_url TEXT, -- オンライン会議URL

    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 打ち合わせ参加者
CREATE TABLE meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined
    UNIQUE(meeting_id, user_id)
);

-- ============================================
-- 議事録管理
-- ============================================

-- 議事録テーブル
CREATE TABLE meeting_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    content TEXT, -- Markdown形式

    status VARCHAR(20) DEFAULT 'draft', -- draft, published

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 議事録の決定事項・TODO
CREATE TABLE meeting_note_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_note_id UUID REFERENCES meeting_notes(id) ON DELETE CASCADE,

    type VARCHAR(20) NOT NULL, -- decision, todo, note
    content TEXT NOT NULL,

    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,

    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ファイル/Google Drive共有管理
-- ============================================

-- 共有リンクテーブル
CREATE TABLE shared_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,

    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,

    link_type VARCHAR(50), -- google_drive, dropbox, notion, other
    file_type VARCHAR(50), -- folder, spreadsheet, document, presentation, pdf

    permission VARCHAR(20) DEFAULT 'view', -- view, edit

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 通知/メッセージ連携
-- ============================================

-- 外部メッセージ連携（Slack/Google Chat）
CREATE TABLE external_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    source VARCHAR(20) NOT NULL, -- slack, google_chat
    source_id VARCHAR(255), -- 外部サービスのメッセージID

    channel_name VARCHAR(100),
    sender_name VARCHAR(100),
    content TEXT,

    message_type VARCHAR(20), -- mention, dm, channel

    is_read BOOLEAN DEFAULT FALSE,
    is_converted_to_task BOOLEAN DEFAULT FALSE,
    converted_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AI関連
-- ============================================

-- AI提案ログ
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    suggestion_type VARCHAR(50) NOT NULL, -- time_estimate, priority, breakdown, schedule
    content JSONB NOT NULL,

    is_accepted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- カレンダー同期
-- ============================================

-- Google Calendar連携
CREATE TABLE calendar_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    provider VARCHAR(20) NOT NULL, -- google, outlook
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,

    calendar_id VARCHAR(255),

    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- インデックス
-- ============================================

CREATE INDEX idx_tasks_organization ON tasks(organization_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);

CREATE INDEX idx_projects_organization ON projects(organization_id);

CREATE INDEX idx_meetings_organization ON meetings(organization_id);
CREATE INDEX idx_meetings_task ON meetings(task_id);
CREATE INDEX idx_meetings_start ON meetings(start_time);

CREATE INDEX idx_external_messages_organization ON external_messages(organization_id);
CREATE INDEX idx_external_messages_read ON external_messages(is_read);

-- ============================================
-- RLS (Row Level Security) for Supabase
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_messages ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- 組織メンバーは組織データにアクセス可能
CREATE POLICY "Members can view organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- タスクは組織メンバーのみアクセス可能
CREATE POLICY "Members can view tasks" ON tasks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can insert tasks" ON tasks
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update tasks" ON tasks
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );
