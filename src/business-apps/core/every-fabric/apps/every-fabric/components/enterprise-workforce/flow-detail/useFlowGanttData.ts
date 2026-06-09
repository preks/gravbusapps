// Fetches overview + steps for a set of flows and maps them into the
// `LinkedFlow` shape consumed by the shared case-management `FlowGanttChart`,
// so the workforce Flows tab can render the exact same timeline. One
// `GET /flows/:id` per flow per poll; stops once every flow is terminal.
// No-op when disabled or without an access token (returns seed rows so the
// timeline still draws something).

import { useEffect, useMemo, useState } from 'react'

import type { LinkedFlow, StepHistoryItem } from '@/business-apps/common/apps/case-management/types/case.types'

import {
  ACTIVE_STEP_STATES,
  asNumber,
  asString,
  flowEngineApiBase,
  isRecord,
  isTerminalFlowStatus,
  unwrapFlow
} from '../../../utils/flowEngineShared'

const COMPLETE_STEP_STATES: ReadonlySet<string> = new Set(['COMPLETED', 'DONE', 'FINISHED', 'CLOSED', 'SKIPPED'])

// `assignedTo` / `completedBy` can be sentinels rather than real ids; drop them
// so the Gantt does not render a fake assignee avatar.
const ACTOR_SENTINELS: ReadonlySet<string> = new Set(['AVAILABLE', 'UNASSIGNED', 'PENDING', 'MULTIPLE'])

export interface FlowEntry {
  workflowId: string
  templateId?: string
  name: string
  succeeded: boolean
}

function stepStatus(raw: string | undefined): StepHistoryItem['status'] {
  const code = (raw ?? '').toUpperCase()
  if (COMPLETE_STEP_STATES.has(code)) return 'completed'
  if (ACTIVE_STEP_STATES.includes(code)) return 'current'
  return 'pending'
}

function realActor(id: string | undefined): string | undefined {
  if (!id) return undefined
  return ACTOR_SENTINELS.has(id.toUpperCase()) ? undefined : id
}

function seedFlow(entry: FlowEntry): LinkedFlow {
  return {
    workflowId: entry.workflowId,
    workflowName: entry.name,
    templateId: entry.templateId,
    addedAt: new Date().toISOString(),
    addedBy: '',
    status: entry.succeeded ? 'RUNNING' : 'FAILED'
  }
}

function flowFromOverview(entry: FlowEntry, flow: Record<string, unknown>): LinkedFlow | null {
  const id = asString(flow.id) ?? asString(flow.flowId) ?? entry.workflowId
  const status = asString(flow.status)
  if (!status) return null

  const stepsRaw = Array.isArray(flow.steps) ? flow.steps : []
  const stepHistory: StepHistoryItem[] = stepsRaw.filter(isRecord).map((step, index) => ({
    index: asNumber(step.stepIndex) ?? index,
    name: asString(step.title) ?? asString(step.name) ?? `Step ${index + 1}`,
    status: stepStatus(asString(step.status)),
    startedAt: asString(step.startedAt),
    completedAt: asString(step.completedAt),
    assignee: realActor(asString(step.completedBy) ?? asString(step.assignedTo))
  }))
  const current = stepHistory.find(step => step.status === 'current')

  const progress = isRecord(flow.progress) ? flow.progress : {}
  const initiator = asString(flow.initiatedById) ?? asString(flow.initiatedBy)
  const createdAt = asString(flow.createdAt)
  const completedAt = asString(flow.completedAt)

  return {
    workflowId: id,
    workflowName: asString(flow.name) ?? entry.name,
    templateId: asString(flow.templateId) ?? entry.templateId,
    addedAt: createdAt ?? new Date().toISOString(),
    addedBy: initiator ?? '',
    status,
    initiator,
    startTime: createdAt,
    createdAt,
    updateTime: completedAt,
    updatedAt: completedAt,
    totalSteps: asNumber(progress.totalSteps) ?? stepHistory.length,
    completedSteps: asNumber(progress.completedSteps),
    progressPercentage: asNumber(progress.percentage),
    currentStepName: current?.name,
    currentAssignee: current?.assignee,
    stepHistory
  }
}

export function useFlowGanttData(
  entries: readonly FlowEntry[],
  accessToken: string | null | undefined,
  enabled: boolean,
  pollIntervalMs = 25_000
): LinkedFlow[] {
  const [flowsById, setFlowsById] = useState<Record<string, LinkedFlow>>({})
  const idKey = entries.map(entry => entry.workflowId).join(',')

  useEffect(() => {
    const seed: Record<string, LinkedFlow> = {}
    for (const entry of entries) seed[entry.workflowId] = seedFlow(entry)
    setFlowsById(seed)

    if (!enabled || !accessToken || entries.length === 0) return

    const ctrl = new AbortController()
    type IntervalHandle = ReturnType<typeof globalThis.setInterval>
    const local = { cancelled: false, intervalId: null as IntervalHandle | null }
    const apiBase = flowEngineApiBase()

    const fetchOne = async (entry: FlowEntry): Promise<string | null> => {
      try {
        const resp = await fetch(`${apiBase}/flows/${entry.workflowId}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: ctrl.signal
        })
        if (!resp.ok) return null
        const mapped = flowFromOverview(entry, unwrapFlow(await resp.json()) ?? {})
        if (!mapped || local.cancelled) return null
        setFlowsById(prev => ({ ...prev, [entry.workflowId]: mapped }))
        return mapped.status
      } catch {
        return null
      }
    }

    const refreshAll = async (): Promise<void> => {
      const codes = await Promise.all(entries.map(entry => fetchOne(entry)))
      if (codes.every(code => isTerminalFlowStatus(code)) && local.intervalId !== null) {
        globalThis.clearInterval(local.intervalId)
        local.intervalId = null
      }
    }

    refreshAll().catch(() => null)
    local.intervalId = globalThis.setInterval(() => {
      refreshAll().catch(() => null)
    }, pollIntervalMs)

    return () => {
      local.cancelled = true
      ctrl.abort()
      if (local.intervalId !== null) {
        globalThis.clearInterval(local.intervalId)
        local.intervalId = null
      }
    }
    // `idKey` stands in for the flow-id list; `entries` identity is intentionally excluded.
  }, [idKey, accessToken, enabled, pollIntervalMs])

  return useMemo(() => entries.map(entry => flowsById[entry.workflowId] ?? seedFlow(entry)), [entries, flowsById])
}
