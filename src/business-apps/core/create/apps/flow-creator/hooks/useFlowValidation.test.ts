import type { StudioNode } from '../types/studioTypes'
import type { FlowGraphEdge } from '@/common/components/flow/flow-viewer'
import { START_ID, END_ID } from '../utils/graphStoreUtils'
import { AssignmentMode } from '@/common/network/flows/FlowTemplateClient'
import { validateFlow } from './useFlowValidation'

function makeStartNode(): StudioNode {
  return {
    id: START_ID,
    type: 'start',
    label: 'Start',
    config: {
      nodeType: 'start',
      triggerType: 'MANUAL_FORM',
      form: []
    } as any
  }
}

function makeEndNode(): StudioNode {
  return {
    id: END_ID,
    type: 'end',
    label: 'End',
    config: {
      nodeType: 'end',
      summaryFields: []
    } as any
  }
}

function makeTaskNode(id: string, label: string): StudioNode {
  return {
    id,
    type: 'task',
    label,
    config: {
      nodeType: 'task',
      stepType: 'TASK',
      kind: 'USER',
      title: label,
      message: '',
      form: [],
      assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM }
    } as any
  }
}

function makeDecisionTaskExpertNode(userParamsMap?: Record<string, string>): StudioNode {
  return {
    id: 'decision-ai',
    type: 'decision',
    label: 'AI Decision',
    config: {
      nodeType: 'decision',
      decisionMode: 'AI',
      branches: [
        { id: 'approve-branch', label: 'Approve' },
        { id: 'reject-branch', label: 'Reject' }
      ],
      defaultBranch: 'approve-branch',
      aiConfig: {
        executor: 'TASK_EXPERT',
        promptId: 'prompt-123',
        promptName: 'Warranty Decision Expert',
        promptVersion: 3,
        promptUserContent: 'Context: {context}\nSerial: {serial}',
        userParamsMap,
        systemParamsMap: {},
        mapping: {
          conditions: [{ expression: "$steps.self.resultData.decisionResult == 'approve'", branchId: 'approve-branch' }]
        },
        humanInstructions: 'Please review the decision.',
        escalation: {
          mode: 'USER',
          assignment: { targets: { users: ['ANY'] }, assignmentMode: AssignmentMode.CLAIM }
        }
      }
    } as any
  }
}

function makeLogicDecisionNode(conditions: Array<{ expression: string; branchId: string }> = []): StudioNode {
  return {
    id: 'decision-logic',
    type: 'decision',
    label: 'Logic Decision',
    config: {
      nodeType: 'decision',
      decisionMode: 'LOGIC',
      branches: [
        { id: 'approve-branch', label: 'Approve' },
        { id: 'reject-branch', label: 'Reject' }
      ],
      defaultBranch: 'approve-branch',
      logicConfig: { conditions }
    } as any
  }
}

function makeEdges(): FlowGraphEdge[] {
  return [
    { id: 'e-start-decision', source: START_ID, target: 'decision-ai', direction: 'forward' } as any,
    { id: 'approve-branch', source: 'decision-ai', target: 'approved', direction: 'forward', label: 'Approve' } as any,
    { id: 'reject-branch', source: 'decision-ai', target: 'rejected', direction: 'forward', label: 'Reject' } as any,
    { id: 'e-approved-end', source: 'approved', target: END_ID, direction: 'forward' } as any,
    { id: 'e-rejected-end', source: 'rejected', target: END_ID, direction: 'forward' } as any
  ]
}

describe('validateFlow', () => {
  it('flags unmapped decision task expert prompt parameters', () => {
    const issues = validateFlow(
      [
        makeStartNode(),
        makeDecisionTaskExpertNode({
          context: '{{$workflow.input}}',
          serial: ''
        }),
        makeTaskNode('approved', 'Approved'),
        makeTaskNode('rejected', 'Rejected'),
        makeEndNode()
      ],
      makeEdges()
    )

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'decision-ai',
          rule: 'decision-taskexpert-param-mapping'
        })
      ])
    )
  })

  it('accepts decision task experts when all prompt parameters are mapped', () => {
    const issues = validateFlow(
      [
        makeStartNode(),
        makeDecisionTaskExpertNode({
          context: '{{$workflow.input}}',
          serial: '{{$workflow.input.serial}}'
        }),
        makeTaskNode('approved', 'Approved'),
        makeTaskNode('rejected', 'Rejected'),
        makeEndNode()
      ],
      makeEdges()
    )

    expect(issues.some(issue => issue.rule === 'decision-taskexpert-param-mapping')).toBe(false)
  })

  it('blocks logic decisions without conditions', () => {
    const issues = validateFlow(
      [makeStartNode(), makeLogicDecisionNode(), makeEndNode()],
      [
        { id: 'e-start-decision', source: START_ID, target: 'decision-logic', direction: 'forward' } as any,
        {
          id: 'approve-branch',
          source: 'decision-logic',
          target: END_ID,
          direction: 'forward',
          label: 'Approve'
        } as any,
        { id: 'reject-branch', source: 'decision-logic', target: END_ID, direction: 'forward', label: 'Reject' } as any
      ]
    )

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'decision-logic',
          severity: 'error',
          rule: 'logic-decision-needs-condition'
        })
      ])
    )
  })

  it('accepts logic decisions with at least one condition', () => {
    const issues = validateFlow(
      [
        makeStartNode(),
        makeLogicDecisionNode([{ expression: '$workflow.input.approved == true', branchId: 'approve-branch' }]),
        makeEndNode()
      ],
      [
        { id: 'e-start-decision', source: START_ID, target: 'decision-logic', direction: 'forward' } as any,
        {
          id: 'approve-branch',
          source: 'decision-logic',
          target: END_ID,
          direction: 'forward',
          label: 'Approve'
        } as any,
        { id: 'reject-branch', source: 'decision-logic', target: END_ID, direction: 'forward', label: 'Reject' } as any
      ]
    )

    expect(issues.some(issue => issue.rule === 'logic-decision-needs-condition')).toBe(false)
  })
})
