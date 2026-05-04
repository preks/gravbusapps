/**
 * templateConverter - Bridges between Flow Studio graph format and FlowTemplate backend format.
 * Converts studio nodes/edges to FlowTemplate steps and vice versa.
 */

import type { StudioNode } from '../types/studioTypes'
import type { FlowGraphEdge } from '@/common/components/flow/flow-viewer'
import type {
  FlowTemplate,
  FlowStep,
  FlowStartNodeConfiguration,
  FlowTrigger,
  FlowTriggerType
} from '@/common/network/flows/FlowTemplateClient'
import { AssignmentMode } from '@/common/data/flow/types/flowTemplate'
import type { FlowTags } from '@/business-apps/flow/types'
import { END_ID, START_ID, normalizeGraph } from './graphStoreUtils'
import { orderNodesForTemplate } from './studioStepOrder'

function isForwardEdge(edge: FlowGraphEdge): boolean {
  return String((edge as any)?.direction ?? 'forward').toLowerCase() !== 'backward'
}

function firstOrNull<T>(arr: T[]): T | null {
  return arr.length > 0 ? arr[0] : null
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '')
}

function buildForwardAdjacency(edges: FlowGraphEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>()
  for (const e of edges) {
    if (!isForwardEdge(e)) continue
    const list = adjacency.get(e.source) ?? []
    list.push(e.target)
    adjacency.set(e.source, list)
  }
  return adjacency
}

function buildStartTrigger(startNodeId: string, config: any): FlowTrigger {
  const triggerType = safeString(config?.triggerType || 'MANUAL_FORM') as any

  // Keep id stable across saves (so templates diff cleanly).
  const id = `${startNodeId}_${triggerType}`.toLowerCase()

  const base: FlowTrigger = {
    id,
    type: triggerType as FlowTriggerType,
    name: triggerType,
    active: true,
    config: {}
  } as any

  if (triggerType === 'WEBHOOK') {
    base.config = {
      url: config?.webhookConfig?.url,
      secret: config?.webhookConfig?.secret
    }
  }
  if (triggerType === 'EVENT') {
    base.config = {
      eventType: config?.eventConfig?.eventType,
      filter: config?.eventConfig?.filter
    }
  }
  if (triggerType === 'SCHEDULE') {
    base.config = {
      cron: config?.scheduleConfig?.cron,
      timezone: config?.scheduleConfig?.timezone
    }
  }

  return base
}

function computeNearestCommonSuccessor(startTargets: string[], edges: FlowGraphEdge[], endId: string): string | null {
  const targets = startTargets.filter(t => t && t !== endId)
  if (targets.length < 2) return null

  const adjacency = buildForwardAdjacency(edges)
  const distanceMaps: Array<Map<string, number>> = []

  for (const start of targets) {
    const dist = new Map<string, number>()
    const queue: Array<{ id: string; d: number }> = [{ id: start, d: 0 }]
    while (queue.length > 0) {
      const { id, d } = queue.shift()!
      if (!id) continue
      if (dist.has(id)) continue
      dist.set(id, d)
      const next = adjacency.get(id) ?? []
      for (const n of next) queue.push({ id: n, d: d + 1 })
    }
    distanceMaps.push(dist)
  }

  const intersection = new Set(distanceMaps[0].keys())
  for (const m of distanceMaps.slice(1)) {
    for (const k of Array.from(intersection)) {
      if (!m.has(k)) intersection.delete(k)
    }
  }

  if (intersection.size === 0) return null

  // Pick the candidate that minimizes the maximum distance across branches (closest common successor).
  // Tie-breaker: smaller sum distance, then stable string order.
  let best: { id: string; max: number; sum: number } | null = null
  for (const id of intersection) {
    const distances = distanceMaps.map(m => m.get(id) ?? Number.POSITIVE_INFINITY)
    const max = Math.max(...distances)
    const sum = distances.reduce((a, b) => a + b, 0)
    if (!best) {
      best = { id, max, sum }
      continue
    }
    if (max < best.max) best = { id, max, sum }
    else if (max === best.max && sum < best.sum) best = { id, max, sum }
    else if (max === best.max && sum === best.sum && id < best.id) best = { id, max, sum }
  }

  if (!best || best.id === endId) return null
  return best.id
}

