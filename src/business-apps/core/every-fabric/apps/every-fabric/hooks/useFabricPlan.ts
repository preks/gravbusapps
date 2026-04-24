import { useMemo } from 'react'
import type { AgentStreamEvent, DeepAgentSession, TodoItem } from '../types/enterpriseAgent'
import type { FabricTaskNode, FabricTaskStatus } from '../types/fabric'
import { extractLatestTodosFromEvents } from '../utils/fabricTodoStream'

type AgentTerminalEvent = Extract<AgentStreamEvent, { type: 'terminal' }>

const todoStatusToFabric = (status: TodoItem['status']): FabricTaskStatus => {
  switch (status) {
    case 'in_progress':
      return 'active'
    case 'done':
      return 'done'
    case 'failed':
      return 'failed'
    case 'skipped':
      return 'skipped'
    default:
      return 'pending'
  }
}

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function resolveTerminalState(
  events: AgentStreamEvent[],
  session: DeepAgentSession | null
): {
  terminalStatus: AgentTerminalEvent['status'] | undefined
  isSessionClosed: boolean
} {
  // REST session status is authoritative when it indicates a terminal state.
  const sessionStatus = session?.status
  const isSessionTerminal = sessionStatus === 'completed' || sessionStatus === 'failed' || sessionStatus === 'cancelled'
  if (isSessionTerminal) {
    return { terminalStatus: sessionStatus as AgentTerminalEvent['status'], isSessionClosed: true }
  }

  const lastTerminal = [...events].reverse().find((ev): ev is AgentTerminalEvent => ev.type === 'terminal')
  const terminalStatus = lastTerminal?.status
  const isSessionClosed =
    terminalStatus === 'completed' || terminalStatus === 'failed' || terminalStatus === 'cancelled'
  return { terminalStatus, isSessionClosed }
}

function resolveClosedTaskStatus(
  status: FabricTaskStatus,
  terminalStatus: AgentTerminalEvent['status'] | undefined,
  isSessionClosed: boolean
): FabricTaskStatus {
  if (!isSessionClosed || (status !== 'active' && status !== 'pending')) {
    return status
  }
  return terminalStatus === 'failed' || terminalStatus === 'cancelled' ? 'failed' : 'done'
}

function mapTodosToTaskNodes(
  todos: TodoItem[],
  terminalStatus: AgentTerminalEvent['status'] | undefined,
  isSessionClosed: boolean
): FabricTaskNode[] {
  return todos.map((todo): FabricTaskNode => {
    const status = resolveClosedTaskStatus(todoStatusToFabric(todo.status), terminalStatus, isSessionClosed)
    const sublabelParts: string[] = []
    if (todo.tool_used) sublabelParts.push(todo.tool_used)
    if (todo.duration_ms) sublabelParts.push(formatDuration(todo.duration_ms))

    return {
      id: todo.id,
      label: todo.text,
      sublabel: sublabelParts.length > 0 ? sublabelParts.join(' · ') : undefined,
      status,
      // Sub-agent chips live in the dedicated Enterprise experts card now —
      // the Plan panel is strictly the todo list.
      subAgents: []
    }
  })
}

export interface FabricPlanResult {
  /** UI-ready todo rows; empty when there is no plan yet. */
  taskNodes: FabricTaskNode[]
  /** True when the agent has emitted at least one todo snapshot. */
  hasPlan: boolean
  completedCount: number
  totalCount: number
  progressPercent: number
  /** The normalized todo array used to build `taskNodes`. */
  todos: TodoItem[]
  /** The currently in-progress todo text, if any — useful as a status fallback. */
  currentTodoText: string | null
}

/**
 * Derives the Plan-panel view strictly from the agent's todo list.
 *
 * Sources (in priority order):
 *   1. `session.todos` — persisted snapshot from prompt-manager (authoritative after REST refresh).
 *   2. `extractLatestTodosFromEvents(events)` — latest snapshot mined from
 *      `write_todos` / `update_todos` step events and `terminal.todos`.
 *
 * Unlike the legacy `useFabricProgress`, this hook does **not** fall back to
 * one-row-per-tool; tool chronology belongs to the Activity panel. When no
 * todos exist, `hasPlan` is `false` and the Plan card should be hidden.
 */
export const useFabricPlan = (session: DeepAgentSession | null, events: AgentStreamEvent[]): FabricPlanResult => {
  const todos = useMemo<TodoItem[]>(() => {
    const streamTodos = extractLatestTodosFromEvents(events)
    const sessionTodos = session?.todos && session.todos.length > 0 ? session.todos : null
    return sessionTodos ?? streamTodos ?? []
  }, [session, events])

  const taskNodes = useMemo<FabricTaskNode[]>(() => {
    if (todos.length === 0) return []
    const { terminalStatus, isSessionClosed } = resolveTerminalState(events, session)
    return mapTodosToTaskNodes(todos, terminalStatus, isSessionClosed)
  }, [todos, events, session])

  const completedCount = useMemo(
    () => taskNodes.filter(n => n.status === 'done' || n.status === 'skipped').length,
    [taskNodes]
  )
  const totalCount = taskNodes.length
  const progressPercent = useMemo(
    () => (totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)),
    [completedCount, totalCount]
  )

  const currentTodoText = useMemo(() => {
    const active = taskNodes.find(n => n.status === 'active')
    if (active?.label) return active.label
    const pending = taskNodes.find(n => n.status === 'pending')
    if (pending?.label) return `Next: ${pending.label}`
    return null
  }, [taskNodes])

  return {
    taskNodes,
    hasPlan: totalCount > 0,
    completedCount,
    totalCount,
    progressPercent,
    todos,
    currentTodoText
  }
}
