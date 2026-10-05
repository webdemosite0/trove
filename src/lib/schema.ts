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
      provider TEXT NOT NULL DEFAULT 'password',
      onboarding_done INTEGER NOT NULL DEFAULT 0,
      onboarding_meta TEXT NOT NULL DEFAULT '',
      active_workspace_id TEXT
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
      parent_id TEXT,
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
      workspace_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS recents_lookup ON recents (user_id, kind, created_at DESC);
    CREATE INDEX IF NOT EXISTS recents_by_workspace ON recents (user_id, workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS tro_artifacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'doc',
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tro_artifacts_by_agent ON tro_artifacts (agent_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS tro_artifacts_by_user ON tro_artifacts (user_id, updated_at DESC);
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      workspace_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS conversations_by_workspace ON conversations (user_id, workspace_id, updated_at DESC);

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

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      seat_limit INTEGER NOT NULL DEFAULT 5
    );
    CREATE INDEX IF NOT EXISTS teams_by_owner ON teams (owner_user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS team_members (
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (team_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS team_members_by_user ON team_members (user_id, joined_at DESC);

    CREATE TABLE IF NOT EXISTS team_invites (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      accepted_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS team_invites_by_email ON team_invites (email, accepted_at, expires_at);
    CREATE INDEX IF NOT EXISTS team_invites_by_team ON team_invites (team_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS team_projects (
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE,
      added_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (team_id, project_id)
    );
    CREATE INDEX IF NOT EXISTS team_projects_by_project ON team_projects (project_id, team_id);

    CREATE TABLE IF NOT EXISTS team_messages (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS team_messages_by_team ON team_messages (team_id, created_at DESC);

    -- Team workspaces (sidebar switcher). users.active_workspace_id = NULL
    -- means Personal, the implicit default workspace (no row needed).
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS workspaces_by_user ON workspaces (user_id, created_at DESC);
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
  `CREATE TABLE IF NOT EXISTS builder_artifact_versions (id TEXT PRIMARY KEY, artifact_id TEXT NOT NULL REFERENCES builder_artifacts(id) ON DELETE CASCADE, version INTEGER NOT NULL, content TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'agent', change_summary TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, UNIQUE(artifact_id, version))`,
  `CREATE TABLE IF NOT EXISTS builder_artifacts (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE, path TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'file', current_version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(project_id, path))`,
  `CREATE TABLE IF NOT EXISTS builder_agent_runs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', input TEXT NOT NULL DEFAULT '', output TEXT NOT NULL DEFAULT '', started_at INTEGER, finished_at INTEGER, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS builder_approvals (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE, action TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL, decided_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS builder_deployments (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE, environment TEXT NOT NULL DEFAULT 'preview', status TEXT NOT NULL DEFAULT 'queued', url TEXT NOT NULL DEFAULT '', commit_ref TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, finished_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS builder_brand_profiles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, colors TEXT NOT NULL DEFAULT '[]', typography TEXT NOT NULL DEFAULT '{}', rules TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `ALTER TABLE users ADD COLUMN instructions TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN onboarding_done INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN onboarding_meta TEXT NOT NULL DEFAULT ''`,
  // Existing accounts already use the product — don't force the intro again.
  `UPDATE users SET onboarding_done = 1 WHERE onboarding_done = 0 AND created_at < ${Date.now() - 60_000}`,
  `CREATE INDEX IF NOT EXISTS recents_by_user_created ON recents (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS credit_spends_by_user_created ON credit_spends (user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS teams_by_owner ON teams (owner_user_id, updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS team_members (team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'member', joined_at INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (team_id, user_id))`,
  `CREATE INDEX IF NOT EXISTS team_members_by_user ON team_members (user_id, joined_at DESC)`,
  `CREATE TABLE IF NOT EXISTS team_invites (id TEXT PRIMARY KEY, team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE, email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, accepted_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS team_invites_by_email ON team_invites (email, accepted_at, expires_at)`,
  `CREATE INDEX IF NOT EXISTS team_invites_by_team ON team_invites (team_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS team_projects (team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE, project_id TEXT NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE, added_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, PRIMARY KEY (team_id, project_id))`,
  `CREATE INDEX IF NOT EXISTS team_projects_by_project ON team_projects (project_id, team_id)`,
  `CREATE TABLE IF NOT EXISTS team_messages (id TEXT PRIMARY KEY, team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS team_messages_by_team ON team_messages (team_id, created_at DESC)`,
  // Team seat limits: 5 free, then paid packages / $10 per extra.
  `ALTER TABLE teams ADD COLUMN seat_limit INTEGER NOT NULL DEFAULT 5`,
  `CREATE TABLE IF NOT EXISTS tro_artifacts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, kind TEXT NOT NULL DEFAULT 'doc', title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS tro_artifacts_by_agent ON tro_artifacts (agent_id, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS tro_artifacts_by_user ON tro_artifacts (user_id, updated_at DESC)`,
  // Tro teams: hierarchy + live working presence.
  `ALTER TABLE agents ADD COLUMN parent_id TEXT`,
  `CREATE INDEX IF NOT EXISTS agents_by_parent ON agents (user_id, parent_id)`,
  `CREATE TABLE IF NOT EXISTS tro_presence (agent_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS tro_presence_by_user ON tro_presence (user_id, updated_at DESC)`,
  // Per-user persistent Browserbase context (cookies/logins isolated by user).
  `CREATE TABLE IF NOT EXISTS tro_browser_contexts (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, context_id TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  // Tro scheduled tasks: reminders and recurring agent work.
  `CREATE TABLE IF NOT EXISTS tro_scheduled_tasks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, title TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'reminder', instruction TEXT NOT NULL DEFAULT '', run_at INTEGER, cron_expr TEXT, timezone TEXT NOT NULL DEFAULT 'UTC', active INTEGER NOT NULL DEFAULT 1, last_run_at INTEGER, next_run_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS tro_scheduled_tasks_due ON tro_scheduled_tasks (active, next_run_at)`,
  `CREATE INDEX IF NOT EXISTS tro_scheduled_tasks_agent ON tro_scheduled_tasks (agent_id, next_run_at)`,
  // Scheduler heartbeat: written by /api/cron/tro-schedules on every run so the
  // Tro Tasks tab can show whether the minutely cron is actually firing.
  `CREATE TABLE IF NOT EXISTS scheduler_health (id TEXT PRIMARY KEY, last_run_at INTEGER, last_fired INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS tro_skills (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, slug TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', instructions TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT '✨', source TEXT NOT NULL DEFAULT 'custom', connector TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(user_id, slug))`,
  `CREATE INDEX IF NOT EXISTS tro_skills_user ON tro_skills (user_id, slug)`,
  // Tro task activity feed: persistent, truthful event log per agent.
  // kind: task_created|task_started|task_progress|task_waiting|task_done|task_failed|task_cancelled|task_retried|delegated|delegate_result|artifact_saved|approval_requested|approval_resolved|tool_used|note
  // status: queued|working|waiting|done|failed|cancelled
  `CREATE TABLE IF NOT EXISTS tro_task_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, task_id TEXT, kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'working', title TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '', actor_name TEXT NOT NULL DEFAULT '', target_agent_id TEXT, target_agent_name TEXT, artifact_id TEXT, verified INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS tro_task_events_agent ON tro_task_events (agent_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS tro_task_events_user ON tro_task_events (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS tro_task_events_task ON tro_task_events (task_id, created_at DESC)`,
  // Canva-style design docs: size id, layers JSON, background, thumbnail data URL.
  `CREATE TABLE IF NOT EXISTS design_docs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL DEFAULT 'Untitled design', category TEXT NOT NULL DEFAULT 'custom', size_id TEXT NOT NULL DEFAULT 'ig-post', layers TEXT NOT NULL DEFAULT '[]', background TEXT NOT NULL DEFAULT '#ffffff', thumbnail TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS design_docs_user ON design_docs (user_id, updated_at DESC)`,
  // Studio documents: real docs with title + HTML content, per user.
  `CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS documents_by_user ON documents (user_id, updated_at DESC)`,
  // Edit Tro screen: selectable mascot species per Tro.
  `ALTER TABLE agents ADD COLUMN species TEXT`,
  // Tro knowledge base: uploaded reference documents per Tro.
  `CREATE TABLE IF NOT EXISTS tro_knowledge (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'upload', created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS tro_knowledge_agent ON tro_knowledge (agent_id, created_at DESC)`,
  // Tro memory: kind is 'preference' (about the user) or 'task' (task history note).
  `CREATE TABLE IF NOT EXISTS tro_memories (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE, kind TEXT NOT NULL DEFAULT 'preference', content TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS tro_memories_agent ON tro_memories (agent_id, kind, updated_at DESC)`,
  // Browser extension (local browser control): pairing codes, connections, command queue.
  // extension_pairing_codes: single-use 6-digit codes, 10-min expiry, code -> user_id.
  `CREATE TABLE IF NOT EXISTS extension_pairing_codes (code TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  // extension_connections: one row per paired browser. token_hash is SHA-256 of the secret token.
  `CREATE TABLE IF NOT EXISTS extension_connections (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, label TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS extension_connections_user ON extension_connections (user_id, last_seen_at DESC)`,
  // extension_commands: queue. kind: tabs|read|navigate|click|type|screenshot|scroll. status: pending|dispatched|done|failed.
  `CREATE TABLE IF NOT EXISTS extension_commands (id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES extension_connections(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'pending', result TEXT NOT NULL DEFAULT '', error TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS extension_commands_queue ON extension_commands (connection_id, status, created_at)`,
  `CREATE INDEX IF NOT EXISTS extension_commands_user ON extension_commands (user_id, created_at DESC)`,
  // QA-02: flag chat replies the provider cut off at the token limit, so a
  // truncated answer is never presented as a clean completion.
  `ALTER TABLE messages ADD COLUMN truncated INTEGER NOT NULL DEFAULT 0`,
    // Team workspaces (sidebar workspace switcher). NULL workspace_id on
    // conversations/recents/users means Personal — the implicit default,
    // so legacy rows keep working without backfill.
    `CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#3b82f6', created_at INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS workspaces_by_user ON workspaces (user_id, created_at DESC)`,
    `ALTER TABLE users ADD COLUMN active_workspace_id TEXT`,
    `ALTER TABLE conversations ADD COLUMN workspace_id TEXT`,
    `CREATE INDEX IF NOT EXISTS conversations_by_workspace ON conversations (user_id, workspace_id, updated_at DESC)`,
    `ALTER TABLE recents ADD COLUMN workspace_id TEXT`,
    `CREATE INDEX IF NOT EXISTS recents_by_workspace ON recents (user_id, workspace_id, created_at DESC)`,
  // Create-agent wizard: per-Tro response mode (fast|balanced|deep|creative).
  `ALTER TABLE agents ADD COLUMN mode TEXT NOT NULL DEFAULT 'balanced'`,
];

export const REPAIRS = `
    UPDATE recents SET href = '/chat' || substr(href, 2) WHERE kind = 'chat' AND href LIKE '/?c=%';
    UPDATE recents SET href = '/agents/' || (SELECT a.id FROM agents a WHERE a.user_id = recents.user_id AND recents.title LIKE a.name || ':%' LIMIT 1) || substr(href, 2)
     WHERE kind = 'agent' AND href LIKE '/?c=%' AND EXISTS (SELECT 1 FROM agents a WHERE a.user_id = recents.user_id AND recents.title LIKE a.name || ':%');
    UPDATE recents SET href = '/agents' WHERE kind = 'agent' AND href LIKE '/?c=%';
`;
