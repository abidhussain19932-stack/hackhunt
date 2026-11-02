import { runMigrations } from "@agent-native/core/db";

export default runMigrations(
  [
    {
      version: 1,
      name: "opportunities-and-checklists",
      sql: `CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  host TEXT,
  kind TEXT NOT NULL DEFAULT 'hackathon',
  status TEXT NOT NULL DEFAULT 'scouted',
  prize_usd INTEGER,
  deadline_at TEXT,
  fit_score INTEGER,
  fit_reason TEXT,
  summary TEXT,
  notes TEXT,
  tags TEXT,
  created_at TEXT NOT NULL DEFAULT (now()),
  updated_at TEXT NOT NULL DEFAULT (now()),
  owner_email TEXT NOT NULL DEFAULT 'local@localhost',
  org_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'private'
);
CREATE TABLE IF NOT EXISTS opportunity_shares (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  principal_type TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (now()),
  notified_at TEXT
);
CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  due_at TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  owner_email TEXT NOT NULL,
  org_id TEXT,
  created_at TEXT NOT NULL DEFAULT (now())
);
CREATE INDEX IF NOT EXISTS opportunities_owner_org_deadline_idx ON opportunities (owner_email, org_id, deadline_at);
CREATE INDEX IF NOT EXISTS opportunity_shares_resource_idx ON opportunity_shares (resource_id, principal_type, principal_id);
CREATE INDEX IF NOT EXISTS checklist_items_opp_pos_idx ON checklist_items (opportunity_id, position)`,
    },
  ],
  { table: "hackhunt_app_migrations" },
);
