import type { LLMResponse } from '../../types/llm';
import { validateLLMResponse } from '../validation/validator';

export interface LLMClientConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export async function callLLM(
  messages: Array<{ role: string; content: string }>,
  config: LLMClientConfig
): Promise<LLMResponse> {
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
