import { getDatabase } from './database';
import { generateId } from '../../lib/uuid';
import type {
  Project,
  ProjectDefinition,
  ProjectState,
  ProjectMessage,
  ProjectEvent,
  ProjectSnapshot,
  ProjectEventType,
  MessageRole,
  MessageType,
} from '../../types/project';

// ── Projects ──

export async function createProject(name: string, summary: string): Promise<Project> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO projects (id, name, summary, created_at, updated_at, current_version, status)
     VALUES (?, ?, ?, ?, ?, 1, 'active')`,
    [id, name, summary, now, now]
  );
  return { id, name, summary, created_at: now, updated_at: now, current_version: 1, status: 'active' };
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Project>('SELECT * FROM projects WHERE id = ?', [id]);
}

export async function listProjects(): Promise<Project[]> {
  const db = await getDatabase();
  return db.getAllAsync<Project>(
    "SELECT * FROM projects WHERE status = 'active' ORDER BY updated_at DESC"
  );
}

export async function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'summary' | 'current_version' | 'status'>>): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: (string | number)[] = [];
  if (updates.name !== undefined) { sets.push('name = ?'); values.push(updates.name); }
  if (updates.summary !== undefined) { sets.push('summary = ?'); values.push(updates.summary); }
  if (updates.current_version !== undefined) { sets.push('current_version = ?'); values.push(updates.current_version); }
  if (updates.status !== undefined) { sets.push('status = ?'); values.push(updates.status); }
  sets.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);
  await db.runAsync(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
}

// ── Project Definitions ──

export async function saveDefinition(projectId: string, version: number, definitionJson: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO project_definitions (project_id, version, definition_json, created_at)
     VALUES (?, ?, ?, ?)`,
    [projectId, version, definitionJson, now]
  );
}

export async function getDefinition(projectId: string, version: number): Promise<ProjectDefinition | null> {
  const db = await getDatabase();
  return db.getFirstAsync<ProjectDefinition>(
    'SELECT * FROM project_definitions WHERE project_id = ? AND version = ?',
    [projectId, version]
  );
}

export async function getLatestDefinition(projectId: string): Promise<ProjectDefinition | null> {
  const db = await getDatabase();
  return db.getFirstAsync<ProjectDefinition>(
    'SELECT * FROM project_definitions WHERE project_id = ? ORDER BY version DESC LIMIT 1',
    [projectId]
  );
}

// ── Project States ──

export async function saveState(projectId: string, version: number, stateJson: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO project_states (project_id, version, state_json, created_at)
     VALUES (?, ?, ?, ?)`,
    [projectId, version, stateJson, now]
  );
}

export async function getState(projectId: string, version: number): Promise<ProjectState | null> {
  const db = await getDatabase();
  return db.getFirstAsync<ProjectState>(
    'SELECT * FROM project_states WHERE project_id = ? AND version = ?',
    [projectId, version]
  );
}

export async function getLatestState(projectId: string): Promise<ProjectState | null> {
  const db = await getDatabase();
  return db.getFirstAsync<ProjectState>(
    'SELECT * FROM project_states WHERE project_id = ? ORDER BY version DESC LIMIT 1',
    [projectId]
  );
}

// ── Messages ──

export async function addMessage(
  projectId: string,
  role: MessageRole,
  messageType: MessageType,
  content: string
): Promise<ProjectMessage> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO project_messages (id, project_id, role, message_type, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, projectId, role, messageType, content, now]
  );
  return { id, project_id: projectId, role, message_type: messageType, content, created_at: now };
}

export async function getMessages(projectId: string, limit = 50): Promise<ProjectMessage[]> {
  const db = await getDatabase();
  return db.getAllAsync<ProjectMessage>(
    'SELECT * FROM project_messages WHERE project_id = ? ORDER BY created_at ASC LIMIT ?',
    [projectId, limit]
  );
}

export async function getRecentMessages(projectId: string, limit = 20): Promise<ProjectMessage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ProjectMessage>(
    'SELECT * FROM project_messages WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
    [projectId, limit]
  );
  return rows.reverse();
}

// ── Events ──

export async function addEvent(
  projectId: string,
  eventType: ProjectEventType,
  payload: Record<string, unknown> = {}
): Promise<ProjectEvent> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO project_events (id, project_id, event_type, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, projectId, eventType, JSON.stringify(payload), now]
  );
  return { id, project_id: projectId, event_type: eventType, payload: JSON.stringify(payload), created_at: now };
}

export async function getEvents(projectId: string, limit = 100): Promise<ProjectEvent[]> {
  const db = await getDatabase();
  return db.getAllAsync<ProjectEvent>(
    'SELECT * FROM project_events WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
    [projectId, limit]
  );
}

// ── Snapshots ──

export async function createSnapshot(
  projectId: string,
  version: number,
  definitionJson: string,
  stateJson: string,
  uiJson: string,
  summary: string
): Promise<ProjectSnapshot> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO project_snapshots (id, project_id, version, definition_json, state_json, ui_json, summary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, projectId, version, definitionJson, stateJson, uiJson, summary, now]
  );
  return { id, project_id: projectId, version, definition_json: definitionJson, state_json: stateJson, ui_json: uiJson, summary, created_at: now };
}

export async function getSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
  const db = await getDatabase();
  return db.getAllAsync<ProjectSnapshot>(
    'SELECT * FROM project_snapshots WHERE project_id = ? ORDER BY version DESC',
    [projectId]
  );
}

export async function getSnapshot(projectId: string, version: number): Promise<ProjectSnapshot | null> {
  const db = await getDatabase();
  return db.getFirstAsync<ProjectSnapshot>(
    'SELECT * FROM project_snapshots WHERE project_id = ? AND version = ?',
    [projectId, version]
  );
}
