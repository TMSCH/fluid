import { llmResponseSchema, appDefinitionSchema, uiScreenSchema, appStateSchema } from './schemas';
import type { LLMResponse } from '../../types';
import type { AppDefinition } from '../../types/app-definition';
import type { UIScreenNode } from '../../types/ui-schema';
import type { AppState } from '../../types/app-state';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function validateLLMResponse(data: unknown): ValidationResult<LLMResponse> {
  const result = llmResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as unknown as LLMResponse };
  }
  return {
    success: false,
    error: `LLM response validation failed: ${JSON.stringify(result.error.issues ?? result.error)}`,
  };
}

export function validateAppDefinition(data: unknown): ValidationResult<AppDefinition> {
  const result = appDefinitionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as unknown as AppDefinition };
  }
  return {
    success: false,
    error: `App definition validation failed: ${JSON.stringify(result.error.issues ?? result.error)}`,
  };
}

export function validateUISchema(data: unknown): ValidationResult<UIScreenNode> {
  const result = uiScreenSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as unknown as UIScreenNode };
  }
  return {
    success: false,
    error: `UI schema validation failed: ${JSON.stringify(result.error.issues ?? result.error)}`,
  };
}

export function validateAppState(data: unknown): ValidationResult<AppState> {
  const result = appStateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as unknown as AppState };
  }
  return {
    success: false,
    error: `App state validation failed: ${JSON.stringify(result.error.issues ?? result.error)}`,
  };
}
