import type { StudioNode } from '../types/studioTypes'
import { collapseOutgoingEdgesForTaskNode, createEdge, createNode } from './graphStoreUtils'

describe('collapseOutgoingEdgesForTaskNode', () => {
  it('collapses decision branches to a single forward edge', () => {
    const decision = createNode('decision')
    const taskTarget = createNode('task')
    const rejectTarget = createNode('task')
    const end = createNode('end')
    const approveEdge = createEdge(decision.id, taskTarget.id, 'Approve')
    const rejectEdge = createEdge(decision.id, rejectTarget.id, 'Reject')
    const backwardEdge = createEdge(decision.id, taskTarget.id, 'Rework', 'backward')

    const nextEdges = collapseOutgoingEdgesForTaskNode(decision, [approveEdge, rejectEdge, backwardEdge], end.id)

    const outgoing = nextEdges.filter(edge => edge.source === decision.id)
    expect(outgoing).toHaveLength(1)
    expect(outgoing[0]?.direction).toBe('forward')
    expect(outgoing[0]?.target).toBe(taskTarget.id)
    expect(outgoing[0]?.label).toBeUndefined()
  })

  it('keeps a single outgoing edge on task nodes unchanged', () => {
    const task = createNode('task')
    const next = createNode('task')
    const edge = createEdge(task.id, next.id)

    const result = collapseOutgoingEdgesForTaskNode(task, [edge], 'end_node')
    expect(result).toEqual([edge])
  })

  it('prefers the default branch when configured', () => {
    const decision = createNode('decision')
    const approveTarget = createNode('task')
    const rejectTarget = createNode('task')
    const approveEdge = createEdge(decision.id, approveTarget.id, 'Approve')
    const rejectEdge = createEdge(decision.id, rejectTarget.id, 'Reject')
    const decisionWithDefault: StudioNode = {
      ...decision,
      config: {
        ...decision.config,
        defaultBranch: rejectEdge.id
      } as StudioNode['config']
    }

    const nextEdges = collapseOutgoingEdgesForTaskNode(decisionWithDefault, [approveEdge, rejectEdge], 'end_node')
    const outgoing = nextEdges.filter(edge => edge.source === decision.id)

    expect(outgoing).toHaveLength(1)
    expect(outgoing[0]?.target).toBe(rejectTarget.id)
  })
})
