/**
 * In-memory storage backend for web platform.
 * Implements the same interface as SQLite repositories but stores data in memory.
 * Data persists within a page session but not across reloads (unless serialized).
 */

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

// In-memory stores
const projects = new Map<string, Project>();
const definitions = new Map<string, ProjectDefinition[]>();
const states = new Map<string, ProjectState[]>();
const messages = new Map<string, ProjectMessage[]>();
const events = new Map<string, ProjectEvent[]>();
const snapshots = new Map<string, ProjectSnapshot[]>();

// ── Projects ──

export async function createProject(name: string, summary: string): Promise<Project> {
  const id = generateId();
  const now = new Date().toISOString();
  const project: Project = { id, name, summary, created_at: now, updated_at: now, current_version: 1, status: 'active' };
  projects.set(id, project);
  return project;
}

export async function getProject(id: string): Promise<Project | null> {
  return projects.get(id) || null;
}

export async function listProjects(): Promise<Project[]> {
  return Array.from(projects.values())
    .filter((p) => p.status === 'active')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'summary' | 'current_version' | 'status'>>): Promise<void> {
  const project = projects.get(id);
  if (!project) return;
  if (updates.name !== undefined) project.name = updates.name;
  if (updates.summary !== undefined) project.summary = updates.summary;
  if (updates.current_version !== undefined) project.current_version = updates.current_version;
  if (updates.status !== undefined) project.status = updates.status;
  project.updated_at = new Date().toISOString();
}

export async function deleteProject(id: string): Promise<void> {
  projects.delete(id);
  definitions.delete(id);
  states.delete(id);
  messages.delete(id);
  events.delete(id);
  snapshots.delete(id);
}

// ── Project Definitions ──

export async function saveDefinition(projectId: string, version: number, definitionJson: string): Promise<void> {
  const now = new Date().toISOString();
  const defs = definitions.get(projectId) || [];
  const existing = defs.findIndex((d) => d.version === version);
  const def: ProjectDefinition = { project_id: projectId, version, definition_json: definitionJson, created_at: now };
  if (existing >= 0) defs[existing] = def;
  else defs.push(def);
  definitions.set(projectId, defs);
}

export async function getDefinition(projectId: string, version: number): Promise<ProjectDefinition | null> {
  const defs = definitions.get(projectId) || [];
  return defs.find((d) => d.version === version) || null;
}

export async function getLatestDefinition(projectId: string): Promise<ProjectDefinition | null> {
  const defs = definitions.get(projectId) || [];
  if (defs.length === 0) return null;
  return defs.reduce((a, b) => a.version > b.version ? a : b);
}

// ── Project States ──

export async function saveState(projectId: string, version: number, stateJson: string): Promise<void> {
  const now = new Date().toISOString();
  const sts = states.get(projectId) || [];
  const existing = sts.findIndex((s) => s.version === version);
  const st: ProjectState = { project_id: projectId, version, state_json: stateJson, created_at: now };
  if (existing >= 0) sts[existing] = st;
  else sts.push(st);
  states.set(projectId, sts);
}

export async function getState(projectId: string, version: number): Promise<ProjectState | null> {
  const sts = states.get(projectId) || [];
  return sts.find((s) => s.version === version) || null;
}

export async function getLatestState(projectId: string): Promise<ProjectState | null> {
  const sts = states.get(projectId) || [];
  if (sts.length === 0) return null;
  return sts.reduce((a, b) => a.version > b.version ? a : b);
}

// ── Messages ──

export async function addMessage(
  projectId: string,
  role: MessageRole,
  messageType: MessageType,
  content: string
): Promise<ProjectMessage> {
  const id = generateId();
  const now = new Date().toISOString();
  const msg: ProjectMessage = { id, project_id: projectId, role, message_type: messageType, content, created_at: now };
  const msgs = messages.get(projectId) || [];
  msgs.push(msg);
  messages.set(projectId, msgs);
  return msg;
}

export async function getMessages(projectId: string, limit = 50): Promise<ProjectMessage[]> {
  const msgs = messages.get(projectId) || [];
  return msgs.slice(0, limit);
}

export async function getRecentMessages(projectId: string, limit = 20): Promise<ProjectMessage[]> {
  const msgs = messages.get(projectId) || [];
  return msgs.slice(-limit);
}

// ── Events ──

export async function addEvent(
  projectId: string,
  eventType: ProjectEventType,
  payload: Record<string, unknown> = {}
): Promise<ProjectEvent> {
  const id = generateId();
  const now = new Date().toISOString();
  const evt: ProjectEvent = { id, project_id: projectId, event_type: eventType, payload: JSON.stringify(payload), created_at: now };
  const evts = events.get(projectId) || [];
  evts.push(evt);
  events.set(projectId, evts);
  return evt;
}

export async function getEvents(projectId: string, limit = 100): Promise<ProjectEvent[]> {
  const evts = events.get(projectId) || [];
  return evts.slice(-limit).reverse();
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
  const id = generateId();
  const now = new Date().toISOString();
  const snap: ProjectSnapshot = { id, project_id: projectId, version, definition_json: definitionJson, state_json: stateJson, ui_json: uiJson, summary, created_at: now };
  const snaps = snapshots.get(projectId) || [];
  snaps.push(snap);
  snapshots.set(projectId, snaps);
  return snap;
}

export async function getSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
  const snaps = snapshots.get(projectId) || [];
  return [...snaps].sort((a, b) => b.version - a.version);
}

export async function getSnapshot(projectId: string, version: number): Promise<ProjectSnapshot | null> {
  const snaps = snapshots.get(projectId) || [];
  return snaps.find((s) => s.version === version) || null;
}
