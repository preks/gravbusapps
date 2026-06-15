import type { FlowGraphDefinition } from '../flow-viewer/types/viewerTypes'
import { enrichExecutionStateWithCompletedPath } from '../flowPathEnrichment'

const BRANCHED_DEFINITION: FlowGraphDefinition = {
  nodes: [
    { id: 'start', type: 'start', label: 'Start' },
    { id: 'step-0', type: 'task', label: 'Fetch' },
    { id: 'step-1', type: 'task', label: 'Score' },
    { id: 'step-2', type: 'decision', label: 'Risk-Based Logic' },
    { id: 'step-3', type: 'task', label: 'Build Patch LOW' },
    { id: 'step-4', type: 'task', label: 'Skipped branch' },
    { id: 'end', type: 'end', label: 'End' }
  ],
  edges: [
    { id: 'e-start', source: 'start', target: 'step-0', direction: 'forward' },
    { id: 'e-0-1', source: 'step-0', target: 'step-1', direction: 'forward' },
    { id: 'e-1-2', source: 'step-1', target: 'step-2', direction: 'forward' },
    { id: 'e-2-3', source: 'step-2', target: 'step-3', direction: 'forward' },
    { id: 'e-2-4', source: 'step-2', target: 'step-4', direction: 'forward' },
    { id: 'e-3-end', source: 'step-3', target: 'end', direction: 'forward' }
  ]
}

describe('enrichExecutionStateWithCompletedPath', () => {
  it('includes decision nodes and their edges even without execution status', () => {
    const result = enrichExecutionStateWithCompletedPath(BRANCHED_DEFINITION, {
      nodeStates: {
        start: 'completed',
        'step-0': 'completed',
        'step-1': 'completed',
        'step-3': 'completed',
        end: 'completed'
      }
    })

    expect(result.pathNodeIds).toEqual(expect.arrayContaining(['start', 'step-0', 'step-1', 'step-2', 'step-3', 'end']))
    expect(result.pathNodeIds).not.toContain('step-4')
    expect(result.pathEdgeIds).toEqual(expect.arrayContaining(['e-1-2', 'e-2-3']))
    expect(result.pathEdgeIds).not.toContain('e-2-4')
  })
})
