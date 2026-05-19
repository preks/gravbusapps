import { useEffect, useMemo, useRef, useState } from 'react'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import type {
  AgentExpertCalledEvent,
  AgentExpertCompletedEvent,
  AgentStepStartedEvent,
  AgentStreamEvent,
  AgentSubagentCompletedEvent,
  AgentSubagentSpawnedEvent
} from '../types/enterpriseAgent'
import type { DelegationNode, DelegationStats, DelegationTreeResult } from '../types/delegation'

const GENERIC_NAMES = new Set(['task', 'newwork_ask_expert', 'invoke_agent', 'subagent', 'dispatch_agent'])

function pickName(value?: string | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || GENERIC_NAMES.has(trimmed.toLowerCase())) return null
  return trimmed
}

type SpawnEvent = AgentSubagentSpawnedEvent | AgentExpertCalledEvent
type CompletionEvent = AgentSubagentCompletedEvent | AgentExpertCompletedEvent

function resolveAgentName(event: SpawnEvent): string {
  return (
    pickName('expert_name' in event ? event.expert_name : undefined) ??
    pickName('agent_name' in event ? event.agent_name : undefined) ??
    pickName(event.name) ??
    pickName(event.task_summary) ??
    'Sub-agent'
  )
}

function resolveTask(event: SpawnEvent): string {
  return event.task_summary?.trim() || resolveAgentName(event)
}

function isSpawnEvent(e: AgentStreamEvent): e is SpawnEvent {
  return e.type === 'subagent_spawned' || e.type === 'expert_called'
}

function isCompletionEvent(e: AgentStreamEvent): e is CompletionEvent {
  return e.type === 'subagent_completed' || e.type === 'expert_completed'
}

function isToolStepStarted(e: AgentStreamEvent): e is AgentStepStartedEvent {
  return e.type === 'step_started' && (e as AgentStepStartedEvent).step_type === 'tool'
}

function buildDelegationTree(events: AgentStreamEvent[]): DelegationTreeResult {
  const root: DelegationNode = {
    id: '__root__',
    name: 'Every',
    task: 'Session orchestration',
    status: 'running',
    kind: 'root',
    parentId: null,
    children: [],
    startedAt: null,
    completedAt: null,
    durationMs: null,
    toolsUsed: []
  }

  const nodesById = new Map<string, DelegationNode>()
  nodesById.set(root.id, root)

  const scopeStack: string[] = [root.id]

  for (const event of events) {
    if (isSpawnEvent(event)) {
      const parentId = event.parent_step_id ?? scopeStack[scopeStack.length - 1] ?? root.id
      const node: DelegationNode = {
        id: event.step_id,
        name: resolveAgentName(event),
        task: resolveTask(event),
        status: 'running',
        kind: event.type === 'expert_called' ? 'expert' : 'subagent',
        parentId,
        children: [],
        startedAt: event.timestamp,
        completedAt: null,
        durationMs: null,
        toolsUsed: []
      }
      nodesById.set(event.step_id, node)
      const parent = nodesById.get(parentId) ?? root
      parent.children.push(node)
      scopeStack.push(event.step_id)

      if (!root.startedAt || event.timestamp < root.startedAt) {
        root.startedAt = event.timestamp
      }
    } else if (isCompletionEvent(event)) {
      const node = nodesById.get(event.step_id)
      if (node) {
        node.status = event.status === 'failed' ? 'failed' : 'done'
        node.completedAt = event.timestamp
        node.durationMs = event.duration_ms ?? null
      }
      const stackIdx = scopeStack.lastIndexOf(event.step_id)
      if (stackIdx !== -1) {
        scopeStack.splice(stackIdx, 1)
      }
    } else if (isToolStepStarted(event)) {
      const toolName = (event as AgentStepStartedEvent).name
      if (toolName) {
        const currentScope = scopeStack[scopeStack.length - 1]
        const owner = currentScope ? nodesById.get(currentScope) : root
        if (owner && !owner.toolsUsed.includes(toolName)) {
          owner.toolsUsed.push(toolName)
        }
      }
    }
  }

  const hasTerminal = events.some(e => e.type === 'terminal')
  if (hasTerminal) {
    const terminal = [...events].reverse().find(e => e.type === 'terminal')
    if (terminal && 'status' in terminal) {
      root.status = terminal.status === 'failed' ? 'failed' : 'done'
    }
  }

  const flatNodes: DelegationNode[] = []
  function flatten(node: DelegationNode) {
    flatNodes.push(node)
    node.children.forEach(flatten)
  }
  flatten(root)

  return {
    rootNode: root,
    flatNodes,
    hasMultipleAgents: root.children.length > 0
  }
}

