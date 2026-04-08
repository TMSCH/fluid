import type { LLMResponse } from '../../types/llm';
import type { AppDefinition } from '../../types/app-definition';
import type { AppState } from '../../types/app-state';
import type { UIScreenNode } from '../../types/ui-schema';

/**
 * Mock LLM client that produces realistic Todo app responses.
 * Used for E2E testing and demo mode (apiKey === 'demo').
 */

function buildTodoUI(todos: Array<{ id: string; title: string; done: boolean }>, filter: string): UIScreenNode {
  const filtered = filter === 'active' ? todos.filter((t) => !t.done)
    : filter === 'completed' ? todos.filter((t) => t.done)
    : todos;

  const todoItems = filtered.map((todo) => ({
    type: 'list_item' as const,
    id: todo.id,
    children: [
      {
        type: 'toggle' as const,
        id: `done_${todo.id}`,
        label: todo.title,
        value: todo.done,
      },
    ],
  }));

  return {
    type: 'screen',
    title: 'My Todo List',
    children: [
      {
        type: 'section',
        title: 'Add Task',
        children: [
          {
            type: 'form',
            id: 'add_todo_form',
            submitAction: 'add_todo',
            children: [
              {
                type: 'input',
                id: 'new_todo_title',
                label: 'Task',
                placeholder: 'What needs to be done?',
                value: '',
              },
              {
                type: 'button',
                label: 'Add Task',
                action: 'submit_form',
                variant: 'primary',
              },
            ],
          },
        ],
      },
      {
        type: 'section',
        title: `Tasks (${filtered.length})`,
        children: [
          {
            type: 'select',
            id: 'filter',
            label: 'Filter',
            value: filter,
            options: [
              { label: 'All', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Completed', value: 'completed' },
            ],
          },
          {
            type: 'list',
            id: 'todo_list',
            children: todoItems.length > 0 ? todoItems : [{
              type: 'list_item' as const,
              id: 'empty',
              children: [{ type: 'text' as const, content: 'No tasks yet. Add one above!', variant: 'caption' as const }],
            }],
          },
        ],
      },
      {
        type: 'section',
        children: [
          {
            type: 'button',
            label: 'Clear Completed',
            action: 'clear_completed',
            variant: 'danger',
          },
        ],
      },
    ],
  };
}

function buildTodoDefinition(): AppDefinition {
  return {
    title: 'Todo List',
    purpose: 'A simple task manager to track your to-dos.',
    user_intent_summary: 'The user wants a simple todo list to add, complete, and manage tasks.',
    ui_schema: buildTodoUI([], 'all'),
    capabilities: ['add_todo', 'toggle_todo', 'clear_completed', 'filter_todos'],
    interaction_model: {
      submit_actions: ['add_todo', 'toggle_todo', 'clear_completed', 'filter_todos'],
    },
    data_summary: 'Stores a list of todo items with title and completion status.',
    notes: [],
  };
}

function buildTodoState(todos: Array<{ id: string; title: string; done: boolean }>, filter: string): AppState {
  return {
    todos,
    view: { filter },
    next_id: todos.length + 1,
  };
}

let idCounter = 1;

export function createMockTodoResponse(): LLMResponse {
  idCounter = 1;
  const todos: Array<{ id: string; title: string; done: boolean }> = [];
  const state = buildTodoState(todos, 'all');
  const definition = buildTodoDefinition();
  const ui = buildTodoUI(todos, 'all');

  return {
    assistant_message: "I've created a Todo List for you! You can add tasks, mark them as complete, and filter by status. Try adding your first task!",
    app_definition: definition,
    app_state: state,
    ui,
    metadata: { summary: 'Created initial todo list app' },
  };
}

export function handleMockTodoInteraction(
  currentState: AppState,
  action?: string,
  submittedData?: Record<string, unknown>,
  userMessage?: string,
): LLMResponse {
  const todos = (currentState.todos as Array<{ id: string; title: string; done: boolean }>) || [];
  let filter = ((currentState.view as Record<string, string>)?.filter) || 'all';
  let nextId = (currentState.next_id as number) || todos.length + 1;
  let assistantMessage = '';
  let updatedTodos = [...todos];

  if (action === 'add_todo' && submittedData) {
    const title = (submittedData.new_todo_title as string || '').trim();
    if (title) {
      updatedTodos.push({ id: `todo_${nextId}`, title, done: false });
      nextId++;
      assistantMessage = `Added "${title}" to your list.`;
    } else {
      assistantMessage = 'Please enter a task title.';
    }
  } else if (action === 'clear_completed') {
    const cleared = updatedTodos.filter((t) => t.done).length;
    updatedTodos = updatedTodos.filter((t) => !t.done);
    assistantMessage = cleared > 0 ? `Cleared ${cleared} completed task(s).` : 'No completed tasks to clear.';
  } else if (action === 'toggle_todo' || action === 'add_todo_form') {
    // Handle toggle from submitted data
    if (submittedData) {
      for (const [key, value] of Object.entries(submittedData)) {
        if (key.startsWith('done_todo_')) {
          const todoId = key.replace('done_', '');
          const todo = updatedTodos.find((t) => t.id === todoId);
          if (todo) {
            todo.done = Boolean(value);
            assistantMessage = todo.done ? `Completed "${todo.title}".` : `Reopened "${todo.title}".`;
          }
        }
        if (key === 'filter') {
          filter = value as string;
          assistantMessage = `Showing ${filter} tasks.`;
        }
      }
    }
  } else if (userMessage) {
    // Handle chat messages - try to interpret as todo actions
    const lower = userMessage.toLowerCase();
    if (lower.startsWith('add ') || lower.startsWith('todo ') || lower.startsWith('task ')) {
      const title = userMessage.replace(/^(add|todo|task)\s+/i, '').trim();
      if (title) {
        updatedTodos.push({ id: `todo_${nextId}`, title, done: false });
        nextId++;
        assistantMessage = `Added "${title}" to your list.`;
      }
    } else if (lower.includes('clear') && lower.includes('completed')) {
      updatedTodos = updatedTodos.filter((t) => !t.done);
      assistantMessage = 'Cleared completed tasks.';
    } else {
      assistantMessage = `You have ${updatedTodos.length} task(s), ${updatedTodos.filter((t) => !t.done).length} active. Use the form above to add tasks, or tell me "add <task name>".`;
    }
  }

  if (!assistantMessage) {
    assistantMessage = `You have ${updatedTodos.length} task(s).`;
  }

  // Handle any toggle/filter changes from submittedData when action is something else
  if (submittedData && !action?.startsWith('toggle')) {
    for (const [key, value] of Object.entries(submittedData)) {
      if (key.startsWith('done_todo_')) {
        const todoId = key.replace('done_', '');
        const todo = updatedTodos.find((t) => t.id === todoId);
        if (todo) todo.done = Boolean(value);
      }
      if (key === 'filter') {
        filter = value as string;
      }
    }
  }

  const state = buildTodoState(updatedTodos, filter);
  const definition = buildTodoDefinition();
  definition.ui_schema = buildTodoUI(updatedTodos, filter);
  const ui = buildTodoUI(updatedTodos, filter);

  return {
    assistant_message: assistantMessage,
    app_definition: definition,
    app_state: state,
    ui,
    metadata: { summary: assistantMessage },
  };
}
