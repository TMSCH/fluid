import type { LLMResponse } from '../../types/llm';
import type { AppState } from '../../types/app-state';
import { validateLLMResponse } from '../validation/validator';
import { createMockTodoResponse, handleMockTodoInteraction } from './mock-client';

export interface LLMClientConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

function isMockMode(config: LLMClientConfig): boolean {
  return config.apiKey === 'demo' || config.apiKey === 'mock' || config.apiKey === 'test';
}

export async function callLLM(
  messages: Array<{ role: string; content: string }>,
  config: LLMClientConfig,
  context?: { currentState?: AppState; action?: string; submittedData?: Record<string, unknown> }
): Promise<LLMResponse> {
  if (isMockMode(config)) {
    return callMockLLM(messages, context);
  }

  const model = config.model || DEFAULT_MODEL;
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('LLM returned empty response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${content.slice(0, 200)}`);
  }

  const validation = validateLLMResponse(parsed);
  if (!validation.success) {
    throw new Error(validation.error);
  }

  return validation.data!;
}

function callMockLLM(
  messages: Array<{ role: string; content: string }>,
  context?: { currentState?: AppState; action?: string; submittedData?: Record<string, unknown> }
): LLMResponse {
  // If no context or no current state, this is a creation request
  if (!context?.currentState) {
    return createMockTodoResponse();
  }

  // Extract the last user message
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  let userMessage: string | undefined;
  let action = context.action;
  let submittedData = context.submittedData;

  if (lastUserMsg) {
    const content = lastUserMsg.content;
    // Parse UI submit messages
    const actionMatch = content.match(/\[UI Submit\] Action: "([^"]+)"/);
    if (actionMatch) {
      action = action || actionMatch[1];
      const dataMatch = content.match(/Submitted data: ([\s\S]+?)(?:\n\nUser message:|$)/);
      if (dataMatch && !submittedData) {
        try { submittedData = JSON.parse(dataMatch[1]); } catch { /* ignore */ }
      }
    } else {
      userMessage = content;
    }
  }

  return handleMockTodoInteraction(context.currentState, action, submittedData, userMessage);
}
