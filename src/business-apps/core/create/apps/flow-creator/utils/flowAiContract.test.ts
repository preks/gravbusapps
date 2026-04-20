import { validateAiTemplateContract } from './aiTemplateValidator'
import { buildStepIndexByNodeId, orderNodesForTemplate } from './studioStepOrder'
import { END_ID, START_ID } from './graphStoreUtils'

describe('flow AI contract parity', () => {
  it('rejects non-canonical AI templates before canvas apply', () => {
    const invalidTemplate = {
      name: 'Invalid AI Flow',
      version: 1.5,
      steps: [
        {
          id: 'legacy_step_0',
          type: 'GATEWAY',
          title: 'Legacy Step',
          form: [{ type: 'RADIO', name: 7, label: 'Choice' }]
        }
      ]
    }

    const result = validateAiTemplateContract(invalidTemplate)

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'version must be an integer number',
        'steps[0].reference must be a non-empty string',
        `steps[0].type must be one of TASK, APPROVAL, INFORMATION, ACKNOWLEDGE, DECISION, FORK, JOIN, FUNCTION, AI_AGENT, AI_TASK_EXPERT, CUSTOM_DATA_MUTATION`,
        `steps[0].form.0.type must be one of NUMBER, TEXT, TEXTAREA, SELECT, MULTISELECT, CHECKBOX, DATE, DATETIME, FILE`,
        'steps[0].form.0.name must be a string'
      ])
    )
  })

  it('uses canonical topological step ordering for fork/join graphs', () => {
    const nodes = [
      { id: START_ID, type: 'start', label: 'Start', config: { nodeType: 'start', triggerType: 'MANUAL_FORM' } },
      {
        id: 'task_0',
        type: 'task',
        label: 'Task 0',
        config: {
          nodeType: 'task',
          stepType: 'TASK',
          kind: 'USER',
          title: 'Task 0',
          assignment: { assignmentMode: 'ASSIGN_SINGLE', targets: { users: ['user-1'] } }
        }
      },
      { id: 'fork_1', type: 'fork', label: 'Fork', config: { nodeType: 'fork', branches: [] } },
      {
        id: 'join_1',
        type: 'join',
        label: 'Join',
        config: { nodeType: 'join', joinCondition: 'ALL', forkReference: 'fork_1' }
      },
      {
        id: 'branch_a',
        type: 'task',
        label: 'Branch A',
        config: {
          nodeType: 'task',
          stepType: 'TASK',
          kind: 'USER',
          title: 'Branch A',
          assignment: { assignmentMode: 'ASSIGN_SINGLE', targets: { users: ['user-1'] } }
        }
      },
      {
        id: 'branch_b',
        type: 'task',
        label: 'Branch B',
        config: {
          nodeType: 'task',
          stepType: 'TASK',
          kind: 'USER',
          title: 'Branch B',
          assignment: { assignmentMode: 'ASSIGN_SINGLE', targets: { users: ['user-1'] } }
        }
      },
      { id: END_ID, type: 'end', label: 'End', config: { nodeType: 'end' } }
    ] as any

    const edges = [
      { id: 'e_start_task', source: START_ID, target: 'task_0', direction: 'forward' },
      { id: 'e_task_fork', source: 'task_0', target: 'fork_1', direction: 'forward' },
      { id: 'e_fork_a', source: 'fork_1', target: 'branch_a', direction: 'forward', label: 'A' },
      { id: 'e_fork_b', source: 'fork_1', target: 'branch_b', direction: 'forward', label: 'B' },
      { id: 'e_a_join', source: 'branch_a', target: 'join_1', direction: 'forward' },
      { id: 'e_b_join', source: 'branch_b', target: 'join_1', direction: 'forward' },
      { id: 'e_join_end', source: 'join_1', target: END_ID, direction: 'forward' }
    ] as any

    const orderedIds = orderNodesForTemplate(nodes, edges).map(node => node.id)
    const stepIndexByNodeId = buildStepIndexByNodeId(nodes, edges)

    expect(orderedIds.indexOf('fork_1')).toBeLessThan(orderedIds.indexOf('branch_a'))
    expect(orderedIds.indexOf('fork_1')).toBeLessThan(orderedIds.indexOf('branch_b'))
    expect(orderedIds.indexOf('branch_a')).toBeLessThan(orderedIds.indexOf('join_1'))
    expect(orderedIds.indexOf('branch_b')).toBeLessThan(orderedIds.indexOf('join_1'))
    expect(stepIndexByNodeId.get('fork_1')).toBeLessThan(stepIndexByNodeId.get('branch_a') ?? Infinity)
    expect(stepIndexByNodeId.get('branch_a')).toBeLessThan(stepIndexByNodeId.get('join_1') ?? -1)
  })
})
