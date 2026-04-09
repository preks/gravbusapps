import type { AgentStreamEvent, TodoItem } from '../types/enterpriseAgent'

const eventSeq = (e: AgentStreamEvent): number => ('seq' in e && typeof e.seq === 'number' ? e.seq : -1)

const normalizeBackendTodoStatus = (s: unknown): TodoItem['status'] => {
  if (s === 'pending' || s === 'in_progress' || s === 'done' || s === 'failed' || s === 'skipped') return s
  if (s === 'completed' || s === 'complete') return 'done'
  if (s === 'running' || s === 'active') return 'in_progress'
  return 'pending'
}

export const normalizeTodoArray = (arr: unknown[]): TodoItem[] | null => {
  const out: TodoItem[] = []
  let i = 0
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const it = item as Record<string, unknown>
    const id = typeof it.id === 'string' && it.id ? it.id : `todo-${i}`
    const textRaw = it.text ?? it.content ?? it.title ?? it.description
    const text = typeof textRaw === 'string' ? textRaw.trim() : ''
    if (!text) continue
    out.push({
      id,
      text,
      status: normalizeBackendTodoStatus(it.status),
      tool_used: typeof it.tool_used === 'string' ? it.tool_used : undefined,
      duration_ms: typeof it.duration_ms === 'number' ? it.duration_ms : undefined
    })
    i += 1
  }
  return out.length > 0 ? out : null
}

const tryParseTodosFromToolOutput = (output: unknown): TodoItem[] | null => {
  if (output === undefined || output === null) return null
  let data: unknown = output
  if (typeof output === 'string') {
    const t = output.trim()
    if (!t) return null
    try {
      data = JSON.parse(t)
    } catch {
      return null
    }
  }
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const arr = o.todos ?? o.items ?? o.tasks
  if (Array.isArray(arr)) return normalizeTodoArray(arr)
  if (Array.isArray(data)) return normalizeTodoArray(data)
  return null
}

const tryParseTodosFromInput = (input: Record<string, unknown> | undefined): TodoItem[] | null => {
  if (!input || typeof input !== 'object') return null
  let arr: unknown = input.todos ?? input.items ?? input.tasks
  if (!Array.isArray(arr) && input.args && typeof input.args === 'object' && input.args !== null) {
    const args = input.args as Record<string, unknown>
    arr = args.todos ?? args.items ?? args.tasks
  }
  if (Array.isArray(arr)) return normalizeTodoArray(arr)
  return null
}

export const isTodoListToolName = (name?: string): boolean => {
  const n = name?.trim().toLowerCase() ?? ''
  return n === 'write_todos' || n === 'update_todos' || n.endsWith('_todos')
}

const todosFromStepCompletedEvent = (ev: Extract<AgentStreamEvent, { type: 'step_completed' }>): TodoItem[] | null => {
  const raw = ev.todos
  if (Array.isArray(raw) && raw.length > 0) {
    const normalized = normalizeTodoArray(raw as unknown[])
    if (normalized?.length) return normalized
  }
  return tryParseTodosFromToolOutput(ev.output)
}

function nextTodoSnapshotForEvent(ev: AgentStreamEvent, current: TodoItem[] | null): TodoItem[] | null {
  if (ev.type === 'step_started' && isTodoListToolName(ev.name) && ev.input) {
    const parsed = tryParseTodosFromInput(ev.input)
    if (parsed && parsed.length > 0) return parsed
  }
  if (ev.type === 'step_completed' && isTodoListToolName(ev.name)) {
    const parsed = todosFromStepCompletedEvent(ev)
    if (parsed && parsed.length > 0) return parsed
  }
  if (ev.type === 'terminal' && ev.todos && ev.todos.length > 0) {
    return ev.todos
  }
  return current
}

/**
 * Latest task-list snapshot from SSE: step_started args, step_completed (tasks field + output), terminal.
 */
export const extractLatestTodosFromEvents = (events: AgentStreamEvent[]): TodoItem[] | null => {
  const ordered = [...events].sort((a, b) => {
    const d = eventSeq(a) - eventSeq(b)
    return d
  })

  let latest: TodoItem[] | null = null
  for (const ev of ordered) {
    const next = nextTodoSnapshotForEvent(ev, latest)
    if (next) latest = next
  }
  return latest
}