/**
 * Convert studio graph (nodes + edges) to a FlowTemplate for the backend.
 */
export function studioGraphToTemplate(
  nodes: StudioNode[],
  edges: FlowGraphEdge[],
  name: string,
  description?: string,
  tags?: FlowTags,
  version?: number
): FlowTemplate {
  const orderedNodes = orderNodesForTemplate(nodes, edges)
  const startNode = nodes.find(n => n.type === 'start') ?? nodes.find(n => n.id === START_ID) ?? null
  const endNode = nodes.find(n => n.type === 'end') ?? nodes.find(n => n.id === END_ID) ?? null
  const endId = endNode?.id ?? END_ID

  const steps: FlowStep[] = []

  const stepNodes = orderedNodes.filter(n => n.type !== 'start' && n.type !== 'end')
  const nodeIdToStepIndex = new Map(stepNodes.map((n, i) => [n.id, i] as const))

  const forwardOutgoingBySource = new Map<string, FlowGraphEdge[]>()
  for (const e of edges) {
    if (!isForwardEdge(e)) continue
    const list = forwardOutgoingBySource.get(e.source) ?? []
    list.push(e)
    forwardOutgoingBySource.set(e.source, list)
  }

  // Start configuration (triggers + optional form).
  let start: FlowStartNodeConfiguration | undefined
  if (startNode && startNode.config?.nodeType === 'start') {
    const cfg: any = startNode.config
    start = {
      // Back-end supports multiple triggers; studio currently picks one.
      triggers: [buildStartTrigger(startNode.id, cfg)]
    } as any
    ;(start as any).form = Array.isArray(cfg.form) ? cfg.form : []
  }

  // End configuration: summaryFields are persisted at template level.
  const summaryFields = (() => {
    if (!endNode || endNode.config?.nodeType !== 'end') return undefined
    const cfg: any = endNode.config
    return Array.isArray(cfg.summaryFields) && cfg.summaryFields.length > 0 ? cfg.summaryFields : undefined
  })()

  // Build step objects.
  for (const node of stepNodes) {
    const cfg: any = node.config
    if (!cfg || typeof cfg !== 'object') continue

    if (cfg.nodeType === 'task') {
      const persistedOutputSchema =
        cfg.stepType === 'FUNCTION'
          ? cfg.functionConfig?.outputSchema
          : cfg.stepType === 'AI_AGENT' || cfg.stepType === 'AI_TASK_EXPERT'
            ? cfg.agentConfig?.outputSchema
            : undefined
      const step: any = {
        id: node.id,
        reference: node.id,
        type: cfg.stepType,
        kind: cfg.kind,
        title: cfg.title ?? node.label,
        message: cfg.message,
        form: Array.isArray(cfg.form) ? cfg.form : [],
        links: Array.isArray(cfg.links) ? cfg.links : undefined,
        assignment: cfg.assignment ?? { targets: null, assignmentMode: AssignmentMode.CLAIM },
        dueInMinutes: cfg.dueInMinutes,
        defaultPriority: cfg.defaultPriority,
        customStates: cfg.customStates,
        eventSubscriptions: cfg.eventSubscriptions,
        reworkConfig: cfg.reworkConfig,
        permissionContext: cfg.permissionContext,
        simpleAIConfig: cfg.simpleAIConfig,
        functionConfig: cfg.functionConfig
          ? {
              functionId: cfg.functionConfig.functionId,
              version: cfg.functionConfig.version,
              inputExpressionMap: cfg.functionConfig.inputExpressionMap,
              outputExpressionMap: cfg.functionConfig.outputExpressionMap
            }
          : undefined,
        agentConfig:
          cfg.agentConfig && cfg.agentConfig.promptId
            ? {
                promptId: cfg.agentConfig.promptId,
                version: cfg.agentConfig.version,
                systemParamsMap: cfg.agentConfig.systemParamsMap,
                userParamsMap: cfg.agentConfig.userParamsMap,
                outputExpressionMap: cfg.agentConfig.outputExpressionMap,
                modelSettings: cfg.agentConfig.modelSettings
              }
            : undefined,
        aiAgentConfig: persistedOutputSchema ? { resultSchema: persistedOutputSchema } : undefined
      }

      steps.push(step as FlowStep)
      continue
    }

    if (cfg.nodeType === 'decision') {
      const branchEdges = edges.filter(e => e.source === node.id)
      const branches = branchEdges.map(e => {
        const nextIdx = nodeIdToStepIndex.get(e.target)
        const condition =
          typeof (e as any)?.metadata?.condition === 'string' ? (e as any).metadata.condition : undefined
        return {
          id: e.id,
          label: e.label ?? `Branch`,
          condition,
          targetStepReference: e.target,
          ...(typeof nextIdx === 'number' ? { nextStep: nextIdx } : {})
        }
      })

      const forwardBranchTargets = branchEdges.filter(isForwardEdge).map(e => e.target)
      const mergeNodeId = computeNearestCommonSuccessor(forwardBranchTargets, edges, endId)
      const mergeIdx = mergeNodeId ? nodeIdToStepIndex.get(mergeNodeId) : undefined

      const decisionMode = safeString(cfg.decisionMode || 'USER').toUpperCase()
      const decisionStep: any = {
        id: node.id,
        reference: node.id,
        type: 'DECISION',
        title: node.label || 'Decision',
        links: Array.isArray(cfg.links) ? cfg.links : undefined,
        decisionMode,
        branches,
        defaultBranch:
          cfg.defaultBranch && branches.some((b: any) => b.id === cfg.defaultBranch)
            ? cfg.defaultBranch
            : branches[0]?.id,
        rejectRework: (cfg as any).rejectRework ?? (cfg as any)?.userConfig?.rejectRework,
        nextStep: typeof mergeIdx === 'number' ? mergeIdx : null
      }

      if (decisionMode === 'USER') {
        const userCfg: any = cfg.userConfig || {}
        decisionStep.userConfig = {
          userDecisionType: userCfg.userDecisionType,
          title: userCfg.title,
          message: userCfg.message,
          assignment: userCfg.assignment ?? { targets: null, assignmentMode: AssignmentMode.CLAIM },
          options: Array.isArray(userCfg.options) ? userCfg.options : [],
          timeoutMinutes: userCfg.timeoutMinutes,
          escalation: userCfg.escalation,
          rejectRework: userCfg.rejectRework
        }
      }
      if (decisionMode === 'AI') {
        const aiCfg: any = cfg.aiConfig || {}
        decisionStep.aiConfig = {
          executor: aiCfg.executor ?? 'EVERYAI',
          promptId: aiCfg.promptId,
          promptName: aiCfg.promptName,
          promptVersion: aiCfg.promptVersion,
          promptUserContent: aiCfg.promptUserContent,
          policyDocumentId: aiCfg.policyDocumentId,
          policyDocumentTitle: aiCfg.policyDocumentTitle,
          policyDocumentVersion: aiCfg.policyDocumentVersion,
          instructions: aiCfg.instructions,
          humanInstructions: aiCfg.humanInstructions ?? '',
          mapping: aiCfg.mapping,
          systemParamsMap: aiCfg.systemParamsMap,
          userParamsMap: aiCfg.userParamsMap,
          reasoningPath: aiCfg.reasoningPath,
          escalation: aiCfg.escalation
        }
      }
      if (decisionMode === 'LOGIC') {
        const raw = cfg.logicConfig
        decisionStep.logicConfig =
          raw && typeof raw === 'object'
            ? { ...raw, conditions: Array.isArray(raw.conditions) ? raw.conditions : [] }
            : { conditions: [] }
      }

      steps.push(decisionStep as FlowStep)
      continue
    }

    if (cfg.nodeType === 'fork') {
      const branchEdges = (forwardOutgoingBySource.get(node.id) ?? []).filter(e => e.source === node.id)
      const parallelBranches = branchEdges.map((edge, i) => ({
        id: edge.id,
        label: edge.label ?? `Branch ${i + 1}`,
        steps: [edge.target]
      }))
      const matchingJoinNode = nodes.find(
        candidateNode =>
          candidateNode.type === 'join' &&
          (candidateNode.config as any)?.nodeType === 'join' &&
          (candidateNode.config as any)?.forkReference === node.id
      )
      const joinStepIndex = matchingJoinNode ? nodeIdToStepIndex.get(matchingJoinNode.id) : undefined

      const forkStep: any = {
        id: node.id,
        reference: node.id,
        type: 'FORK',
        title: node.label || 'Parallel Split',
        parallelBranches,
        nextStep: typeof joinStepIndex === 'number' ? joinStepIndex : null
      }

      steps.push(forkStep as FlowStep)
      continue
    }

    if (cfg.nodeType === 'join') {
      const joinCondition = cfg.joinCondition === 'ANY' ? 'ALL' : (cfg.joinCondition ?? 'ALL')
      const joinStep: any = {
        id: node.id,
        reference: node.id,
        type: 'JOIN',
        title: node.label || 'Parallel Merge',
        joinCondition,
        forkReference: cfg.forkReference
      }
      steps.push(joinStep as FlowStep)
      continue
    }
  }

  // Derive linear nextStep from forward edges for simple nodes (task/join).
  for (const node of stepNodes) {
    const idx = nodeIdToStepIndex.get(node.id)
    if (typeof idx !== 'number') continue
    const step: any = steps[idx]
    if (!step) continue

    const cfg: any = node.config
    if (cfg?.nodeType === 'decision' || cfg?.nodeType === 'fork') continue

    const outgoing = forwardOutgoingBySource.get(node.id) ?? []
    const next = firstOrNull(outgoing)
    if (!next) {
      step.nextStep = null
      continue
    }
    const targetIdx = nodeIdToStepIndex.get(next.target)
    step.nextStep = next.target === endId ? null : typeof targetIdx === 'number' ? targetIdx : null
  }

  return {
    type: 'TEMPLATE',
    name,
    description: description || '',
    version: version ?? 1,
    steps,
    ...(start ? { start } : {}),
    ...(summaryFields ? ({ summaryFields } as any) : {}),
    tags: tags && Object.keys(tags).length > 0 ? tags : undefined
  } as FlowTemplate
}

