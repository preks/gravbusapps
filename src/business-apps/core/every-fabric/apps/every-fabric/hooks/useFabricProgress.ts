import { useMemo } from 'react'
import type { AgentStreamEvent, DeepAgentSession, TodoItem } from '../types/enterpriseAgent'
import type { FabricSubAgent, FabricTaskNode, FabricTaskStatus } from '../types/fabric'
import { extractLatestTodosFromEvents } from '../utils/fabricTodoStream'

type AgentTerminalEvent = Extract<AgentStreamEvent, { type: 'terminal' }>

const GENERIC_DELEGATION_NAMES = new Set(['task', 'newwork_ask_expert', 'invoke_agent', 'subagent', 'dispatch_agent'])

const pickDisplayName = (value?: string | null): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return GENERIC_DELEGATION_NAMES.has(trimmed.toLowerCase()) ? null : trimmed
}

const inferDelegatedAgentName = (taskSummary?: string | null): string | null => {
  if (typeof taskSummary !== 'string') return null
  const compact = taskSummary.trim()
  if (!compact) return null
  const normalized = compact.toLowerCase()

  if (/\b(market|competitor|industry|research|trend)\b/.test(normalized)) return 'Market research'
  if (/\b(vpn|access|it\b|infrastructure|security|diagnos|troubleshoot)\b/.test(normalized)) return 'IT support'
  if (/\b(hr|human resources|manager|employee|role|permission|admin)\b/.test(normalized)) return 'HR operations'
  if (/\b(salary|bonus|stock|compensation|budget|pay|allocation)\b/.test(normalized)) return 'Compensation'
  if (/\b(expense|spend|cost|finance|financial|pricing|revenue)\b/.test(normalized)) return 'Finance'
  if (/\b(workflow|approval|process|orchestrat|submission)\b/.test(normalized)) return 'Workflow design'
  if (/\b(report|write|summary|brief|document)\b/.test(normalized)) return 'Writing'
  if (/\b(chart|diagram|visual|analysis|analytics|data)\b/.test(normalized)) return 'Data analysis'

  return null
}

const resolveDelegatedAgentName = (
  event: Extract<
    AgentStreamEvent,
    { type: 'subagent_spawned' | 'subagent_completed' | 'expert_called' | 'expert_completed' }
  >,
  completion?: Extract<AgentStreamEvent, { type: 'subagent_completed' | 'expert_completed' }>
) =>
  pickDisplayName('expert_name' in event ? event.expert_name : undefined) ||
  pickDisplayName('agent_name' in event ? event.agent_name : undefined) ||
  pickDisplayName('name' in event ? event.name : undefined) ||
  pickDisplayName(completion && 'expert_name' in completion ? completion.expert_name : undefined) ||
  pickDisplayName(completion && 'agent_name' in completion ? completion.agent_name : undefined) ||
  pickDisplayName(completion && 'name' in completion ? completion.name : undefined) ||
  inferDelegatedAgentName('task_summary' in event ? event.task_summary : undefined) ||
  inferDelegatedAgentName(completion && 'task_summary' in completion ? completion.task_summary : undefined) ||
  event.subagent_id ||
  'Sub-agent'

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

type SubagentDoneEvent = Extract<AgentStreamEvent, { type: 'subagent_completed' | 'expert_completed' }>
type StepCompletionMap = Map<string, { durationMs?: number; status: 'done' | 'failed' }>
type SubagentCompletionMap = Map<string, SubagentDoneEvent>

function subAgentRowStatus(
  completion: SubagentDoneEvent | undefined,
  terminalStatus: AgentTerminalEvent['status'] | undefined,
  isSessionClosed: boolean
): FabricSubAgent['status'] {
  if (completion) {
    return completion.status === 'failed' ? 'failed' : 'done'
  }
  if (terminalStatus === 'failed' || terminalStatus === 'cancelled') {
    return 'failed'
  }
  if (isSessionClosed) {
    return 'done'
  }
  return 'running'
}

function resolveTerminalState(
  events: AgentStreamEvent[],
  session: DeepAgentSession | null
): {
  terminalStatus: AgentTerminalEvent['status'] | undefined
  isSessionClosed: boolean
} {
  // REST session status is AUTHORITATIVE - it's the source of truth
  // SSE events may be stale, incomplete, or contain intermediate states
  const sessionStatus = session?.status
  const isSessionTerminal = sessionStatus === 'completed' || sessionStatus === 'failed' || sessionStatus === 'cancelled'

  if (isSessionTerminal) {
    return {
      terminalStatus: sessionStatus as AgentTerminalEvent['status'],
      isSessionClosed: true
    }
  }

  // For non-terminal sessions, check SSE events for real-time status
  const lastTerminal = [...events].reverse().find((ev): ev is AgentTerminalEvent => ev.type === 'terminal')
  const terminalStatus = lastTerminal?.status
  const isSessionClosed =
    terminalStatus === 'completed' || terminalStatus === 'failed' || terminalStatus === 'cancelled'

  return { terminalStatus, isSessionClosed }
}

function collectStepRuntimeState(events: AgentStreamEvent[]): {
  completedSteps: StepCompletionMap
  runningStepIds: Set<string>
  subagentCompletions: SubagentCompletionMap
} {
  const completedSteps: StepCompletionMap = new Map()
  const runningStepIds = new Set<string>()
  const subagentCompletions: SubagentCompletionMap = new Map()

  for (const ev of events) {
    if (ev.type === 'step_completed') {
      completedSteps.set(ev.step_id, {
        durationMs: ev.duration_ms,
        status: ev.status === 'failed' ? 'failed' : 'done'
      })
      runningStepIds.delete(ev.step_id)
      continue
    }

    if (ev.type === 'step_started') {
      if (!completedSteps.has(ev.step_id)) {
        runningStepIds.add(ev.step_id)
      }
      continue
    }

    if (ev.type === 'subagent_completed' || ev.type === 'expert_completed') {
      subagentCompletions.set(ev.step_id, ev)
    }
  }

  return { completedSteps, runningStepIds, subagentCompletions }
}

