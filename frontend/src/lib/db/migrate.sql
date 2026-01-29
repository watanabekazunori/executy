-- Add user email columns for user-specific filtering

-- Tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_email ON tasks(created_by_email);

-- Organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_email ON organizations(owner_email);

-- Projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_projects_owner_email ON projects(owner_email);
