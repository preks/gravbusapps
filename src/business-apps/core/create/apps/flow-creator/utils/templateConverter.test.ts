import { studioGraphToTemplate, templateToStudioGraph } from './templateConverter'
import type { StudioNode } from '../types/studioTypes'
import type { FlowGraphEdge } from '@/common/components/flow/flow-viewer'
import { START_ID, END_ID } from './graphStoreUtils'
import { FlowStepType } from '@/common/data/flow/types/flowTemplate'
import { AssignmentMode } from '@/common/network/flows/FlowTemplateClient'

function makeStartNode(partial?: Partial<StudioNode>): StudioNode {
  return {
    id: START_ID,
    type: 'start',
    label: 'Start',
    config: {
      nodeType: 'start',
      triggerType: 'MANUAL_FORM',
      form: []
    } as any,
    ...(partial ?? {})
  }
}

function makeEndNode(partial?: Partial<StudioNode>): StudioNode {
  return {
    id: END_ID,
    type: 'end',
    label: 'End',
    config: {
      nodeType: 'end',
      summaryFields: []
    } as any,
    ...(partial ?? {})
  }
}

function makeTaskNode(id: string, title: string): StudioNode {
  return {
    id,
    type: 'task',
    label: title,
    config: {
      nodeType: 'task',
      stepType: FlowStepType.TASK,
      kind: 'USER',
      title,
      message: '',
      form: [],
      assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM }
    } as any
  }
}

function makeDecisionNode(id: string, label: string): StudioNode {
  return {
    id,
    type: 'decision',
    label,
    config: {
      nodeType: 'decision',
      decisionMode: 'USER',
      links: [],
      branches: [],
      userConfig: {
        assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM },
        options: [
          { id: 'approve', label: 'Approve' },
          { id: 'reject', label: 'Reject' }
        ]
      }
    } as any
  }
}

function makeForkNode(id: string, label: string): StudioNode {
  return {
    id,
    type: 'fork',
    label,
    config: {
      nodeType: 'fork',
      branches: []
    } as any
  }
}

function makeJoinNode(id: string, label: string, forkReference: string): StudioNode {
  return {
    id,
    type: 'join',
    label,
    config: {
      nodeType: 'join',
      joinCondition: 'ALL',
      forkReference
    } as any
  }
}

