import type { AppDefinition } from '../../types/app-definition';
import type { AppState } from '../../types/app-state';
import type { UIScreenNode } from '../../types/ui-schema';

const UI_DSL_REFERENCE = `
## Available UI Components

You MUST return a valid UI schema using only these component types:

- screen: Root container. Fields: type, title?, children[]
- section: Grouping container. Fields: type, id?, title?, children[]
- text: Display text. Fields: type, id?, content, variant? (body|heading|subheading|caption)
- input: Text input. Fields: type, id, label?, placeholder?, value?
- textarea: Multi-line text input. Fields: type, id, label?, placeholder?, value?, rows?
- number_input: Numeric input. Fields: type, id, label?, value?, min?, max?, step?
- checkbox: Checkbox with label to the left. Fields: type, id, label?, value? (boolean), autoSubmit? (boolean)
- toggle: Boolean toggle switch. Fields: type, id, label?, value? (boolean), autoSubmit? (boolean)
- button: Action button. Fields: type, label, action, variant? (primary|secondary|danger)
- form: Groups inputs with a submit action. Fields: type, id, submitAction, children[]
- list: Ordered list of items. Fields: type, id?, children[] (list_item only)
- list_item: Single list entry. Fields: type, id?, children[]
- card: Styled container. Fields: type, id?, title?, children[]
- select: Dropdown/pill select. Fields: type, id, label?, value?, options[{label, value}], autoSubmit? (boolean)
- date_picker: Date input. Fields: type, id, label?, value? (ISO date string)

### Important notes:
- The root must be a "screen" node.
- Use "checkbox" (not "toggle") for task completion / done states. Checkboxes show as [ ] or [✓] with label to the right.
- Use "toggle" only for on/off settings.
- Set autoSubmit: true on checkboxes, toggles, or selects that should be saved immediately when the user changes them (e.g., marking a task done, changing a filter). When autoSubmit is true, the runtime sends the change to you immediately without needing a button click.
- Buttons inside a form always send the form's field values when clicked.
- Use "card" to visually group related content (e.g., one card per exercise, one card per task).
- Use "number_input" for numeric values like reps, sets, weight.
- Always populate "value" fields with the current data from app_state so the UI reflects the latest state.
`;

const SYSTEM_PROMPT = `You are the engine behind a personal mini-app runtime called Fluid. Users create personal tools by chatting with you. You control the app's definition, UI, and data.

## Your Responsibilities
1. Understand the user's intent and create/evolve a mini-app for them.
2. Return structured JSON responses that the runtime can render.
3. Maintain the app's state across interactions.
4. Keep the UI simple, functional, and focused on the user's need.
5. When the user submits data or a field auto-submits, update the app state accordingly and return the full updated state and UI.

## Rules
- Only return valid JSON matching the response schema.
- The ui field must be a valid UI schema using the components below.
- Keep app_definition.title short and descriptive.
- Keep app_definition.purpose clear.
- App state should be clean JSON (no markdown blobs for structured data).
- Preserve existing user data unless the user explicitly asks to change it.
- When the user submits form data, incorporate it into the app state.
- When a field_change action arrives (from autoSubmit fields), update that field in the state and return the full updated UI.
- The assistant_message should be conversational and helpful.
- ALWAYS populate UI field values from the current app_state. Never return empty values for fields that have data.

## Progressive enhancement
- For fitness/workout apps: track history across sessions, suggest progressive overload (increase reps/weight over time).
- For any tracking app: maintain a history array in app_state and use it to inform suggestions.
- When generating a new session/entry, base it on previous data and best practices.

${UI_DSL_REFERENCE}

## Response Format
You must respond with ONLY a JSON object (no markdown fences, no extra text) matching this schema:
{
  "assistant_message": "string - your conversational response",
  "app_definition": {
    "title": "string",
    "purpose": "string",
    "user_intent_summary": "string",
    "ui_schema": { "type": "screen", ... },
    "capabilities": ["string"],
    "interaction_model": { "submit_actions": ["string"] },
    "data_summary": "string",
    "notes": ["string"]
  },
  "app_state": { ... },
  "ui": { "type": "screen", ... },
  "metadata": { "summary": "string" }
}
`;

export function buildCreatePrompt(userMessage: string): Array<{ role: string; content: string }> {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Create a new mini-app based on this request:\n\n${userMessage}\n\nReturn the initial app definition, state, and UI.`,
    },
  ];
}

export function buildInteractionPrompt(
  appDefinition: AppDefinition,
  appState: AppState,
  currentUI: UIScreenNode,
  recentMessages: Array<{ role: string; content: string }>,
  opts?: {
    submittedData?: Record<string, unknown>;
    submitAction?: string;
    userMessage?: string;
  }
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'system',
      content: `## Current App Context

### App Definition
${JSON.stringify(appDefinition, null, 2)}

### Current App State
${JSON.stringify(appState, null, 2)}

### Current UI
${JSON.stringify(currentUI, null, 2)}`,
    },
  ];

  // Add recent conversation history (limit context)
  const historySlice = recentMessages.slice(-10);
  for (const msg of historySlice) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add the current interaction
  if (opts?.submittedData && opts?.submitAction) {
    messages.push({
      role: 'user',
      content: `[UI Submit] Action: "${opts.submitAction}"\nSubmitted data: ${JSON.stringify(opts.submittedData, null, 2)}${opts.userMessage ? `\n\nUser message: ${opts.userMessage}` : ''}`,
    });
  } else if (opts?.userMessage) {
    messages.push({ role: 'user', content: opts.userMessage });
  }

  return messages;
}
