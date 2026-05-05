export const KANBAN_DEFAULT_COLUMN_IDS = {
  todo: 'todo',
  inProgress: 'in-progress',
  done: 'done'
} as const

export type KanbanDefaultColumnId = (typeof KANBAN_DEFAULT_COLUMN_IDS)[keyof typeof KANBAN_DEFAULT_COLUMN_IDS]

export const KANBAN_PROTECTED_COLUMN_IDS: readonly KanbanDefaultColumnId[] = Object.values(KANBAN_DEFAULT_COLUMN_IDS)
