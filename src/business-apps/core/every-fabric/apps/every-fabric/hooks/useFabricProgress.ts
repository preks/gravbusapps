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

/**
 * Derives a UI-ready task node list from:
 * 1. session.todos — authoritative after REST refresh (prompt-manager persists mid-run when non-empty)
 * 2. SSE: step_started input, step_completed (todos + output), terminal.todos — see fabricTodoStream
 * 3. step_started / step_completed — fallback to tool names when no structured todo list exists yet
 *
 * `waiting_for_human` does not close the session: pending todos stay pending.
 */
export const useFabricProgress = (
  session: DeepAgentSession | null,
  events: AgentStreamEvent[]
): { taskNodes: FabricTaskNode[]; completedCount: number; totalCount: number; progressPercent: number } => {
  const taskNodes = useMemo((): FabricTaskNode[] => {
    const lastTerminal = [...events].reverse().find((ev): ev is AgentTerminalEvent => ev.type === 'terminal')
    const terminalStatus = lastTerminal?.status
    const isSessionClosed =
      terminalStatus === 'completed' || terminalStatus === 'failed' || terminalStatus === 'cancelled'

    // Build a lookup of completed steps from SSE events
    const completedSteps = new Map<string, { durationMs?: number; status: 'done' | 'failed' }>()
    const runningStepIds = new Set<string>()
    type SubagentDoneEvent = Extract<AgentStreamEvent, { type: 'subagent_completed' | 'expert_completed' }>
    const subagentCompletions = new Map<string, SubagentDoneEvent>()

    for (const ev of events) {
      if (ev.type === 'step_completed') {
        completedSteps.set(ev.step_id, {
          durationMs: ev.duration_ms,
          status: ev.status === 'failed' ? 'failed' : 'done'
        })
        runningStepIds.delete(ev.step_id)
      } else if (ev.type === 'step_started') {
        if (!completedSteps.has(ev.step_id)) {
          runningStepIds.add(ev.step_id)
        }
      } else if (ev.type === 'subagent_completed' || ev.type === 'expert_completed') {
        subagentCompletions.set(ev.step_id, ev)
      }
    }

    // Derive sub-agents from subagent_spawned events
    const subAgentsByParentStepId = new Map<string, FabricSubAgent[]>()
    for (const ev of events) {
      if (ev.type !== 'subagent_spawned' && ev.type !== 'expert_called') continue
      const completion = subagentCompletions.get(ev.step_id)
      const agent: FabricSubAgent = {
        id: ev.step_id,
        name: resolveDelegatedAgentName(ev, completion),
        summary: 'task_summary' in ev ? ev.task_summary : undefined,
        status: completion
          ? completion.status === 'failed'
            ? 'failed'
            : 'done'
          : terminalStatus === 'failed' || terminalStatus === 'cancelled'
            ? 'failed'
            : isSessionClosed
              ? 'done'
              : 'running'
      }
      // Attach sub-agent to its parent step (use parent_step_id if available, else attach loosely)
      const parentKey = ('parent_step_id' in ev ? ev.parent_step_id : undefined) ?? ev.step_id
      const existing = subAgentsByParentStepId.get(parentKey) ?? []
      subAgentsByParentStepId.set(parentKey, [...existing, agent])
    }

    const streamTodos = extractLatestTodosFromEvents(events)
    const todosFromSession = session?.todos && session.todos.length > 0 ? session.todos : null
    const todos = todosFromSession ?? streamTodos

    if (todos && todos.length > 0) {
      return todos.map((todo): FabricTaskNode => {
        let status = todoStatusToFabric(todo.status)
        if (isSessionClosed && (status === 'active' || status === 'pending')) {
          status = terminalStatus === 'failed' || terminalStatus === 'cancelled' ? 'failed' : 'done'
        }
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

    // No todos yet — synthesise from raw step events for a live feel
    const stepEvents = events.filter(
      (e): e is Extract<AgentStreamEvent, { type: 'step_started' }> => e.type === 'step_started'
    )

    if (stepEvents.length === 0) {
      // Session is running but nothing has happened yet
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
      if (isSessionClosed && (status === 'active' || status === 'pending')) {
        status = terminalStatus === 'failed' || terminalStatus === 'cancelled' ? 'failed' : 'done'
      }

      return {
        id: ev.step_id,
        label: ev.name ?? 'Processing…',
        sublabel: sublabelParts.length > 1 ? sublabelParts.join(' · ') : undefined,
        status,
        subAgents: subAgentsByParentStepId.get(ev.step_id) ?? []
      }
    })
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