export function computeDelegationStats(nodes: DelegationNode[]): DelegationStats {
  const agents = nodes.filter(n => n.kind !== 'root')
  return {
    total: agents.length,
    running: agents.filter(n => n.status === 'running').length,
    done: agents.filter(n => n.status === 'done').length,
    failed: agents.filter(n => n.status === 'failed').length
  }
}

interface ApiDelegationNode {
  id: string
  name: string
  task: string
  status: string
  kind: string
  parentId: string | null
  children: ApiDelegationNode[]
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  toolsUsed: string[]
}

function apiNodeToDelegation(node: ApiDelegationNode): DelegationNode {
  return {
    id: node.id,
    name: node.name || 'Agent',
    task: node.task || '',
    status: (node.status === 'failed'
      ? 'failed'
      : node.status === 'running'
        ? 'running'
        : 'done') as DelegationNode['status'],
    kind: (node.kind === 'expert' ? 'expert' : node.kind === 'root' ? 'root' : 'subagent') as DelegationNode['kind'],
    parentId: node.parentId,
    children: (node.children || []).map(apiNodeToDelegation),
    startedAt: node.startedAt,
    completedAt: node.completedAt,
    durationMs: node.durationMs ?? null,
    toolsUsed: node.toolsUsed || []
  }
}

function apiResponseToResult(data: {
  rootNode: ApiDelegationNode
  totalAgents: number
  hasMultipleAgents: boolean
}): DelegationTreeResult {
  const rootNode = apiNodeToDelegation(data.rootNode)
  const flatNodes: DelegationNode[] = []
  function flatten(node: DelegationNode) {
    flatNodes.push(node)
    node.children.forEach(flatten)
  }
  flatten(rootNode)
  return { rootNode, flatNodes, hasMultipleAgents: data.hasMultipleAgents }
}

interface UseFabricDelegationOptions {
  sessionId?: string
  accessToken?: string
  isStreaming?: boolean
}

export function useFabricDelegation(
  events: AgentStreamEvent[],
  options: UseFabricDelegationOptions = {}
): DelegationTreeResult {
  const { sessionId, accessToken, isStreaming } = options
  const isCompleted = isStreaming === false && !!sessionId
  const [apiResult, setApiResult] = useState<DelegationTreeResult | null>(null)
  const fetchedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isCompleted || !sessionId || !accessToken) return
    const cacheKey = `${sessionId}:completed`
    if (fetchedKeyRef.current === cacheKey) return
    fetchedKeyRef.current = cacheKey

    const controller = new AbortController()
    const base = PROMPT_MANAGER_API_URL.replace(/\/$/, '')
    const url = `${base}/deep-agent/sessions/${encodeURIComponent(sessionId)}/delegation-tree`

    fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal
    })
      .then(res => {
        if (!res.ok) throw new Error(`delegation-tree: ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (data?.hasMultipleAgents) {
          setApiResult(apiResponseToResult(data))
        }
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        fetchedKeyRef.current = null
      })

    return () => controller.abort()
  }, [isCompleted, sessionId, accessToken])

  const sseResult = useMemo(() => buildDelegationTree(events), [events])

  if (apiResult && isCompleted) return apiResult
  return sseResult
}
