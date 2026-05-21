import { useMemo } from 'react'

import type { AgentStreamEvent, DeepAgentSession } from '../types/enterpriseAgent'
import { parseActionCardToolResult } from '../utils/actionCardTrace'
import {
  deriveCaseStepFromActionCard,
  isCaseClosedPayload,
  isCaseOpenedPayload,
  isCaseStepChangedPayload,
  parseCasePanelToolResult,
  type CasePanelItem,
  type CaseOutcome,
  type CaseStepKind,
  type CaseStepStatus,
  type CaseSubject
} from '../utils/casePanelTrace'
import { mergeEvents } from './useTraceModel'

/**
 * UI-ready row inside the live Case Panel. Mirrors `CasePanelItem`
 * from the backend with two FE-only fields:
 *   - `workflowId` is filled in by the matching action_card cross-link
 *     so the per-row poller knows which Flow Engine workflow to track.
 *   - `lastChangedAt` lets the renderer animate the most recently
 *     updated row (small "moved" highlight).
 */
export interface CaseItemState {
  stepId: string
  label: string
  description?: string
  owner?: string
  due?: string
  kind?: CaseStepKind
  status: CaseStepStatus
  workflowId?: string
  actionCardRef?: string
  message?: string
  lastChangedAt?: string
}

export type CaseLifecycleStatus = 'open' | CaseOutcome

/** Aggregated view of one case for the right-sidebar Case Panel. */
export interface CaseState {
  caseId: string
  title: string
  subject?: CaseSubject
  skillId?: string
  status: CaseLifecycleStatus
  outcome?: CaseOutcome
  summary?: string
  items: CaseItemState[]
  /** Insertion order in the seq stream — used to pick the most-recently active case. */
  openedSeq: number
  openedAt?: string
  closedAt?: string
}

export interface UseFabricCasesResult {
  cases: CaseState[]
  hasCases: boolean
  /** Convenience pointer: the most recently opened case still in `open` state, else the latest case. */
  activeCase: CaseState | null
}

interface MutableCaseState extends Omit<CaseState, 'items'> {
  items: Map<string, CaseItemState>
  itemOrder: string[]
}

function fromPanelItem(item: CasePanelItem, seqTs?: string): CaseItemState {
  return {
    stepId: item.step_id,
    label: item.label,
    description: item.description,
    owner: item.owner,
    due: item.due,
    kind: item.kind,
    status: item.status ?? 'pending',
    lastChangedAt: seqTs
  }
}

function timestampOf(ev: AgentStreamEvent): string | undefined {
  return 'timestamp' in ev && typeof ev.timestamp === 'string' ? ev.timestamp : undefined
}

function seqOf(ev: AgentStreamEvent): number {
  return 'seq' in ev && typeof ev.seq === 'number' ? ev.seq : 0
}

function eventName(ev: AgentStreamEvent): string | undefined {
  return 'name' in ev && typeof ev.name === 'string' ? ev.name : undefined
}

function eventInput(ev: AgentStreamEvent): Record<string, unknown> | undefined {
  if (!('input' in ev)) return undefined
  const { input } = ev
  return input && typeof input === 'object' ? input : undefined
}

function isCaseStepStatus(value: unknown): value is CaseStepStatus {
  return value === 'pending' || value === 'in_progress' || value === 'done' || value === 'failed' || value === 'skipped'
}

function isCaseOutcome(value: unknown): value is CaseOutcome {
  return value === 'completed' || value === 'cancelled' || value === 'failed' || value === 'partial'
}

function readString(r: Record<string, unknown>, key: string): string | undefined {
  return typeof r[key] === 'string' ? (r[key] as string) : undefined
}

function toCasePanelItem(raw: unknown): CasePanelItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const stepId = readString(r, 'step_id')
  const label = readString(r, 'label')
  if (!stepId || !label) return null
  return {
    step_id: stepId,
    label,
    description: readString(r, 'description'),
    owner: readString(r, 'owner'),
    due: readString(r, 'due'),
    kind: typeof r.kind === 'string' ? (r.kind as CaseStepKind) : undefined,
    status: isCaseStepStatus(r.status) ? r.status : undefined
  }
}

function asCasePanelItems(value: unknown): CasePanelItem[] {
  if (!Array.isArray(value)) return []
  const items: CasePanelItem[] = []
  for (const raw of value) {
    const item = toCasePanelItem(raw)
    if (item) items.push(item)
  }
  return items
}

function asSubject(value: unknown): CaseSubject | undefined {
  if (!value || typeof value !== 'object') return undefined
  const r = value as Record<string, unknown>
  const kind = typeof r.kind === 'string' ? r.kind : ''
  const label = typeof r.label === 'string' ? r.label : ''
  if (!kind || !label) return undefined
  return {
    kind,
    label,
    id: typeof r.id === 'string' ? r.id : undefined
  }
}

