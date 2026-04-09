import * as repo from '../storage/repositories';
import { callLLM, buildCreatePrompt, buildInteractionPrompt } from '../llm';
import type { LLMClientConfig } from '../llm';
import { takeSnapshot } from '../rollback/snapshot-manager';
import type { Project, ProjectMessage } from '../../types/project';
import type { AppDefinition } from '../../types/app-definition';
import type { AppState } from '../../types/app-state';
import type { UIScreenNode } from '../../types/ui-schema';
import type { LLMResponse } from '../../types/llm';

export interface ProjectContext {
  project: Project;
  definition: AppDefinition;
  state: AppState;
  ui: UIScreenNode;
  messages: ProjectMessage[];
}

/** Load the full context for a project */
export async function loadProjectContext(projectId: string): Promise<ProjectContext | null> {
  const project = await repo.getProject(projectId);
  if (!project) return null;

  const defRow = await repo.getLatestDefinition(projectId);
  const stateRow = await repo.getLatestState(projectId);
  const messages = await repo.getRecentMessages(projectId, 50);

  if (!defRow || !stateRow) return null;

  const definition: AppDefinition = JSON.parse(defRow.definition_json);
  const state: AppState = JSON.parse(stateRow.state_json);

  return {
    project,
    definition,
    state,
    ui: definition.ui_schema ?? { type: 'screen', children: [] } as UIScreenNode,
    messages,
  };
}

/** Create a new project from a user's initial message */
export async function createProject(
  userMessage: string,
  llmConfig: LLMClientConfig
): Promise<{ project: Project; response: LLMResponse }> {
  const messages = buildCreatePrompt(userMessage);
  const llmResponse = await callLLM(messages, llmConfig);

  // Create project in DB
  const project = await repo.createProject(
    llmResponse.app_definition.title,
    llmResponse.app_definition.purpose
  );

  // Persist definition, state, and UI
  const version = 1;
  await repo.saveDefinition(project.id, version, JSON.stringify(llmResponse.app_definition));
  await repo.saveState(project.id, version, JSON.stringify(llmResponse.app_state));

  // Save messages
  await repo.addMessage(project.id, 'user', 'chat', userMessage);
  await repo.addMessage(project.id, 'assistant', 'chat', llmResponse.assistant_message);

  // Log events
  await repo.addEvent(project.id, 'project_created', { user_message: userMessage });
  await repo.addEvent(project.id, 'model_response_accepted', { version });

  // Take initial snapshot
  await takeSnapshot(project.id, version, {
    definition: llmResponse.app_definition,
    state: llmResponse.app_state,
    ui: llmResponse.ui,
  }, 'Initial project creation');

  return { project, response: llmResponse };
}

/** Handle a user chat message within an existing project */
export async function sendChatMessage(
  projectId: string,
  userMessage: string,
  llmConfig: LLMClientConfig
): Promise<LLMResponse> {
  const ctx = await loadProjectContext(projectId);
  if (!ctx) throw new Error(`Project ${projectId} not found`);

  // Save user message
  await repo.addMessage(projectId, 'user', 'chat', userMessage);
  await repo.addEvent(projectId, 'user_message_submitted', { message: userMessage });

  const recentMessages = ctx.messages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const promptMessages = buildInteractionPrompt(
    ctx.definition,
    ctx.state,
    ctx.ui,
    recentMessages,
    { userMessage }
  );

  const llmResponse = await callLLM(promptMessages, llmConfig, {
    currentState: ctx.state,
  });
  await applyLLMResponse(projectId, ctx.project.current_version, llmResponse);

  return llmResponse;
}

/** Handle a UI form submission */
export async function submitUIAction(
  projectId: string,
  action: string,
  submittedData: Record<string, unknown>,
  llmConfig: LLMClientConfig
): Promise<LLMResponse> {
  const ctx = await loadProjectContext(projectId);
  if (!ctx) throw new Error(`Project ${projectId} not found`);

  await repo.addEvent(projectId, 'ui_submit', { action, data: submittedData });

  const recentMessages = ctx.messages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const promptMessages = buildInteractionPrompt(
    ctx.definition,
    ctx.state,
    ctx.ui,
    recentMessages,
    { submittedData, submitAction: action }
  );

  const llmResponse = await callLLM(promptMessages, llmConfig, {
    currentState: ctx.state,
    action,
    submittedData,
  });
  await applyLLMResponse(projectId, ctx.project.current_version, llmResponse);

  return llmResponse;
}

/** Apply a validated LLM response: persist new version and snapshot */
async function applyLLMResponse(
  projectId: string,
  currentVersion: number,
  response: LLMResponse
): Promise<void> {
  const newVersion = currentVersion + 1;

  await repo.saveDefinition(projectId, newVersion, JSON.stringify(response.app_definition));
  await repo.saveState(projectId, newVersion, JSON.stringify(response.app_state));
  await repo.updateProject(projectId, {
    current_version: newVersion,
    name: response.app_definition.title,
    summary: response.app_definition.purpose,
  });

  await repo.addMessage(projectId, 'assistant', 'chat', response.assistant_message);
  await repo.addEvent(projectId, 'model_response_accepted', {
    version: newVersion,
    summary: response.metadata?.summary,
  });

  await takeSnapshot(projectId, newVersion, {
    definition: response.app_definition,
    state: response.app_state,
    ui: response.ui,
  }, response.metadata?.summary || `Version ${newVersion}`);
}
