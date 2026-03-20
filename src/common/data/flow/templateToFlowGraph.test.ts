import { templateToFlowGraphDefinition } from './templateToFlowGraph'

describe('templateToFlowGraphDefinition', () => {
  it('renders DECISION steps created by flow-creator', () => {
    const definition = templateToFlowGraphDefinition({
      start: {
        triggers: [{ type: 'MANUAL_FORM' }]
      },
      steps: [
        {
          reference: 'task-a',
          type: 'TASK',
          title: 'Task A',
          nextStep: 1
        },
        {
          reference: 'decision-1',
          type: 'DECISION',
          title: 'Decision',
          decisionMode: 'AI',
          branches: [
            {
              id: 'approve',
              label: 'Approve',
              targetStepReference: 'task-b',
              nextStep: 2
            },
            {
              id: 'reject',
              label: 'Reject',
              targetStepReference: 'task-c',
              nextStep: 3
            }
          ]
        },
        {
          reference: 'task-b',
          type: 'TASK',
          title: 'Task B',
          nextStep: null
        },
        {
          reference: 'task-c',
          type: 'TASK',
          title: 'Task C',
          nextStep: null
        }
      ],
      summaryFieldsCount: 2
    })

    expect(definition.nodes.map(node => node.type)).toEqual(['start', 'task', 'decision', 'task', 'task', 'end'])
    expect(definition.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'start', target: 'step-0' }),
        expect.objectContaining({ source: 'step-0', target: 'step-1' }),
        expect.objectContaining({ source: 'step-1', target: 'step-2', label: 'Approve' }),
        expect.objectContaining({ source: 'step-1', target: 'step-3', label: 'Reject' }),
        expect.objectContaining({ source: 'step-2', target: 'end' }),
        expect.objectContaining({ source: 'step-3', target: 'end' })
      ])
    )
  })

  it('renders FORK and JOIN steps with reference-based branch targets', () => {
    const definition = templateToFlowGraphDefinition({
      steps: [
        {
          reference: 'fork-1',
          type: 'FORK',
          title: 'Parallel Split',
          parallelBranches: [
            { id: 'branch-a', label: 'Branch A', steps: ['task-a'] },
            { id: 'branch-b', label: 'Branch B', steps: ['task-b'] }
          ]
        },
        {
          reference: 'task-a',
          type: 'TASK',
          title: 'Task A',
          nextStep: 3
        },
        {
          reference: 'task-b',
          type: 'FUNCTION',
          title: 'Task B',
          nextStep: 3
        },
        {
          reference: 'join-1',
          type: 'JOIN',
          title: 'Parallel Merge',
          joinCondition: 'ALL',
          forkReference: 'fork-1',
          nextStep: null
        }
      ]
    })

    expect(definition.nodes.map(node => node.type)).toEqual(['fork', 'task', 'task', 'join', 'end'])
    expect(definition.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'step-0', target: 'step-1', label: 'Branch A' }),
        expect.objectContaining({ source: 'step-0', target: 'step-2', label: 'Branch B' }),
        expect.objectContaining({ source: 'step-1', target: 'step-3' }),
        expect.objectContaining({ source: 'step-2', target: 'step-3' }),
        expect.objectContaining({ source: 'step-3', target: 'end' })
      ])
    )

    expect(definition.nodes.find(node => node.id === 'step-2')?.metadata?.isSystem).toBe(true)
  })
})
