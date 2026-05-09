-- Core tables for Configure Link Commands

CREATE TABLE IF NOT EXISTS link_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  schema_json TEXT NOT NULL,
  command_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(name, status)
);

CREATE TABLE IF NOT EXISTS link_records (
  id TEXT PRIMARY KEY,
  link_config_id TEXT NOT NULL,
  name TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  values_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(link_config_id) REFERENCES link_configs(id)
);

CREATE TABLE IF NOT EXISTS command_runs (
  id TEXT PRIMARY KEY,
  link_config_id TEXT NOT NULL,
  link_record_id TEXT NOT NULL,
  rendered_command TEXT NOT NULL,
  dispatch_target TEXT NOT NULL,
  request_status TEXT NOT NULL,
  execution_status TEXT NOT NULL,
  status_message TEXT,
  requested_by TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY(link_config_id) REFERENCES link_configs(id),
  FOREIGN KEY(link_record_id) REFERENCES link_records(id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_link_records_link_config_id ON link_records(link_config_id);
CREATE INDEX IF NOT EXISTS idx_command_runs_link_record_id ON command_runs(link_record_id);
CREATE INDEX IF NOT EXISTS idx_command_runs_link_config_id ON command_runs(link_config_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events(target_type, target_id);
