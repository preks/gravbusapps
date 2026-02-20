/**
 * Converts a flow template (steps + optional start) into FlowGraphDefinition
 * for FlowViewer (start, task, decision, end nodes with ELK layout).
 */

import type {
  FlowGraphDefinition,
  FlowGraphNode,
  FlowGraphEdge,
  TaskVariant,
  TriggerType
} from '@/common/components/flow/flow-viewer/types/viewerTypes'

export interface FlowTemplateStepForGraph {
  type: string
  title: string
  message?: string
  nextStep?: number | null
  branches?: { condition?: string; nextStep: number }[]
  defaultNextStep?: number | null
  assignment?: { assignmentMode?: string }
}

export interface FlowTemplateForGraph {
  steps: FlowTemplateStepForGraph[]
  start?: { triggers?: { type: string; name?: string }[] }
  summaryFieldsCount?: number
}

const START_NODE_ID = 'start'
const END_NODE_ID = 'end'
const STEP_PREFIX = 'step-'

function isGateway(step: FlowTemplateStepForGraph): boolean {
  return (step?.type ?? '') === 'GATEWAY'
}

function getTaskVariant(type: string): TaskVariant {
  const map: Record<string, TaskVariant> = {
    TASK: 'TASK',
    APPROVAL: 'APPROVAL',
    ACKNOWLEDGE: 'ACKNOWLEDGE',
    INFORMATION: 'INFORMATION',
    FUNCTION: 'FUNCTION',
    AI_AGENT: 'AI_AGENT',
    AI_TASK_EXPERT: 'AI_TASK_EXPERT'
  }
  return map[type] ?? 'TASK'
}

function getBranchStarts(step: FlowTemplateStepForGraph): number[] {
  const starts: number[] = []
  const branches = Array.isArray(step.branches) ? step.branches : []
  for (const b of branches) {
    if (typeof b?.nextStep === 'number') starts.push(b.nextStep)
  }
  if (typeof step.defaultNextStep === 'number') starts.push(step.defaultNextStep)
  return Array.from(new Set(starts)).filter(n => n >= 0)
}

function getLinearNext(steps: FlowTemplateStepForGraph[], idx: number, branchStartSet: Set<number>): number | null {
  const s = steps[idx]
  if (!s) return null
  if (s.nextStep === null) return null
  if (typeof s.nextStep === 'number') return s.nextStep
  const fallback = idx + 1
  if (fallback >= steps.length) return null
  if (branchStartSet.has(fallback)) return null
  return fallback
}

function getTerminalStepIndices(steps: FlowTemplateStepForGraph[], branchStartSet: Set<number>): Set<number> {
  const terminal = new Set<number>()
  for (let i = 0; i < steps.length; i++) {
    if (isGateway(steps[i])) continue
    const next = getLinearNext(steps, i, branchStartSet)
    if (next === null) terminal.add(i)
  }
  for (let gwIdx = 0; gwIdx < steps.length; gwIdx++) {
    if (!isGateway(steps[gwIdx])) continue
    for (const start of getBranchStarts(steps[gwIdx])) {
      let cur = start
      const seen = new Set<number>()
      while (!seen.has(cur)) {
        seen.add(cur)
        const s = steps[cur]
        if (!s) break
        const next =
          s.nextStep !== undefined && s.nextStep !== null
            ? s.nextStep
            : cur + 1 < steps.length && !branchStartSet.has(cur + 1) && !isGateway(steps[cur + 1])
              ? cur + 1
              : null
        if (next === null || next >= steps.length) {
          terminal.add(cur)
          break
        }
        if (isGateway(steps[next])) break
        cur = next
      }
    }
  }
  return terminal
}

export function templateToFlowGraphDefinition(template: FlowTemplateForGraph): FlowGraphDefinition {
  const steps = template.steps ?? []
  const summaryFieldsCount = template.summaryFieldsCount ?? 0
  const showStart = !!template.start?.triggers?.length

  const branchStartSet = new Set<number>()
  for (let i = 0; i < steps.length; i++) {
    if (!isGateway(steps[i])) continue
    for (const start of getBranchStarts(steps[i])) branchStartSet.add(start)
  }

  const nodes: FlowGraphNode[] = []
  const edges: FlowGraphEdge[] = []

  if (showStart && steps.length > 0) {
    const firstTrigger = template.start!.triggers![0]
    nodes.push({
      id: START_NODE_ID,
      type: 'start',
      label: 'Start',
      metadata: {
        triggerType: (firstTrigger?.type ?? 'MANUAL_FORM') as TriggerType
      }
    })
    edges.push({
      id: 'e-start-0',
      source: START_NODE_ID,
      target: `${STEP_PREFIX}0`,
      direction: 'forward'
    })
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (isGateway(step)) {
      const branchCount = getBranchStarts(step).length
      nodes.push({
        id: `${STEP_PREFIX}${i}`,
        type: 'decision',
        label: step.title || 'Branch',
        metadata: { decisionMode: 'LOGIC', branchCount }
      })
      for (const startIdx of getBranchStarts(step)) {
        if (startIdx < 0 || startIdx >= steps.length) continue
        const branch = step.branches?.find(b => b.nextStep === startIdx)
        const label = branch?.condition ?? `Step ${startIdx + 1}`
        edges.push({
          id: `e-branch-${i}-${startIdx}`,
          source: `${STEP_PREFIX}${i}`,
          target: `${STEP_PREFIX}${startIdx}`,
          label,
          direction: 'forward',
          metadata: { condition: label }
        })
      }
    } else {
      const isSystem = step.type === 'FUNCTION' || step.type === 'AI_AGENT' || step.type === 'AI_TASK_EXPERT'
      nodes.push({
        id: `${STEP_PREFIX}${i}`,
        type: 'task',
        label: step.title || `Step ${i + 1}`,
        metadata: {
          taskVariant: getTaskVariant(step.type),
          description: step.message,
          assignmentMode: step.assignment?.assignmentMode,
          isSystem,
          stepNumber: i + 1
        }
      })
      const next = getLinearNext(steps, i, branchStartSet)
      if (next !== null) {
        edges.push({
          id: `e-${i}-${next}`,
          source: `${STEP_PREFIX}${i}`,
          target: `${STEP_PREFIX}${next}`,
          direction: 'forward'
        })
      }
    }
  }

  const terminalIndices = getTerminalStepIndices(steps, branchStartSet)
  if (terminalIndices.size > 0) {
    nodes.push({
      id: END_NODE_ID,
      type: 'end',
      label: 'Workflow Summary',
      metadata: { summaryFieldsCount }
    })
    for (const termIdx of terminalIndices) {
      edges.push({
        id: `e-term-${termIdx}-end`,
        source: `${STEP_PREFIX}${termIdx}`,
        target: END_NODE_ID,
        direction: 'forward'
      })
    }
  }

  return { nodes, edges }
}

/** Map FlowViewer node id to step index; null for start/end or invalid. */
export function flowNodeIdToStepIndex(nodeId: string): number | null {
  if (nodeId === START_NODE_ID || nodeId === END_NODE_ID) return null
  if (!nodeId.startsWith(STEP_PREFIX)) return null
  const index = Number.parseInt(nodeId.slice(STEP_PREFIX.length), 10)
  return Number.isNaN(index) ? null : index
}

/** Step index to FlowViewer node id for task/decision nodes. */
export function stepIndexToFlowNodeId(index: number): string {
  return `${STEP_PREFIX}${index}`
}
