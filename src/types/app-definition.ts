import { UIScreenNode } from './ui-schema';

/** The mutable source of truth for what a mini-app is */
export interface AppDefinition {
  title: string;
  purpose: string;
  user_intent_summary: string;
  ui_schema: UIScreenNode;
  capabilities: string[];
  interaction_model: {
    submit_actions: string[];
  };
  data_summary: string;
  notes: string[];
}
