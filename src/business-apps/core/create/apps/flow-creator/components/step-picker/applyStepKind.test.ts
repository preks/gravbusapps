import { AssignmentMode, FlowStepType } from '@/common/data/flow/types/flowTemplate'
import type { StudioNode, TaskNodeConfig } from '../../types/studioTypes'
import { createDefaultConfig, createEdge, normalizeGraph } from '../../utils/graphStoreUtils'
import {
  applyStepKindToTaskConfig,
  applyStepKindToNode,
  applyStepKindChange,
  buildDecisionConfigForMode,
  buildDecisionConfigForPayload,
  buildTaskConfigForKind,
  payloadForStepKind,
  syncDecisionEdgesForPayload
} from './applyStepKind'
import { resolveStepKind, resolveStepKindFromStudioNode } from './resolveStepKind'
import type { StepKindId } from './stepKindTypes'

function makeTaskNode(config: Partial<TaskNodeConfig> = {}): StudioNode {
  const base = createDefaultConfig('task') as TaskNodeConfig
  return {
    id: 'task-1',
    type: 'task',
    label: 'Task',
    config: { ...base, ...config }
  }
}

describe('payloadForStepKind', () => {
  it.each<[StepKindId, FlowStepType | 'decision' | 'fork']>([
    ['user-task', FlowStepType.TASK],
    ['approval', 'decision'],
    ['ai-agent', FlowStepType.AI_AGENT],
    ['function', FlowStepType.FUNCTION],
    ['connector', FlowStepType.FUNCTION],
    ['decision-user', 'decision'],
    ['parallelize', 'fork']
  ])('maps %s', (kindId, expected) => {
    const payload = payloadForStepKind(kindId)
    if (expected === 'decision') {
      expect(payload).toMatchObject({ nodeType: 'decision' })
      return
    }
    if (expected === 'fork') {
      expect(payload).toMatchObject({ nodeType: 'fork' })
      return
    }
    expect(payload).toMatchObject({ nodeType: 'task', stepType: expected })
  })

  it('maps approval to user decision preset', () => {
    expect(payloadForStepKind('approval')).toMatchObject({
      nodeType: 'decision',
      decisionMode: 'USER',
      userDecisionPreset: 'APPROVAL'
    })
    expect(payloadForStepKind('decision-user')).toMatchObject({
      nodeType: 'decision',
      decisionMode: 'USER',
      userDecisionPreset: 'CUSTOM'
    })
  })

  it('sets function category hints', () => {
    expect(payloadForStepKind('connector')).toMatchObject({
      functionCategoryHint: 'connectors'
    })
    expect(payloadForStepKind('function')).toMatchObject({
      functionCategoryHint: 'functions'
    })
  })
})

describe('applyStepKindToTaskConfig', () => {
  it('switches user task to function automation with category hint', () => {
    const current = createDefaultConfig('task') as TaskNodeConfig
    const next = applyStepKindToTaskConfig(
      current,
      {
        nodeType: 'task',
        stepType: FlowStepType.FUNCTION,
        functionCategoryHint: 'connectors'
      },
      'advanced'
    )
    expect(next.kind).toBe('SYSTEM')
    expect(next.stepType).toBe(FlowStepType.FUNCTION)
    expect(next.functionConfig?.categoryHint).toBe('connectors')
    expect(next.form).toEqual([])
  })

  it('preserves assignment when staying on user task kinds', () => {
    const current: TaskNodeConfig = {
      ...(createDefaultConfig('task') as TaskNodeConfig),
      stepType: FlowStepType.TASK,
      assignment: {
        targets: { users: ['user-1'] },
        assignmentMode: AssignmentMode.ASSIGN
      }
    }
    const next = applyStepKindToTaskConfig(current, { nodeType: 'task', stepType: FlowStepType.APPROVAL }, 'simple')
    expect(next.kind).toBe('USER')
    expect(next.assignment).toEqual(current.assignment)
  })

  it('clears function selection when switching function category hint', () => {
    const current: TaskNodeConfig = {
      ...(createDefaultConfig('task') as TaskNodeConfig),
      stepType: FlowStepType.FUNCTION,
      functionConfig: {
        functionId: 'fn-1',
        functionName: 'My Fn',
        categoryHint: 'functions'
      }
    }
    const next = applyStepKindToTaskConfig(
      current,
      {
        nodeType: 'task',
        stepType: FlowStepType.FUNCTION,
        functionCategoryHint: 'connectors'
      },
      'advanced'
    )
    expect(next.functionConfig?.functionId).toBe('')
    expect(next.functionConfig?.categoryHint).toBe('connectors')
  })
})