describe('templateConverter', () => {
  it('serializes DECISION nodes into template.steps', () => {
    const nodes: StudioNode[] = [
      makeStartNode(),
      makeTaskNode('taskA', 'Task A'),
      {
        ...makeDecisionNode('dec1', 'Decision'),
        config: {
          ...makeDecisionNode('dec1', 'Decision').config,
          links: [{ type: 'URL', name: 'Policy', url: 'https://example.com/policy' }]
        } as any
      },
      makeTaskNode('taskB', 'Task B'),
      makeTaskNode('taskC', 'Task C'),
      makeEndNode({
        config: { nodeType: 'end', summaryFields: [{ label: 'Result', value: 'x', visibility: 'PUBLIC' }] } as any
      })
    ]

    const edges: FlowGraphEdge[] = [
      { id: 'e-start-a', source: START_ID, target: 'taskA', direction: 'forward' } as any,
      { id: 'e-a-dec', source: 'taskA', target: 'dec1', direction: 'forward' } as any,
      { id: 'b1', source: 'dec1', target: 'taskB', direction: 'forward', label: 'Approve' } as any,
      { id: 'b2', source: 'dec1', target: 'taskC', direction: 'forward', label: 'Reject' } as any,
      { id: 'e-b-end', source: 'taskB', target: END_ID, direction: 'forward' } as any,
      { id: 'e-c-end', source: 'taskC', target: END_ID, direction: 'forward' } as any
    ]

    const template = studioGraphToTemplate(nodes, edges, 'My Flow', 'desc', {}, 1) as any
    expect(Array.isArray(template.steps)).toBe(true)
    expect(template.steps.some((s: any) => s.type === 'DECISION')).toBe(true)

    const decision = template.steps.find((s: any) => s.type === 'DECISION')
    expect(decision).toBeTruthy()
    expect(Array.isArray(decision.branches)).toBe(true)
    expect(decision.branches).toHaveLength(2)
    expect(decision.branches.map((b: any) => b.id).sort()).toEqual(['b1', 'b2'])
    expect(decision.links).toEqual([{ type: 'URL', name: 'Policy', url: 'https://example.com/policy' }])

    // Summary fields must persist at template level.
    expect(Array.isArray(template.summaryFields)).toBe(true)
    expect(template.summaryFields).toHaveLength(1)
  })

  it('serializes FORK/JOIN nodes into template.steps', () => {
    const forkId = 'fork1'
    const joinId = 'join1'

    const nodes: StudioNode[] = [
      makeStartNode(),
      makeForkNode(forkId, 'Fork'),
      makeTaskNode('b1', 'Branch 1 task'),
      makeTaskNode('b2', 'Branch 2 task'),
      makeJoinNode(joinId, 'Join', forkId),
      makeEndNode()
    ]

    const edges: FlowGraphEdge[] = [
      { id: 'e-start-fork', source: START_ID, target: forkId, direction: 'forward' } as any,
      { id: 'fb1', source: forkId, target: 'b1', direction: 'forward', label: 'Branch 1' } as any,
      { id: 'fb2', source: forkId, target: 'b2', direction: 'forward', label: 'Branch 2' } as any,
      { id: 'e-b1-join', source: 'b1', target: joinId, direction: 'forward' } as any,
      { id: 'e-b2-join', source: 'b2', target: joinId, direction: 'forward' } as any,
      { id: 'e-join-end', source: joinId, target: END_ID, direction: 'forward' } as any
    ]

    const template = studioGraphToTemplate(nodes, edges, 'Parallel Flow') as any
    expect(template.steps.some((s: any) => s.type === 'FORK')).toBe(true)
    expect(template.steps.some((s: any) => s.type === 'JOIN')).toBe(true)

    const fork = template.steps.find((s: any) => s.type === 'FORK')
    expect(Array.isArray(fork.parallelBranches)).toBe(true)
    expect(fork.parallelBranches).toHaveLength(2)
    expect(fork.parallelBranches.map((b: any) => b.id).sort()).toEqual(['fb1', 'fb2'])
    expect(fork.nextStep).toBe(template.steps.findIndex((s: any) => s.type === 'JOIN'))

    const join = template.steps.find((s: any) => s.type === 'JOIN')
    expect(join.forkReference).toBe(forkId)
  })

  it('maps GATEWAY steps to logic decisions with conditions preserved across import and save', () => {
    const gatewayTemplate = {
      type: 'TEMPLATE',
      name: 'Gateway Flow',
      version: 1,
      steps: [
        {
          reference: 'gateway-1',
          type: 'GATEWAY',
          title: 'Gateway',
          defaultBranch: 'reject-branch',
          branches: [
            {
              id: 'approve-branch',
              label: 'Approve',
              condition: "$steps.self.resultData.decisionResult == 'approve'",
              nextStep: 1
            },
            {
              id: 'reject-branch',
              label: 'Reject',
              condition: "$steps.self.resultData.decisionResult == 'reject'",
              nextStep: 2
            }
          ]
        },
        {
          reference: 'approve-task',
          type: 'TASK',
          title: 'Approve task',
          nextStep: null
        },
        {
          reference: 'reject-task',
          type: 'TASK',
          title: 'Reject task',
          nextStep: null
        }
      ]
    } as any

    const rebuilt = templateToStudioGraph(gatewayTemplate)
    const rebuiltDecisionNode = rebuilt.nodes.find(node => node.id === 'gateway-1') as any

    expect(rebuiltDecisionNode.config.decisionMode).toBe('LOGIC')
    expect(rebuiltDecisionNode.config.defaultBranch).toBe('reject-branch')
    expect(rebuiltDecisionNode.config.logicConfig.conditions).toEqual([
      {
        expression: "$steps.self.resultData.decisionResult == 'approve'",
        branchId: 'approve-branch'
      },
      {
        expression: "$steps.self.resultData.decisionResult == 'reject'",
        branchId: 'reject-branch'
      }
    ])

    const roundTrippedTemplate = studioGraphToTemplate(rebuilt.nodes, rebuilt.edges, 'Gateway Flow') as any
    const roundTrippedDecisionStep = roundTrippedTemplate.steps.find((step: any) => step.reference === 'gateway-1')

    expect(roundTrippedDecisionStep.type).toBe('DECISION')
    expect(roundTrippedDecisionStep.decisionMode).toBe('LOGIC')
    expect(roundTrippedDecisionStep.logicConfig.conditions).toEqual([
      {
        expression: "$steps.self.resultData.decisionResult == 'approve'",
        branchId: 'approve-branch'
      },
      {
        expression: "$steps.self.resultData.decisionResult == 'reject'",
        branchId: 'reject-branch'
      }
    ])
    expect(roundTrippedDecisionStep.branches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'approve-branch',
          condition: "$steps.self.resultData.decisionResult == 'approve'"
        }),
        expect.objectContaining({
          id: 'reject-branch',
          condition: "$steps.self.resultData.decisionResult == 'reject'"
        })
      ])
    )
  })

  it('round-trips control-flow steps without dropping node types', () => {
    const nodes: StudioNode[] = [
      makeStartNode(),
      makeTaskNode('a', 'A'),
      makeDecisionNode('d', 'D'),
      makeTaskNode('b', 'B'),
      makeTaskNode('c', 'C'),
      makeEndNode()
    ]
    const edges: FlowGraphEdge[] = [
      { id: 'e-start-a', source: START_ID, target: 'a', direction: 'forward' } as any,
      { id: 'e-a-d', source: 'a', target: 'd', direction: 'forward' } as any,
      { id: 'br1', source: 'd', target: 'b', direction: 'forward', label: 'Approve' } as any,
      { id: 'br2', source: 'd', target: 'c', direction: 'forward', label: 'Reject' } as any,
      { id: 'e-b-end', source: 'b', target: END_ID, direction: 'forward' } as any,
      { id: 'e-c-end', source: 'c', target: END_ID, direction: 'forward' } as any
    ]

    const template = studioGraphToTemplate(nodes, edges, 'Roundtrip') as any
    const rebuilt = templateToStudioGraph(template)

    const types = rebuilt.nodes.map(n => n.type)
    expect(types).toContain('decision')
    expect(types).toContain('task')
    expect(types).toContain('start')
    expect(types).toContain('end')
  })

  it('round-trips decision links across save and load', () => {
    const decisionNode = makeDecisionNode('d', 'D')
    ;(decisionNode.config as any).decisionMode = 'AI'
    ;(decisionNode.config as any).aiConfig = {
      executor: 'EVERYAI',
      humanInstructions: '',
      escalation: {
        mode: 'USER',
        assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM }
      }
    }
    ;(decisionNode.config as any).links = [{ type: 'URL', name: 'Guide', url: 'https://example.com/guide' }]

    const nodes: StudioNode[] = [
      makeStartNode(),
      decisionNode,
      makeTaskNode('b', 'B'),
      makeTaskNode('c', 'C'),
      makeEndNode()
    ]
    const edges: FlowGraphEdge[] = [
      { id: 'e-start-d', source: START_ID, target: 'd', direction: 'forward' } as any,
      { id: 'br1', source: 'd', target: 'b', direction: 'forward', label: 'Approve' } as any,
      { id: 'br2', source: 'd', target: 'c', direction: 'forward', label: 'Reject' } as any,
      { id: 'e-b-end', source: 'b', target: END_ID, direction: 'forward' } as any,
      { id: 'e-c-end', source: 'c', target: END_ID, direction: 'forward' } as any
    ]

    const template = studioGraphToTemplate(nodes, edges, 'Decision Links') as any
    const rebuilt = templateToStudioGraph(template)
    const rebuiltDecision = rebuilt.nodes.find(n => n.id === 'd') as any

    expect(template.steps.find((s: any) => s.id === 'd')?.links).toEqual([
      { type: 'URL', name: 'Guide', url: 'https://example.com/guide' }
    ])
    expect(rebuiltDecision.config.links).toEqual([{ type: 'URL', name: 'Guide', url: 'https://example.com/guide' }])
  })

  it('persists decision task expert param mappings across save and load', () => {
    const decisionNode = makeDecisionNode('d-taskexpert', 'Decision Task Expert')
    ;(decisionNode.config as any).decisionMode = 'AI'
    ;(decisionNode.config as any).aiConfig = {
      executor: 'TASK_EXPERT',
      promptId: 'prompt-123',
      promptName: 'Warranty Decision Expert',
      promptVersion: 4,
      promptUserContent: 'Context: {context}\nSerial: {serial}',
      systemParamsMap: {
        tenantName: '{{$workflow.context.tenantName}}'
      },
      userParamsMap: {
        context: '{{$workflow.input}}',
        serial: '{{$workflow.input.serial}}'
      },
      humanInstructions: 'Please review the AI decision.',
      mapping: {
        conditions: [{ expression: "$steps.self.resultData.decisionResult == 'approve'", branchId: 'approve-branch' }]
      },
      escalation: {
        mode: 'USER',
        assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM }
      }
    }

    const nodes: StudioNode[] = [
      makeStartNode(),
      decisionNode,
      makeTaskNode('approve', 'Approved'),
      makeTaskNode('reject', 'Rejected'),
      makeEndNode()
    ]
    const edges: FlowGraphEdge[] = [
      { id: 'e-start-d', source: START_ID, target: 'd-taskexpert', direction: 'forward' } as any,
      {
        id: 'approve-branch',
        source: 'd-taskexpert',
        target: 'approve',
        direction: 'forward',
        label: 'Approve'
      } as any,
      { id: 'reject-branch', source: 'd-taskexpert', target: 'reject', direction: 'forward', label: 'Reject' } as any,
      { id: 'e-approve-end', source: 'approve', target: END_ID, direction: 'forward' } as any,
      { id: 'e-reject-end', source: 'reject', target: END_ID, direction: 'forward' } as any
    ]

    const template = studioGraphToTemplate(nodes, edges, 'Decision Task Expert') as any
    expect(template.steps[0].aiConfig.systemParamsMap).toEqual({
      tenantName: '{{$workflow.context.tenantName}}'
    })
    expect(template.steps[0].aiConfig.userParamsMap).toEqual({
      context: '{{$workflow.input}}',
      serial: '{{$workflow.input.serial}}'
    })

    const rebuilt = templateToStudioGraph(template)
    const rebuiltDecision = rebuilt.nodes.find(n => n.id === 'd-taskexpert') as any
    expect(rebuiltDecision.config.aiConfig.systemParamsMap).toEqual({
      tenantName: '{{$workflow.context.tenantName}}'
    })
    expect(rebuiltDecision.config.aiConfig.userParamsMap).toEqual({
      context: '{{$workflow.input}}',
      serial: '{{$workflow.input.serial}}'
    })
  })

  it('persists function output schema and pinned version across save/load', () => {
    const functionSchema = {
      type: 'object',
      properties: {
        result: { type: 'string' }
      }
    }
    const nodes: StudioNode[] = [
      makeStartNode(),
      {
        ...makeTaskNode('fn1', 'Function Step'),
        config: {
          nodeType: 'task',
          stepType: FlowStepType.FUNCTION,
          kind: 'SYSTEM',
          title: 'Function Step',
          message: '',
          form: [],
          assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM },
          functionConfig: {
            functionId: 'function-123',
            version: 7,
            outputSchema: functionSchema
          }
        } as any
      },
      makeEndNode()
    ]
    const edges: FlowGraphEdge[] = [
      { id: 'e-start-fn', source: START_ID, target: 'fn1', direction: 'forward' } as any,
      { id: 'e-fn-end', source: 'fn1', target: END_ID, direction: 'forward' } as any
    ]

    const template = studioGraphToTemplate(nodes, edges, 'Function Flow') as any
    expect(template.steps[0].functionConfig.version).toBe(7)
    expect(template.steps[0].aiAgentConfig?.resultSchema).toEqual(functionSchema)

    const rebuilt = templateToStudioGraph(template)
    const rebuiltFunction = rebuilt.nodes.find(n => n.id === 'fn1') as any
    expect(rebuiltFunction.config.functionConfig.version).toBe(7)
    expect(rebuiltFunction.config.functionConfig.outputSchema).toEqual(functionSchema)
  })

  it('persists task expert output schema and pinned version across save/load', () => {
    const expertSchema = {
      type: 'object',
      properties: {
        decision: { type: 'string' }
      }
    }
    const nodes: StudioNode[] = [
      makeStartNode(),
      {
        ...makeTaskNode('expert1', 'Task Expert Step'),
        config: {
          nodeType: 'task',
          stepType: FlowStepType.AI_TASK_EXPERT,
          kind: 'SYSTEM',
          title: 'Task Expert Step',
          message: '',
          form: [],
          assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM },
          agentConfig: {
            promptId: 'prompt-123',
            version: 3,
            outputSchema: expertSchema
          }
        } as any
      },
      makeEndNode()
    ]
    const edges: FlowGraphEdge[] = [
      { id: 'e-start-expert', source: START_ID, target: 'expert1', direction: 'forward' } as any,
      { id: 'e-expert-end', source: 'expert1', target: END_ID, direction: 'forward' } as any
    ]

    const template = studioGraphToTemplate(nodes, edges, 'Expert Flow') as any
    expect(template.steps[0].agentConfig.version).toBe(3)
    expect(template.steps[0].aiAgentConfig?.resultSchema).toEqual(expertSchema)

    const rebuilt = templateToStudioGraph(template)
    const rebuiltExpert = rebuilt.nodes.find(n => n.id === 'expert1') as any
    expect(rebuiltExpert.config.agentConfig.version).toBe(3)
    expect(rebuiltExpert.config.agentConfig.outputSchema).toEqual(expertSchema)
  })
})
