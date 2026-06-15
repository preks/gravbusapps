// Derive flow domain actions from the run trace so UI updates as soon as
// `newwork_trigger_flow` completes — without waiting for REST `run.actions`.

import { parseActionCardToolResult } from '../../../utils/actionCardTrace'
import type { WorkforceRunDomainAction, WorkforceRunTraceEvent } from '../workforceTypes'

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function toolNameOf(event: WorkforceRunTraceEvent): string | null {
  return asText(event.tool_name) ?? asText(event.name)
}

function actionFromActionCard(
  card: ReturnType<typeof parseActionCardToolResult>,
  event: WorkforceRunTraceEvent
): WorkforceRunDomainAction | null {
  if (!card || card.card.entity?.type !== 'service_workflow') return null
  const workflowId = card.card.entity.id
  if (!workflowId) return null

  const refs = card.refs ?? {}
  const templateId = asText(refs.template_id) ?? asText(refs.templateId)
  const name = card.card.title || card.card.subtitle || 'Workflow'

  return {
    domain: 'flow',
    tool_ref: 'newwork_trigger_flow',
    action: 'flow',
    entity_type: 'workflow',
    record_ids: {
      workflow_id: workflowId,
      ...(templateId ? { template_id: templateId } : {})
    },
    record_labels: { [workflowId]: name },
    succeeded: card.card.status.variant !== 'destructive',
    timestamp: asText(event.timestamp),
    seq: typeof event.seq === 'number' ? event.seq : null
  }
}

/** Flow actions inferred from `newwork_trigger_flow` tool outputs in the trace. */
export function resolveFlowActionsFromTrace(
  trace: readonly WorkforceRunTraceEvent[] | undefined
): WorkforceRunDomainAction[] {
  if (!trace?.length) return []

  const byWorkflow = new Map<string, WorkforceRunDomainAction>()
  for (const event of trace) {
    if (event.type !== 'step_completed') continue
    if (toolNameOf(event) !== 'newwork_trigger_flow') continue

    const output = typeof event.output === 'string' ? event.output : null
    if (!output) continue

    const action = actionFromActionCard(parseActionCardToolResult(output), event)
    if (!action) continue

    const workflowId = action.record_ids.workflow_id
    const existing = byWorkflow.get(workflowId)
    if (!existing || (action.seq ?? 0) >= (existing.seq ?? 0)) {
      byWorkflow.set(workflowId, action)
    }
  }

  return Array.from(byWorkflow.values()).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
}

/** Merge persisted run actions with trace-derived flow rows (REST wins on overlap). */
export function mergeDomainActions(
  runActions: readonly WorkforceRunDomainAction[],
  traceActions: readonly WorkforceRunDomainAction[]
): WorkforceRunDomainAction[] {
  const merged = [...runActions]
  const seenWorkflowIds = new Set(
    merged
      .filter(action => action.domain === 'flow')
      .map(action => action.record_ids?.workflow_id)
      .filter((id): id is string => Boolean(id))
  )

  for (const action of traceActions) {
    const workflowId = action.record_ids?.workflow_id
    if (!workflowId || seenWorkflowIds.has(workflowId)) continue
    merged.push(action)
    seenWorkflowIds.add(workflowId)
  }

  return merged.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
}
