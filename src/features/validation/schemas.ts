import { z } from 'zod';

// ── UI Schema validation ──

const uiComponentTypes = [
  'screen', 'section', 'text', 'input', 'textarea', 'number_input',
  'checkbox', 'toggle', 'button', 'form', 'list', 'list_item', 'card', 'select', 'date_picker',
] as const;

// We use a lazy recursive schema since UI nodes can nest
const baseNodeSchema = z.object({
  type: z.enum(uiComponentTypes),
  id: z.string().optional(),
});

export const uiNodeSchema: z.ZodType<Record<string, unknown>> = z.lazy(() =>
  baseNodeSchema.catchall(z.unknown()).refine(
    (node) => uiComponentTypes.includes(node.type as typeof uiComponentTypes[number]),
    { message: 'Invalid UI component type' }
  )
);

export const uiScreenSchema = z.object({
  type: z.literal('screen'),
  title: z.string().optional(),
  children: z.array(uiNodeSchema),
}).passthrough();

// ── App Definition validation ──

export const appDefinitionSchema = z.object({
  title: z.string().min(1),
  purpose: z.string(),
  user_intent_summary: z.string(),
  ui_schema: uiScreenSchema,
  capabilities: z.array(z.string()),
  interaction_model: z.object({
    submit_actions: z.array(z.string()),
  }),
  data_summary: z.string(),
  notes: z.array(z.string()),
});

// ── App State validation (flexible JSON object) ──

export const appStateSchema = z.record(z.string(), z.unknown());

// ── LLM Response envelope validation ──

export const llmResponseSchema = z.object({
  assistant_message: z.string(),
  app_definition: appDefinitionSchema,
  app_state: appStateSchema,
  ui: uiScreenSchema,
  metadata: z.object({
    summary: z.string().optional(),
  }).optional(),
});
