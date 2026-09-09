import "server-only";

export const SCHEMA = `
PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at INTEGER NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      provider TEXT NOT NULL DEFAULT 'password'
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS auth_tokens_user ON auth_tokens (user_id, purpose);

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      instructions TEXT NOT NULL,
      tools TEXT NOT NULL DEFAULT '[]',
      accent TEXT NOT NULL DEFAULT '#3b82f6',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      html TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      due_at INTEGER NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      notified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      href TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS recents_lookup ON recents (user_id, kind, created_at DESC);

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      seq INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_by_conversation ON messages (conversation_id, seq);

    CREATE TABLE IF NOT EXISTS credit_grants (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      plan TEXT NOT NULL,
      credits INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, period)
    );

    CREATE TABLE IF NOT EXISTS credit_spends (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      tokens INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      period TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS credit_spends_lookup ON credit_spends (user_id, period);

    CREATE TABLE IF NOT EXISTS connections (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service TEXT NOT NULL,
      kind TEXT NOT NULL,
      secret TEXT NOT NULL,
      account TEXT NOT NULL DEFAULT '',
      hint TEXT NOT NULL DEFAULT '',
      verified_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, service)
    );

    CREATE TABLE IF NOT EXISTS integrations (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      service TEXT NOT NULL,
      connected_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, service)
    );

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      goal TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planning',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS missions_by_user ON missions (user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS mission_tasks (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
      seq INTEGER NOT NULL,
      role TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      output TEXT NOT NULL DEFAULT '',
      started_at INTEGER,
      finished_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS mission_tasks_by_mission ON mission_tasks (mission_id, seq);

    CREATE TABLE IF NOT EXISTS mission_events (
      id TEXT PRIMARY KEY,
      mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
      at INTEGER NOT NULL,
      kind TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mission_events_by_mission ON mission_events (mission_id, at);

    CREATE TABLE IF NOT EXISTS builder_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT 'static',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS builder_projects_by_user ON builder_projects (user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS builder_artifacts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'file',
      current_version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(project_id, path)
    );
    CREATE INDEX IF NOT EXISTS builder_artifacts_by_project ON builder_artifacts (project_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS builder_artifact_versions (
      id TEXT PRIMARY KEY,
      artifact_id TEXT NOT NULL REFERENCES builder_artifacts(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'agent',
      change_summary TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      UNIQUE(artifact_id, version)
    );
    CREATE INDEX IF NOT EXISTS builder_versions_by_artifact ON builder_artifact_versions (artifact_id, version DESC);

    CREATE TABLE IF NOT EXISTS builder_agent_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      input TEXT NOT NULL DEFAULT '',
      output TEXT NOT NULL DEFAULT '',
      started_at INTEGER,
      finished_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS builder_runs_by_project ON builder_agent_runs (project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS builder_approvals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      decided_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS builder_approvals_by_project ON builder_approvals (project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS builder_deployments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE,
      environment TEXT NOT NULL DEFAULT 'preview',
      status TEXT NOT NULL DEFAULT 'queued',
      url TEXT NOT NULL DEFAULT '',
      commit_ref TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      finished_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS builder_deployments_by_project ON builder_deployments (project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS builder_brand_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      colors TEXT NOT NULL DEFAULT '[]',
      typography TEXT NOT NULL DEFAULT '{}',
      rules TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS builder_brand_profiles_by_user ON builder_brand_profiles (user_id, updated_at DESC);
`;

export const MIGRATIONS: string[] = [
  `ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', due_at INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0, notified INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS reminders_by_user_due ON reminders (user_id, done, due_at)`,
  `ALTER TABLE users ADD COLUMN stripe_customer_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN subscription_ends_at INTEGER`,
  `CREATE INDEX IF NOT EXISTS users_by_stripe_customer ON users (stripe_customer_id)`,
  `CREATE TABLE IF NOT EXISTS missions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, goal TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'planning', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS mission_tasks (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE, seq INTEGER NOT NULL, role TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'waiting', output TEXT NOT NULL DEFAULT '', started_at INTEGER, finished_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS mission_events (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE, at INTEGER NOT NULL, kind TEXT NOT NULL, actor TEXT NOT NULL DEFAULT '', text TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS auth_tokens (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS auth_tokens_user ON auth_tokens (user_id, purpose)`,
  `ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT 'password'`,
  `UPDATE users SET email_verified = 1 WHERE email_verified = 0 AND password_hash <> '' AND email NOT LIKE 'guest-%@local'`,
  `CREATE TABLE IF NOT EXISTS builder_projects (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, prompt TEXT NOT NULL, target TEXT NOT NULL DEFAULT 'static', status TEXT NOT NULL DEFAULT 'draft', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS builder_artifacts (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE, path TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'file', current_version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(project_id, path))`,
  `CREATE TABLE IF NOT EXISTS builder_artifact_versions (id TEXT PRIMARY KEY, artifact_id TEXT NOT NULL REFERENCES builder_artifacts(id) ON DELETE CASCADE, version INTEGER NOT NULL, content TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'agent', change_summary TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, UNIQUE(artifact_id, version))`,
  `CREATE TABLE IF NOT EXISTS builder_agent_runs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', input TEXT NOT NULL DEFAULT '', output TEXT NOT NULL DEFAULT '', started_at INTEGER, finished_at INTEGER, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS builder_approvals (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE, action TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL, decided_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS builder_deployments (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE, environment TEXT NOT NULL DEFAULT 'preview', status TEXT NOT NULL DEFAULT 'queued', url TEXT NOT NULL DEFAULT '', commit_ref TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, finished_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS builder_brand_profiles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, colors TEXT NOT NULL DEFAULT '[]', typography TEXT NOT NULL DEFAULT '{}', rules TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
];

export const REPAIRS = `
    UPDATE recents SET href = '/chat' || substr(href, 2) WHERE kind = 'chat' AND href LIKE '/?c=%';
    UPDATE recents SET href = '/agents/' || (SELECT a.id FROM agents a WHERE a.user_id = recents.user_id AND recents.title LIKE a.name || ':%' LIMIT 1) || substr(href, 2)
     WHERE kind = 'agent' AND href LIKE '/?c=%' AND EXISTS (SELECT 1 FROM agents a WHERE a.user_id = recents.user_id AND recents.title LIKE a.name || ':%');
    UPDATE recents SET href = '/agents' WHERE kind = 'agent' AND href LIKE '/?c=%';
`;
