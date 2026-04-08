export type ProjectStatus = 'active' | 'archived';

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'chat' | 'ui_submit' | 'system';

export type ProjectEventType =
  | 'project_created'
  | 'user_message_submitted'
  | 'ui_submit'
  | 'model_response_accepted'
  | 'model_response_rejected'
  | 'rollback_applied';

export interface Project {
  id: string;
  name: string;
  summary: string;
  created_at: string;
  updated_at: string;
  current_version: number;
  status: ProjectStatus;
}

export interface ProjectDefinition {
  project_id: string;
  version: number;
  definition_json: string;
  created_at: string;
}

export interface ProjectState {
  project_id: string;
  version: number;
  state_json: string;
  created_at: string;
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  role: MessageRole;
  message_type: MessageType;
  content: string;
  created_at: string;
}

export interface ProjectEvent {
  id: string;
  project_id: string;
  event_type: ProjectEventType;
  payload: string;
  created_at: string;
}

export interface ProjectSnapshot {
  id: string;
  project_id: string;
  version: number;
  definition_json: string;
  state_json: string;
  ui_json: string;
  summary: string;
  created_at: string;
}
