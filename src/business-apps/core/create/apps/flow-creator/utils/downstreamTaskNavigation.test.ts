import {
  getNearestDownstreamTaskCandidates,
  getNearestDownstreamTaskId,
  getNearestUpstreamTaskCandidates,
  getNearestUpstreamTaskId
} from './downstreamTaskNavigation'

type NavigationNodes = Parameters<typeof getNearestDownstreamTaskId>[0]
type NavigationEdges = Parameters<typeof getNearestDownstreamTaskId>[1]

function task(id: string, enabled: boolean = true): NavigationNodes[number] {
  return {
    id,
    label: id,
    type: 'task',
    config: { nodeType: 'task', enabled, title: id }
  }
}

function node(id: string, type: NavigationNodes[number]['type']): NavigationNodes[number] {
  return {
    id,
    type,
    config: { nodeType: type }
  }
}

function edge(
  source: string,
  target: string,
  direction: NavigationEdges[number]['direction'] = 'forward',
  label?: string
): NavigationEdges[number] {
  return {
    id: `${source}-${target}-${direction}`,
    source,
    target,
    direction,
    ...(label ? { label } : {})
  }
}

describe('task navigation', () => {
  const nodes: NavigationNodes = [
    task('previous'),
    node('decision-before', 'decision'),
    task('current'),
    node('fork-after', 'fork'),
    task('disabled-next', false),
    task('next'),
    task('rework-source')
  ]

  const edges: NavigationEdges = [
    edge('previous', 'decision-before'),
    edge('decision-before', 'current'),
    edge('current', 'fork-after'),
    edge('fork-after', 'disabled-next'),
    edge('disabled-next', 'next'),
    edge('rework-source', 'current', 'backward')
  ]

  it('finds the nearest downstream active task through control nodes', () => {
    expect(getNearestDownstreamTaskId(nodes, edges, 'current')).toBe('next')
  })

  it('finds the nearest upstream active task through control nodes', () => {
    expect(getNearestUpstreamTaskId(nodes, edges, 'current')).toBe('previous')
  })

  it('ignores backward edges for task navigation', () => {
    expect(getNearestUpstreamTaskId(nodes, edges, 'current')).not.toBe('rework-source')
  })

  it('returns multiple downstream branch candidates with branch labels', () => {
    const branchNodes: NavigationNodes = [
      task('current'),
      node('decision', 'decision'),
      task('approve-task'),
      task('disabled-reject', false),
      task('reject-task')
    ]
    const branchEdges: NavigationEdges = [
      edge('current', 'decision'),
      edge('decision', 'approve-task', 'forward', 'Approve'),
      edge('decision', 'disabled-reject', 'forward', 'Reject'),
      edge('disabled-reject', 'reject-task')
    ]

    expect(getNearestDownstreamTaskCandidates(branchNodes, branchEdges, 'current')).toEqual([
      { taskId: 'approve-task', label: 'approve-task', pathLabel: 'Approve' },
      { taskId: 'reject-task', label: 'reject-task', pathLabel: 'Reject' }
    ])
  })

  it('returns multiple upstream branch candidates with branch labels', () => {
    const branchNodes: NavigationNodes = [
      task('approve-task'),
      task('reject-task'),
      node('join', 'join'),
      task('current')
    ]
    const branchEdges: NavigationEdges = [
      edge('approve-task', 'join', 'forward', 'Approve'),
      edge('reject-task', 'join', 'forward', 'Reject'),
      edge('join', 'current')
    ]

    expect(getNearestUpstreamTaskCandidates(branchNodes, branchEdges, 'current')).toEqual([
      { taskId: 'approve-task', label: 'approve-task', pathLabel: 'Approve' },
      { taskId: 'reject-task', label: 'reject-task', pathLabel: 'Reject' }
    ])
  })

  it('keeps unique branch routes direct when only one branch reaches a task', () => {
    const branchNodes: NavigationNodes = [
      task('current'),
      node('decision', 'decision'),
      task('next'),
      node('end', 'end')
    ]
    const branchEdges: NavigationEdges = [
      edge('current', 'decision'),
      edge('decision', 'next', 'forward', 'Continue'),
      edge('decision', 'end', 'forward', 'Done')
    ]

    expect(getNearestDownstreamTaskCandidates(branchNodes, branchEdges, 'current')).toEqual([
      { taskId: 'next', label: 'next', pathLabel: 'Continue' }
    ])
    expect(getNearestDownstreamTaskId(branchNodes, branchEdges, 'current')).toBe('next')
  })
})