describe('buildDecisionConfigForPayload', () => {
  it('builds approval decision with approve and reject outcomes', () => {
    const config = buildDecisionConfigForPayload({
      nodeType: 'decision',
      decisionMode: 'USER',
      userDecisionPreset: 'APPROVAL'
    })
    expect(config.userConfig?.userDecisionType).toBe('APPROVAL')
    expect(config.branches.map(branch => branch.label)).toEqual(['Approve', 'Reject'])
  })

  it('builds custom decision with option outcomes', () => {
    const config = buildDecisionConfigForPayload({
      nodeType: 'decision',
      decisionMode: 'USER',
      userDecisionPreset: 'CUSTOM'
    })
    expect(config.userConfig?.userDecisionType).toBe('CUSTOM')
    expect(config.branches.map(branch => branch.label)).toEqual(['Option 1', 'Option 2'])
  })
})

describe('applyStepKindToNode', () => {
  it('does not keep task label when switching to approval decision', () => {
    const taskNode = makeTaskNode({ title: 'My custom task title' })
    taskNode.label = 'My custom task title'

    const { node } = applyStepKindToNode(taskNode, 'approval', 'advanced')

    expect(node.type).toBe('decision')
    expect(node.label).toBe('Approval')
    expect((node.config as any).userConfig?.title).toBeUndefined()
  })

  it('does not keep task label when switching to custom decision', () => {
    const taskNode = makeTaskNode({ title: 'My custom task title' })
    taskNode.label = 'My custom task title'

    const { node } = applyStepKindToNode(taskNode, 'decision-user', 'advanced')

    expect(node.type).toBe('decision')
    expect(node.label).toBe('Decision')
  })
})

describe('applyStepKindChange', () => {
  it('syncs edges and config when switching custom decision to approval', () => {
    const node: StudioNode = {
      id: 'decision-1',
      type: 'decision',
      label: 'Decision',
      config: buildDecisionConfigForPayload({
        nodeType: 'decision',
        decisionMode: 'USER',
        userDecisionPreset: 'CUSTOM'
      })
    }
    const edgeA = createEdge('decision-1', 'end_node', 'Option 1')
    const edgeB = createEdge('decision-1', 'end_node', 'Option 2')
    const edges = [createEdge('start_node', 'decision-1'), edgeA, edgeB, createEdge('decision-1', 'end_node')]

    const { node: nextNode, edges: nextEdges } = applyStepKindChange(node, edges, 'approval', 'advanced', {
      endNodeId: 'end_node'
    })
    const normalized = normalizeGraph([nextNode], nextEdges)
    const decision = normalized.nodes.find(n => n.id === 'decision-1')!

    expect(resolveStepKind(decision)).toBe('approval')
    expect(decision.config.userConfig?.userDecisionType).toBe('APPROVAL')
    const outgoingLabels = normalized.edges
      .filter(edge => edge.source === 'decision-1' && edge.direction !== 'backward')
      .map(edge => edge.label)
    expect(outgoingLabels).toEqual(['Approve', 'Reject'])
  })

  it('relabels edges when switching approval to custom decision', () => {
    const node: StudioNode = {
      id: 'decision-1',
      type: 'decision',
      label: 'Approval',
      config: buildDecisionConfigForPayload({
        nodeType: 'decision',
        decisionMode: 'USER',
        userDecisionPreset: 'APPROVAL'
      })
    }
    const edges = [
      createEdge('start_node', 'decision-1'),
      createEdge('decision-1', 'end_node', 'Approve'),
      createEdge('decision-1', 'end_node', 'Reject')
    ]

    const { node: nextNode, edges: nextEdges } = applyStepKindChange(node, edges, 'decision-user', 'advanced', {
      endNodeId: 'end_node'
    })
    const normalized = normalizeGraph([nextNode], nextEdges)
    const decision = normalized.nodes.find(n => n.id === 'decision-1')!

    expect(resolveStepKind(decision)).toBe('decision-user')
    expect(decision.config.userConfig?.userDecisionType).toBe('CUSTOM')
    const outgoingLabels = normalized.edges
      .filter(edge => edge.source === 'decision-1' && edge.direction !== 'backward')
      .map(edge => edge.label)
    expect(outgoingLabels).toEqual(['Option 1', 'Option 2'])
  })
})