/**
 * Convert a FlowTemplate from the backend to studio graph nodes and edges.
 * Reconstructs a start node, task nodes, and an end node.
 */
export function templateToStudioGraph(template: FlowTemplate): {
  nodes: StudioNode[]
  edges: FlowGraphEdge[]
} {
  const nodes: StudioNode[] = []
  const edges: FlowGraphEdge[] = []

  const steps: any[] = Array.isArray((template as any).steps) ? ((template as any).steps as any[]) : []
  const stepNodeIdByIndex = new Map<number, string>()

  // Start node
  const startTriggers: any[] = Array.isArray(template.start?.triggers) ? (template.start!.triggers as any[]) : []
  const activeTrigger =
    startTriggers.find(t => t && (t.active === undefined || t.active === true)) ?? startTriggers[0] ?? null
  const activeTriggerType = safeString(activeTrigger?.type || 'MANUAL_FORM')
  const activeTriggerConfig: any =
    activeTrigger?.config && typeof activeTrigger.config === 'object' ? activeTrigger.config : {}

  const startNode: StudioNode = {
    id: START_ID,
    type: 'start',
    label: 'Start',
    config: {
      nodeType: 'start',
      triggerType: activeTriggerType as any,
      form: (template.start as any)?.form ?? (template as any)?.initStep?.form ?? [],
      webhookConfig:
        activeTriggerType === 'WEBHOOK'
          ? { url: activeTriggerConfig.url, secret: activeTriggerConfig.secret }
          : undefined,
      eventConfig:
        activeTriggerType === 'EVENT'
          ? { eventType: activeTriggerConfig.eventType, filter: activeTriggerConfig.filter }
          : undefined,
      scheduleConfig:
        activeTriggerType === 'SCHEDULE'
          ? { cron: activeTriggerConfig.cron, timezone: activeTriggerConfig.timezone }
          : undefined
    } as any
  }
  nodes.push(startNode)

  // Step nodes
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] ?? {}
    const nodeId = safeString(step.reference || step.id || `step_${i}`)
    stepNodeIdByIndex.set(i, nodeId)

    const type = safeString(step.type || 'TASK')

    if (type === 'DECISION') {
      const node: StudioNode = {
        id: nodeId,
        type: 'decision',
        label: safeString(step.title || 'Decision'),
        config: {
          nodeType: 'decision',
          decisionMode: safeString(step.decisionMode || 'USER') as any,
          links: Array.isArray(step.links) ? step.links : [],
          branches: [],
          defaultBranch: step.defaultBranch,
          rejectRework: (step as any).rejectRework ?? (step as any)?.userConfig?.rejectRework,
          userConfig: step.userConfig,
          aiConfig: step.aiConfig,
          logicConfig: step.logicConfig
        } as any
      }
      nodes.push(node)
      continue
    }

    if (type === 'FORK') {
      const node: StudioNode = {
        id: nodeId,
        type: 'fork',
        label: safeString(step.title || 'Parallel Split'),
        config: {
          nodeType: 'fork',
          branches: Array.isArray(step.parallelBranches) ? step.parallelBranches : []
        } as any
      }
      nodes.push(node)
      continue
    }

    if (type === 'JOIN') {
      const node: StudioNode = {
        id: nodeId,
        type: 'join',
        label: safeString(step.title || 'Parallel Merge'),
        config: {
          nodeType: 'join',
          joinCondition: step.joinCondition === 'ANY' ? 'ALL' : (step.joinCondition ?? 'ALL'),
          forkReference: safeString(step.forkReference || '')
        } as any
      }
      nodes.push(node)
      continue
    }

    // Backend AI sends GATEWAY for conditional routing; map to decision node (LOGIC) so branch edges are created
    if (type === 'GATEWAY') {
      const branchList: any[] = Array.isArray(step.branches) ? step.branches : []
      const branches = branchList.map((b: any, bi: number) => {
        const nextStepIdx = typeof b?.nextStep === 'number' ? b.nextStep : null
        const targetId = nextStepIdx != null ? stepNodeIdByIndex.get(nextStepIdx) : undefined
        return {
          id: b?.id || `gw_${i}_${bi}`,
          label: b?.label ?? `Branch ${bi + 1}`,
          condition: typeof b?.condition === 'string' ? b.condition : '',
          nextStep: nextStepIdx ?? undefined,
          targetStepReference: targetId ?? ''
        }
      })
      const logicConditions = branches
        .filter(branch => typeof branch.id === 'string' && typeof branch.condition === 'string')
        .map(branch => ({
          expression: branch.condition,
          branchId: branch.id
        }))
      const configuredDefaultBranchId = safeString(step.defaultBranch || '')
      const node: StudioNode = {
        id: nodeId,
        type: 'decision',
        label: safeString(step.title || 'Decision'),
        config: {
          nodeType: 'decision',
          decisionMode: 'LOGIC',
          links: [],
          branches,
          defaultBranch:
            configuredDefaultBranchId && branches.some(branch => branch.id === configuredDefaultBranchId)
              ? configuredDefaultBranchId
              : branches[0]?.id,
          logicConfig: { conditions: logicConditions }
        } as any
      }
      nodes.push(node)
      continue
    }

    // Task-like node (includes system tasks)
    const node: StudioNode = {
      id: nodeId,
      type: 'task',
      label: safeString(step.title || `Step ${i + 1}`),
      config: {
        nodeType: 'task',
        stepType: step.type,
        kind:
          step.kind ??
          (['FUNCTION', 'AI_AGENT', 'AI_TASK_EXPERT', 'CUSTOM_DATA_MUTATION'].includes(type) ? 'SYSTEM' : 'USER'),
        title: step.title,
        message: step.message,
        form: step.form ?? [],
        links: Array.isArray(step.links) ? step.links : [],
        assignment: step.assignment ?? { targets: null, assignmentMode: AssignmentMode.CLAIM },
        dueInMinutes: step.dueInMinutes,
        defaultPriority: step.defaultPriority,
        customStates: step.customStates,
        functionConfig: step.functionConfig
          ? {
              ...step.functionConfig,
              ...(step.aiAgentConfig?.resultSchema ? { outputSchema: step.aiAgentConfig.resultSchema } : {})
            }
          : undefined,
        agentConfig:
          step.agentConfig || step.aiAgentConfig?.resultSchema
            ? {
                ...(step.agentConfig ?? {}),
                ...(step.aiAgentConfig?.resultSchema ? { outputSchema: step.aiAgentConfig.resultSchema } : {})
              }
            : undefined,
        eventSubscriptions: step.eventSubscriptions,
        reworkConfig: step.reworkConfig,
        permissionContext: step.permissionContext,
        simpleAIConfig: step.simpleAIConfig
      } as any
    }
    nodes.push(node)
  }

  // End node
  const endNode: StudioNode = {
    id: END_ID,
    type: 'end',
    label: 'End',
    config: {
      nodeType: 'end',
      summaryFields: (template as any).summaryFields ?? []
    } as any
  }
  nodes.push(endNode)

  // Start -> first step
  if (steps.length > 0) {
    edges.push({
      id: `e_${START_ID}_0`,
      source: START_ID,
      target: stepNodeIdByIndex.get(0)!,
      direction: 'forward'
    } as any)
  } else {
    edges.push({ id: `e_${START_ID}_${END_ID}`, source: START_ID, target: END_ID, direction: 'forward' } as any)
  }

  // Branch edges + linear edges
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] ?? {}
    const type = safeString(step.type || 'TASK')
    const sourceId = stepNodeIdByIndex.get(i)!

    if (type === 'DECISION' || type === 'GATEWAY') {
      const branches: any[] = Array.isArray(step.branches) ? step.branches : []
      const rejectRework: any = (step as any)?.rejectRework ?? (step as any)?.userConfig?.rejectRework
      for (const b of branches) {
        const targetRef = safeString(b?.targetStepReference || '')
        const targetIndex = typeof b?.nextStep === 'number' ? b.nextStep : null
        const targetId =
          targetRef || (typeof targetIndex === 'number' ? stepNodeIdByIndex.get(targetIndex) : undefined) || END_ID

        const targetStepIdx = targetRef
          ? steps.findIndex((s: any) => safeString(s?.reference || s?.id || '') === targetRef)
          : -1
        const isBackward =
          (typeof targetIndex === 'number' && targetIndex < i) || (targetStepIdx >= 0 && targetStepIdx < i)
        const direction = targetId === END_ID ? 'forward' : isBackward ? 'backward' : 'forward'

        const isRejectBranch =
          safeString(b?.label || '').toLowerCase() === 'reject' || safeString(b?.id || '').toLowerCase() === 'reject'
        const reworkMeta =
          rejectRework && isRejectBranch
            ? {
                reworkReason: 'Rejected',
                rework: {
                  targetNodeId: rejectRework.targetNodeId,
                  requireReason: Boolean(rejectRework.requireReason),
                  preserveData: rejectRework.preserveData !== false,
                  maxIterations: rejectRework.maxIterations
                }
              }
            : undefined

        const edgeId = type === 'GATEWAY' ? `gw_${i}_${targetId}` : `dec_${i}_${targetId}`
        edges.push({
          id: safeString(b?.id || edgeId),
          source: sourceId,
          target: targetId,
          label: b?.label,
          direction,
          metadata: {
            ...(b?.condition ? { condition: b.condition } : {}),
            ...(reworkMeta ?? {})
          }
        } as any)
      }
      continue
    }

    if (type === 'FORK') {
      const branches: any[] = Array.isArray(step.parallelBranches) ? step.parallelBranches : []
      for (const b of branches) {
        const startRef = Array.isArray(b?.steps) ? safeString(b.steps[0]) : ''
        const targetId = startRef || END_ID
        edges.push({
          id: safeString(b?.id || `fork_${i}_${targetId}`),
          source: sourceId,
          target: targetId,
          label: b?.label,
          direction: 'forward'
        } as any)
      }
      continue
    }

    // Linear next
    const nextIdx =
      step.nextStep === null
        ? null
        : typeof step.nextStep === 'number'
          ? step.nextStep
          : i + 1 < steps.length
            ? i + 1
            : null
    const targetId = nextIdx === null ? END_ID : (stepNodeIdByIndex.get(nextIdx) ?? END_ID)
    edges.push({
      id: `e_${i}_${nextIdx === null ? 'end' : nextIdx}`,
      source: sourceId,
      target: targetId,
      direction: 'forward'
    } as any)
  }

  const normalized = normalizeGraph(nodes, edges)
  return { nodes: normalized.nodes, edges: normalized.edges }
}