/**
 * Derives the set of live cases from the agent's event stream.
 *
 * Data sources, in event-seq order:
 *   1. `case_panel_open` step_completed outputs → seed a new case (or
 *      re-declare an existing one). Item list and metadata come from
 *      this envelope verbatim.
 *   2. `case_panel_update` step_completed outputs → mutate one row.
 *   3. `case_panel_close` step_completed outputs → terminal marker.
 *   4. `newwork_trigger_flow` step_completed outputs whose action_card
 *      carries `refs.caseId` + `refs.caseStepId` → implicit transition
 *      to `in_progress` with `workflow_id = card.entity.id` so the row
 *      can poll Flow Engine for the live workflow status.
 *
 * Reload safety: events are merged from REST `session.trace` and the
 * live SSE stream via the same `mergeEvents` helper that
 * `useTraceModel` uses — so on refresh the case state survives without
 * needing a new BE storage layer.
 */
export function useFabricCases(session: DeepAgentSession | null, events: AgentStreamEvent[]): UseFabricCasesResult {
  return useMemo(() => {
    const restEvents = session?.trace ?? []
    const merged = mergeEvents(restEvents, events)
      .slice()
      .sort((a, b) => seqOf(a) - seqOf(b))

    const cases = new Map<string, MutableCaseState>()

    const applyOpened = (
      caseId: string,
      title: string,
      items: CasePanelItem[],
      subject: CaseSubject | undefined,
      skillId: string | undefined,
      seq: number,
      ts: string | undefined
    ): void => {
      const existing = cases.get(caseId)
      // Re-declaration is allowed: the latest open call wins on metadata
      // (title/subject/skill_id) but we preserve previously observed
      // status transitions for rows whose step_id appears in the new
      // items list. This lets a skill add a row mid-run (e.g.
      // "security_review" after privileged_access=true is confirmed)
      // without resetting the rows it already advanced.
      const itemMap = new Map<string, CaseItemState>()
      const itemOrder: string[] = []
      for (const raw of items) {
        const next = fromPanelItem(raw, ts)
        const prior = existing?.items.get(raw.step_id)
        if (prior) {
          itemMap.set(raw.step_id, {
            ...next,
            ...prior,
            label: next.label,
            owner: next.owner ?? prior.owner,
            due: next.due ?? prior.due,
            description: next.description ?? prior.description
          })
        } else {
          itemMap.set(raw.step_id, next)
        }
        itemOrder.push(raw.step_id)
      }
      cases.set(caseId, {
        caseId,
        title,
        subject,
        skillId,
        status: existing?.status === 'open' || !existing ? 'open' : existing.status,
        outcome: existing?.outcome,
        summary: existing?.summary,
        items: itemMap,
        itemOrder,
        openedSeq: existing?.openedSeq ?? seq,
        openedAt: existing?.openedAt ?? ts,
        closedAt: existing?.closedAt
      })
    }

    const applyStepChange = (
      caseId: string,
      stepId: string,
      status: CaseStepStatus,
      workflowId: string | undefined,
      actionCardRef: string | undefined,
      message: string | undefined,
      ts: string | undefined
    ): void => {
      const c = cases.get(caseId)
      if (!c) return
      const prior = c.items.get(stepId)
      // Allow synthesised updates from action_card cross-links to add a
      // row that was not declared up-front (defensive — agents should
      // declare everything in case_panel_open, but this prevents data
      // loss if they skip a step).
      if (!prior) {
        c.items.set(stepId, {
          stepId,
          label: stepId,
          status,
          workflowId,
          actionCardRef,
          message,
          lastChangedAt: ts
        })
        c.itemOrder.push(stepId)
        return
      }
      // Terminal states (`done`/`failed`) should not be regressed by a
      // late-arriving `in_progress` event from a duplicated SSE
      // delivery. Order by seq guarantees we always have the latest
      // event last, but defensively prefer the strictly-monotonic
      // status progression.
      const priority: Record<CaseStepStatus, number> = {
        pending: 0,
        in_progress: 1,
        skipped: 2,
        failed: 3,
        done: 4
      }
      const newStatus = priority[status] >= priority[prior.status] ? status : prior.status
      c.items.set(stepId, {
        ...prior,
        status: newStatus,
        workflowId: workflowId ?? prior.workflowId,
        actionCardRef: actionCardRef ?? prior.actionCardRef,
        message: message ?? prior.message,
        lastChangedAt: ts ?? prior.lastChangedAt
      })
    }

    const applyClosed = (
      caseId: string,
      outcome: CaseOutcome,
      summary: string | undefined,
      ts: string | undefined
    ): void => {
      const c = cases.get(caseId)
      if (!c) return
      c.status = outcome
      c.outcome = outcome
      c.summary = summary ?? c.summary
      c.closedAt = ts
    }

    const stringField = (input: Record<string, unknown>, key: string): string =>
      typeof input[key] === 'string' ? (input[key] as string) : ''

    const optionalString = (input: Record<string, unknown>, key: string): string | undefined =>
      typeof input[key] === 'string' ? (input[key] as string) : undefined

    const handleStartedOpen = (input: Record<string, unknown>, seq: number, ts: string | undefined): void => {
      const caseId = stringField(input, 'case_id')
      const title = stringField(input, 'title')
      const items = asCasePanelItems(input.items)
      if (!caseId || !title || items.length === 0) return
      applyOpened(caseId, title, items, asSubject(input.subject), optionalString(input, 'skill_id'), seq, ts)
    }

    const handleStartedUpdate = (input: Record<string, unknown>, ts: string | undefined): void => {
      const caseId = stringField(input, 'case_id')
      const stepId = stringField(input, 'step_id')
      const status = isCaseStepStatus(input.status) ? input.status : undefined
      if (!caseId || !stepId || !status) return
      applyStepChange(
        caseId,
        stepId,
        status,
        optionalString(input, 'workflow_id'),
        optionalString(input, 'action_card_ref'),
        optionalString(input, 'message'),
        ts
      )
    }

    const handleStartedClose = (input: Record<string, unknown>, ts: string | undefined): void => {
      const caseId = stringField(input, 'case_id')
      const outcome = isCaseOutcome(input.outcome) ? input.outcome : undefined
      if (!caseId || !outcome) return
      applyClosed(caseId, outcome, optionalString(input, 'summary'), ts)
    }

    const handleStartedTriggerFlow = (input: Record<string, unknown>, ts: string | undefined): void => {
      const caseId = stringField(input, 'case_id')
      const stepId = stringField(input, 'case_step_id')
      if (!caseId || !stepId) return
      applyStepChange(caseId, stepId, 'in_progress', undefined, undefined, 'Workflow trigger started.', ts)
    }

    const handleStarted = (ev: AgentStreamEvent, seq: number, ts: string | undefined): void => {
      const name = eventName(ev)
      const input = eventInput(ev)
      if (!input) return
      switch (name) {
        case 'case_panel_open':
          handleStartedOpen(input, seq, ts)
          return
        case 'case_panel_update':
          handleStartedUpdate(input, ts)
          return
        case 'case_panel_close':
          handleStartedClose(input, ts)
          return
        case 'newwork_trigger_flow':
          handleStartedTriggerFlow(input, ts)
          return
        default:
          return
      }
    }

    const handleCasePayload = (
      casePayload: ReturnType<typeof parseCasePanelToolResult>,
      seq: number,
      ts: string | undefined
    ): void => {
      if (!casePayload) return
      if (isCaseOpenedPayload(casePayload)) {
        applyOpened(
          casePayload.case_id,
          casePayload.title,
          casePayload.items,
          casePayload.subject,
          casePayload.skill_id,
          seq,
          casePayload.ts ?? ts
        )
      } else if (isCaseStepChangedPayload(casePayload)) {
        applyStepChange(
          casePayload.case_id,
          casePayload.step_id,
          casePayload.status,
          casePayload.workflow_id,
          casePayload.action_card_ref,
          casePayload.message,
          casePayload.ts ?? ts
        )
      } else if (isCaseClosedPayload(casePayload)) {
        applyClosed(casePayload.case_id, casePayload.outcome, casePayload.summary, casePayload.ts ?? ts)
      }
    }

    const handleCompleted = (output: string, seq: number, ts: string | undefined): void => {
      const casePayload = parseCasePanelToolResult(output)
      if (casePayload) {
        handleCasePayload(casePayload, seq, ts)
        return
      }
      const cardPayload = parseActionCardToolResult(output)
      if (!cardPayload) return
      const derived = deriveCaseStepFromActionCard(cardPayload)
      if (!derived) return
      applyStepChange(
        derived.case_id,
        derived.step_id,
        derived.status,
        derived.workflow_id,
        derived.action_card_ref,
        derived.message,
        ts
      )
    }

    for (const ev of merged) {
      const seq = seqOf(ev)
      const ts = timestampOf(ev)
      if (ev.type === 'step_started') {
        handleStarted(ev, seq, ts)
        continue
      }
      if (ev.type !== 'step_completed') continue
      const output = typeof ev.output === 'string' ? ev.output : ''
      if (output) handleCompleted(output, seq, ts)
    }

    if (cases.size === 0) {
      return { cases: [], hasCases: false, activeCase: null }
    }

    const allCases: CaseState[] = Array.from(cases.values())
      .sort((a, b) => a.openedSeq - b.openedSeq)
      .map(m => ({
        caseId: m.caseId,
        title: m.title,
        subject: m.subject,
        skillId: m.skillId,
        status: m.status,
        outcome: m.outcome,
        summary: m.summary,
        openedSeq: m.openedSeq,
        openedAt: m.openedAt,
        closedAt: m.closedAt,
        items: m.itemOrder.map(stepId => m.items.get(stepId)).filter((row): row is CaseItemState => Boolean(row))
      }))

    const openCases = allCases.filter(c => c.status === 'open')
    const activeCase = openCases.length > 0 ? openCases[openCases.length - 1] : (allCases[allCases.length - 1] ?? null)

    return { cases: allCases, hasCases: true, activeCase }
  }, [session?.trace, events])
}
