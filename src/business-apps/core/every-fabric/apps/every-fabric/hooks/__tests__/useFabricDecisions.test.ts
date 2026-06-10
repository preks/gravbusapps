import { renderHook } from '@testing-library/react'
import type { AgentStreamEvent } from '../../types/enterpriseAgent'
import { useFabricDecisions } from '../useFabricDecisions'

describe('useFabricDecisions', () => {
  it('drops runtime_scope decisions from the user-facing decision list', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'decision',
        seq: 1,
        event_id: 'runtime-1',
        timestamp: '2026-06-08T17:09:46.000Z',
        category: 'runtime_scope',
        title: 'Runtime owner resolved',
        chosen: 'router',
        rationale: 'owner=router runtime_type=direct_agent reason=no_skill_router'
      } as AgentStreamEvent,
      {
        type: 'decision',
        seq: 2,
        event_id: 'reflection-1',
        timestamp: '2026-06-08T17:09:50.000Z',
        category: 'reflection',
        title: 'Reflection: finalize',
        chosen: 'return',
        rationale: 'Output quality confirmed'
      }
    ]

    const { result } = renderHook(() => useFabricDecisions(events))

    expect(result.current).toHaveLength(1)
    expect(result.current[0]?.id).toBe('reflection-1')
  })
})
