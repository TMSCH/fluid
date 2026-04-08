import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('fluid.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      current_version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS project_definitions (
      project_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      definition_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (project_id, version),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_states (
      project_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      state_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (project_id, version),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_messages (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      role TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'chat',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_events (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_snapshots (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      definition_json TEXT NOT NULL,
      state_json TEXT NOT NULL,
      ui_json TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_project ON project_messages(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_events_project ON project_events(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_snapshots_project ON project_snapshots(project_id, version);
  `);
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
