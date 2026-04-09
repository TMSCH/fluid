import { AppDefinition } from './app-definition';
import { AppState } from './app-state';
import { UIScreenNode } from './ui-schema';

/** The structured envelope the LLM must return */
export interface LLMResponse {
  assistant_message: string;
  app_definition: AppDefinition;
  app_state: AppState;
  ui: UIScreenNode;
  metadata?: {
    summary?: string;
  };
}

/** Payload sent to the LLM for project creation */
export interface LLMCreateRequest {
  user_message: string;
}

/** Payload sent to the LLM for project interactions */
export interface LLMInteractionRequest {
  app_definition: AppDefinition;
  app_state: AppState;
  ui: UIScreenNode;
  messages: Array<{ role: string; content: string }>;
  submitted_data?: Record<string, unknown>;
  submit_action?: string;
  user_message?: string;
}
