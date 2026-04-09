/** UI DSL types for the constrained component schema */

export type UIComponentType =
  | 'screen'
  | 'section'
  | 'text'
  | 'input'
  | 'textarea'
  | 'number_input'
  | 'checkbox'
  | 'toggle'
  | 'button'
  | 'form'
  | 'list'
  | 'list_item'
  | 'card'
  | 'select'
  | 'date_picker';

export interface UIBaseNode {
  type: UIComponentType;
  id?: string;
  children?: UINode[];
}

export interface UIScreenNode extends UIBaseNode {
  type: 'screen';
  title?: string;
  children: UINode[];
}

export interface UISectionNode extends UIBaseNode {
  type: 'section';
  title?: string;
  children: UINode[];
}

export interface UITextNode extends UIBaseNode {
  type: 'text';
  content: string;
  variant?: 'body' | 'heading' | 'subheading' | 'caption';
}

export interface UIInputNode extends UIBaseNode {
  type: 'input';
  id: string;
  label?: string;
  placeholder?: string;
  value?: string;
}

export interface UITextareaNode extends UIBaseNode {
  type: 'textarea';
  id: string;
  label?: string;
  placeholder?: string;
  value?: string;
  rows?: number;
}

export interface UINumberInputNode extends UIBaseNode {
  type: 'number_input';
  id: string;
  label?: string;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface UICheckboxNode extends UIBaseNode {
  type: 'checkbox';
  id: string;
  label?: string;
  value?: boolean;
  /** If true, changing this field triggers an immediate save to the LLM */
  autoSubmit?: boolean;
}

export interface UIToggleNode extends UIBaseNode {
  type: 'toggle';
  id: string;
  label?: string;
  value?: boolean;
  /** If true, changing this field triggers an immediate save to the LLM */
  autoSubmit?: boolean;
}

export interface UIButtonNode extends UIBaseNode {
  type: 'button';
  label: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface UIFormNode extends UIBaseNode {
  type: 'form';
  id: string;
  submitAction: string;
  children: UINode[];
}

export interface UIListNode extends UIBaseNode {
  type: 'list';
  id?: string;
  children: UIListItemNode[];
}

export interface UIListItemNode extends UIBaseNode {
  type: 'list_item';
  id?: string;
  children: UINode[];
}

export interface UICardNode extends UIBaseNode {
  type: 'card';
  title?: string;
  children: UINode[];
}

export interface UISelectNode extends UIBaseNode {
  type: 'select';
  id: string;
  label?: string;
  value?: string;
  options: Array<{ label: string; value: string }>;
  /** If true, changing this field triggers an immediate save to the LLM */
  autoSubmit?: boolean;
}

export interface UIDatePickerNode extends UIBaseNode {
  type: 'date_picker';
  id: string;
  label?: string;
  value?: string;
}

export type UINode =
  | UIScreenNode
  | UISectionNode
  | UITextNode
  | UIInputNode
  | UITextareaNode
  | UINumberInputNode
  | UICheckboxNode
  | UIToggleNode
  | UIButtonNode
  | UIFormNode
  | UIListNode
  | UIListItemNode
  | UICardNode
  | UISelectNode
  | UIDatePickerNode;