function collectSubAgentsByParentStepId(
  events: AgentStreamEvent[],
  subagentCompletions: SubagentCompletionMap,
  terminalStatus: AgentTerminalEvent['status'] | undefined,
  isSessionClosed: boolean
): Map<string, FabricSubAgent[]> {
  const subAgentsByParentStepId = new Map<string, FabricSubAgent[]>()

  for (const ev of events) {
    if (ev.type !== 'subagent_spawned' && ev.type !== 'expert_called') continue
    const completion = subagentCompletions.get(ev.step_id)
    const parentKey = ('parent_step_id' in ev ? ev.parent_step_id : undefined) ?? ev.step_id
    const agent: FabricSubAgent = {
      id: ev.step_id,
      name: resolveDelegatedAgentName(ev, completion),
      summary: 'task_summary' in ev ? ev.task_summary : undefined,
      status: subAgentRowStatus(completion, terminalStatus, isSessionClosed)
    }
    const existing = subAgentsByParentStepId.get(parentKey) ?? []
    subAgentsByParentStepId.set(parentKey, [...existing, agent])
  }

  return subAgentsByParentStepId
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
  isSessionClosed: boolean,
  subAgentsByParentStepId: Map<string, FabricSubAgent[]>
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
      subAgents: subAgentsByParentStepId.get(todo.id) ?? []
    }
  })
}

function fallbackTaskNodesFromStepEvents(
  events: AgentStreamEvent[],
  session: DeepAgentSession | null,
  completedSteps: StepCompletionMap,
  runningStepIds: Set<string>,
  terminalStatus: AgentTerminalEvent['status'] | undefined,
  isSessionClosed: boolean,
  subAgentsByParentStepId: Map<string, FabricSubAgent[]>
): FabricTaskNode[] {
  const stepEvents = events.filter(
    (e): e is Extract<AgentStreamEvent, { type: 'step_started' }> => e.type === 'step_started'
  )

  if (stepEvents.length === 0) {
    if (session?.status === 'running' || session?.status === 'pending') {
      return [
        {
          id: 'synthetic-start',
          label: 'Starting session…',
          status: 'active',
          subAgents: []
        }
      ]
    }
    return []
  }

  const latestStepStartById = new Map<string, Extract<AgentStreamEvent, { type: 'step_started' }>>()
  for (const ev of stepEvents) {
    latestStepStartById.set(ev.step_id, ev)
  }

  return [...latestStepStartById.values()].map((ev): FabricTaskNode => {
    const completion = completedSteps.get(ev.step_id)
    const sublabelParts: string[] = []
    if (ev.name) sublabelParts.push(ev.name)
    if (completion?.durationMs) sublabelParts.push(formatDuration(completion.durationMs))

    let status: FabricTaskStatus = 'pending'
    if (completion) {
      status = completion.status
    } else if (runningStepIds.has(ev.step_id)) {
      status = 'active'
    }

    status = resolveClosedTaskStatus(status, terminalStatus, isSessionClosed)

    return {
      id: ev.step_id,
      label: ev.name ?? 'Processing…',
      sublabel: sublabelParts.length > 1 ? sublabelParts.join(' · ') : undefined,
      status,
      subAgents: subAgentsByParentStepId.get(ev.step_id) ?? []
    }
  })
}

/**
 * Derives a UI-ready task node list from:
 * 1. session task list — authoritative after REST refresh (prompt-manager persists mid-run when non-empty)
 * 2. SSE: step_started input, step_completed (task list + output), terminal task list — see fabricTodoStream
 * 3. step_started / step_completed — fallback to tool names when no structured task list exists yet
 *
 * `waiting_for_human` does not close the session: pending tasks stay pending.
 */
export const useFabricProgress = (
  session: DeepAgentSession | null,
  events: AgentStreamEvent[]
): { taskNodes: FabricTaskNode[]; completedCount: number; totalCount: number; progressPercent: number } => {
  const taskNodes = useMemo((): FabricTaskNode[] => {
    const { terminalStatus, isSessionClosed } = resolveTerminalState(events, session)
    const { completedSteps, runningStepIds, subagentCompletions } = collectStepRuntimeState(events)
    const subAgentsByParentStepId = collectSubAgentsByParentStepId(
      events,
      subagentCompletions,
      terminalStatus,
      isSessionClosed
    )

    const streamTodos = extractLatestTodosFromEvents(events)
    const todosFromSession = session?.todos && session.todos.length > 0 ? session.todos : null
    const todos = todosFromSession ?? streamTodos

    if (todos && todos.length > 0) {
      return mapTodosToTaskNodes(todos, terminalStatus, isSessionClosed, subAgentsByParentStepId)
    }

    return fallbackTaskNodesFromStepEvents(
      events,
      session,
      completedSteps,
      runningStepIds,
      terminalStatus,
      isSessionClosed,
      subAgentsByParentStepId
    )
  }, [session, events])

  const completedCount = useMemo(
    () => taskNodes.filter(n => n.status === 'done' || n.status === 'skipped').length,
    [taskNodes]
  )

  const totalCount = taskNodes.length

  const progressPercent = useMemo(
    () => (totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)),
    [completedCount, totalCount]
  )

  return { taskNodes, completedCount, totalCount, progressPercent }
}