describe('syncDecisionEdgesForPayload', () => {
  it('drops surplus branches when approval needs exactly two outcomes', () => {
    const edges = [
      createEdge('decision-1', 'end_node', 'Option 1'),
      createEdge('decision-1', 'end_node', 'Option 2'),
      createEdge('decision-1', 'end_node', 'Option 3')
    ]
    const next = syncDecisionEdgesForPayload(
      'decision-1',
      edges,
      { nodeType: 'decision', decisionMode: 'USER', userDecisionPreset: 'APPROVAL' },
      'end_node'
    )
    const outgoing = next.filter(edge => edge.source === 'decision-1')
    expect(outgoing).toHaveLength(2)
    expect(outgoing.map(edge => edge.label)).toEqual(['Approve', 'Reject'])
  })
})

describe('buildDecisionConfigForMode', () => {
  it('builds AI decision defaults', () => {
    const config = buildDecisionConfigForMode('AI')
    expect(config.decisionMode).toBe('AI')
    expect(config.userConfig).toBeUndefined()
    expect(config.aiConfig?.humanInstructions).toBe('')
  })

  it('builds logic decision defaults', () => {
    const config = buildDecisionConfigForMode('LOGIC')
    expect(config.decisionMode).toBe('LOGIC')
    expect(config.logicConfig?.conditions).toEqual([])
  })
})

describe('resolveStepKind', () => {
  it('resolves legacy approval tasks and approval decisions', () => {
    expect(resolveStepKind(makeTaskNode({ stepType: FlowStepType.APPROVAL }))).toBe('approval')
    expect(
      resolveStepKind({
        id: 'decision-1',
        type: 'decision',
        label: 'Approval',
        config: createDefaultConfig('decision') as any
      })
    ).toBe('approval')
    expect(resolveStepKind(makeTaskNode({ stepType: FlowStepType.AI_AGENT }))).toBe('ai-agent')
  })

  it('resolves connector via hint and selected function', () => {
    expect(
      resolveStepKind(
        makeTaskNode({
          stepType: FlowStepType.FUNCTION,
          functionConfig: { functionId: 'fn-1', categoryHint: 'connectors' }
        })
      )
    ).toBe('connector')

    expect(
      resolveStepKind(makeTaskNode({ stepType: FlowStepType.FUNCTION, functionConfig: { functionId: 'fn-1' } }), {
        connectorEnabled: true
      })
    ).toBe('connector')
  })

  it('roundtrips buildTaskConfigForKind for each task kind', () => {
    const taskKinds: StepKindId[] = [
      'user-task',
      'information',
      'acknowledge',
      'ai-agent',
      'ai-task-expert',
      'function',
      'connector'
    ]
    for (const kindId of taskKinds) {
      const payload = payloadForStepKind(kindId)
      if (payload.nodeType !== 'task') continue
      const config = buildTaskConfigForKind(payload, 'advanced')
      const node = makeTaskNode(config)
      const resolved = resolveStepKindFromStudioNode(node, [])
      expect(resolved).toBe(kindId)
    }
  })

  it('roundtrips approval and custom decision kinds', () => {
    for (const kindId of ['approval', 'decision-user'] as const) {
      const payload = payloadForStepKind(kindId)
      if (payload.nodeType !== 'decision') continue
      const config = buildDecisionConfigForPayload(payload)
      const node: StudioNode = {
        id: 'decision-1',
        type: 'decision',
        label: 'Decision',
        config
      }
      expect(resolveStepKind(node)).toBe(kindId)
    }
  })
})
